'use strict';

const PDFDocument = require('pdfkit');
const db = require('../database/connection');
const AppError = require('../utils/AppError');
const { generateInvoiceNumber } = require('../utils/helpers');
const { withTransaction } = require('../database/connection');

const listInvoices = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        let where = 'WHERE b.deleted_at IS NULL';
        const params = [];
        let i = 1;

        if (req.user.role === 'PATIENT') {
            const { rows } = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
            if (!rows[0]) throw AppError.notFound();
            where += ` AND b.patient_id = $${i++}`; params.push(rows[0].id);
        }

        if (req.query.patientId && req.user.role !== 'PATIENT') {
            where += ` AND b.patient_id = $${i++}`; params.push(req.query.patientId);
        }
        if (req.query.paymentStatus) {
            where += ` AND b.payment_status = $${i++}`; params.push(req.query.paymentStatus);
        }

        const [count, data] = await Promise.all([
            db.query(`SELECT COUNT(*) FROM billing b ${where}`, params),
            db.query(
                `SELECT b.id, b.invoice_number, b.total_amount, b.paid_amount, b.balance_due, b.payment_status,
                b.payment_date, b.created_at,
                pat.uhid, pat.first_name || ' ' || pat.last_name as patient_name
         FROM billing b
         JOIN patients pat ON pat.id = b.patient_id
         ${where}
         ORDER BY b.created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
                [...params, limit, offset]
            ),
        ]);

        const total = parseInt(count.rows[0].count);
        res.json({ status: 'success', data: data.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
        next(err);
    }
};

const getInvoice = async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT b.*, pat.uhid, pat.first_name || ' ' || pat.last_name as patient_name, pat.phone as patient_phone, pat.email as patient_email,
              pat.address, pat.city, pat.state
       FROM billing b
       JOIN patients pat ON pat.id = b.patient_id
       WHERE b.id = $1 AND b.deleted_at IS NULL`,
            [req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Invoice not found');

        if (req.user.role === 'PATIENT') {
            const { rows: pat } = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
            if (!pat[0] || pat[0].id !== rows[0].patient_id) throw AppError.forbidden();
        }

        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const createInvoice = async (req, res, next) => {
    try {
        const { patientId, appointmentId, items, taxRate = 0, discountAmount = 0, notes, paymentMethod } = req.body;

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const taxAmount = (subtotal * taxRate) / 100;
        const totalAmount = subtotal + taxAmount - discountAmount;
        const invoiceNumber = await generateInvoiceNumber();

        const { rows } = await withTransaction(async (client) => {
            return client.query(
                `INSERT INTO billing (invoice_number, patient_id, appointment_id, items, subtotal, tax_rate, tax_amount, discount_amount, total_amount, payment_method, notes, generated_by)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
                [invoiceNumber, patientId, appointmentId || null, JSON.stringify(items), subtotal, taxRate, taxAmount, discountAmount, totalAmount, paymentMethod || null, notes || null, req.user.id]
            );
        });

        res.status(201).json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const recordPayment = async (req, res, next) => {
    try {
        const { paidAmount, paymentMethod } = req.body;

        const { rows: current } = await db.query('SELECT * FROM billing WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
        if (!current[0]) throw AppError.notFound('Invoice not found');

        const newPaid = parseFloat(current[0].paid_amount) + parseFloat(paidAmount);
        const status = newPaid >= parseFloat(current[0].total_amount) ? 'PAID' : 'PARTIAL';

        const { rows } = await db.query(
            `UPDATE billing SET paid_amount = $1, payment_status = $2, payment_method = $3, payment_date = NOW()
       WHERE id = $4 RETURNING *`,
            [newPaid, status, paymentMethod, req.params.id]
        );

        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const generateInvoicePdf = async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT b.*, pat.uhid, pat.first_name || ' ' || pat.last_name as patient_name,
              pat.phone as patient_phone, pat.email as patient_email, pat.address, pat.city
       FROM billing b
       JOIN patients pat ON pat.id = b.patient_id
       WHERE b.id = $1 AND b.deleted_at IS NULL`,
            [req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Invoice not found');
        const inv = rows[0];

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${inv.invoice_number}.pdf"`,
        });
        doc.pipe(res);

        // Header
        doc.rect(0, 0, 612, 100).fill('#1B4F72');
        doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('🏥 HOSPITAL CMS', 50, 25, { align: 'center' });
        doc.fontSize(12).text('INVOICE', 50, 55, { align: 'center' });
        doc.fillColor('black');

        // Invoice details
        doc.fontSize(10);
        doc.text(`Invoice No: ${inv.invoice_number}`, 50, 120);
        doc.text(`Date: ${new Date(inv.created_at).toLocaleDateString()}`, 50, 135);
        doc.text(`Status: ${inv.payment_status}`, 50, 150);
        doc.text(`Patient: ${inv.patient_name}`, 320, 120);
        doc.text(`UHID: ${inv.uhid}`, 320, 135);
        doc.text(`Phone: ${inv.patient_phone}`, 320, 150);

        // Items table
        doc.rect(50, 175, 512, 25).fill('#ECF0F1').fillColor('black');
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Description', 60, 183);
        doc.text('Qty', 310, 183);
        doc.text('Unit Price', 360, 183);
        doc.text('Amount', 460, 183);

        const items = Array.isArray(inv.items) ? inv.items : JSON.parse(inv.items || '[]');
        let y = 210;
        doc.font('Helvetica');
        items.forEach((item, i) => {
            if (i % 2 === 0) doc.rect(50, y - 5, 512, 20).fill('#F8F9FA').fillColor('black');
            const amount = (item.quantity * item.unitPrice).toFixed(2);
            doc.text(item.description, 60, y);
            doc.text(item.quantity.toString(), 315, y);
            doc.text(`₹${item.unitPrice.toFixed(2)}`, 360, y);
            doc.text(`₹${amount}`, 465, y);
            y += 22;
        });

        // Totals
        y += 10;
        doc.moveTo(50, y).lineTo(562, y).stroke();
        y += 10;
        doc.text(`Subtotal:`, 380, y); doc.text(`₹${parseFloat(inv.subtotal).toFixed(2)}`, 475, y); y += 16;
        doc.text(`Tax (${inv.tax_rate}%):`, 380, y); doc.text(`₹${parseFloat(inv.tax_amount).toFixed(2)}`, 475, y); y += 16;
        if (parseFloat(inv.discount_amount) > 0) {
            doc.text(`Discount:`, 380, y); doc.text(`-₹${parseFloat(inv.discount_amount).toFixed(2)}`, 475, y); y += 16;
        }
        doc.font('Helvetica-Bold');
        doc.text(`TOTAL:`, 380, y); doc.text(`₹${parseFloat(inv.total_amount).toFixed(2)}`, 475, y); y += 16;
        doc.font('Helvetica');
        doc.text(`Paid:`, 380, y); doc.text(`₹${parseFloat(inv.paid_amount).toFixed(2)}`, 475, y); y += 16;
        doc.font('Helvetica-Bold');
        doc.text(`Balance Due:`, 380, y); doc.text(`₹${parseFloat(inv.balance_due).toFixed(2)}`, 475, y);

        if (inv.notes) {
            doc.font('Helvetica').fontSize(9).text(`Notes: ${inv.notes}`, 50, y + 30);
        }

        doc.end();
    } catch (err) {
        next(err);
    }
};

const exportCsv = async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT b.invoice_number, pat.uhid, pat.first_name || ' ' || pat.last_name as patient_name,
              b.total_amount, b.paid_amount, b.balance_due, b.payment_status, b.payment_method, b.created_at
       FROM billing b JOIN patients pat ON pat.id = b.patient_id
       WHERE b.deleted_at IS NULL ORDER BY b.created_at DESC`
        );

        const header = ['Invoice No', 'UHID', 'Patient', 'Total', 'Paid', 'Balance', 'Status', 'Method', 'Date'];
        const csvRows = rows.map(r => [
            r.invoice_number, r.uhid, r.patient_name,
            r.total_amount, r.paid_amount, r.balance_due,
            r.payment_status, r.payment_method || '',
            new Date(r.created_at).toISOString(),
        ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));

        res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="billing-${Date.now()}.csv"` });
        res.send([header.join(','), ...csvRows].join('\n'));
    } catch (err) {
        next(err);
    }
};

module.exports = { listInvoices, getInvoice, createInvoice, recordPayment, generateInvoicePdf, exportCsv };
