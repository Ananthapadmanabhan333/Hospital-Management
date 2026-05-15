'use strict';

const PDFDocument = require('pdfkit');
const db = require('../database/connection');
const AppError = require('../utils/AppError');

const listRecords = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        let where = 'WHERE mr.deleted_at IS NULL';
        const params = [];
        let i = 1;

        if (req.user.role === 'DOCTOR') {
            const { rows } = await db.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
            if (!rows[0]) throw AppError.notFound();
            where += ` AND mr.doctor_id = $${i++}`;
            params.push(rows[0].id);
        } else if (req.user.role === 'PATIENT') {
            const { rows } = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
            if (!rows[0]) throw AppError.notFound();
            where += ` AND mr.patient_id = $${i++} AND mr.is_confidential = false`;
            params.push(rows[0].id);
        }

        if (req.query.patientId && !['DOCTOR', 'PATIENT'].includes(req.user.role)) {
            where += ` AND mr.patient_id = $${i++}`;
            params.push(req.query.patientId);
        }

        const count = await db.query(`SELECT COUNT(*) FROM medical_records mr ${where}`, params);
        const data = await db.query(
            `SELECT mr.id, mr.visit_date, mr.diagnosis, mr.chief_complaint, mr.follow_up_date, mr.is_confidential, mr.created_at,
              pat.uhid, pat.first_name || ' ' || pat.last_name as patient_name,
              u.first_name || ' ' || u.last_name as doctor_name, d.specialization
       FROM medical_records mr
       JOIN patients pat ON pat.id = mr.patient_id
       JOIN doctors d ON d.id = mr.doctor_id
       JOIN users u ON u.id = d.user_id
       ${where}
       ORDER BY mr.visit_date DESC
       LIMIT $${i} OFFSET $${i + 1}`,
            [...params, limit, offset]
        );

        const total = parseInt(count.rows[0].count);
        res.json({ status: 'success', data: data.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
        next(err);
    }
};

const getRecord = async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT mr.*, 
              pat.uhid, pat.first_name || ' ' || pat.last_name as patient_name, pat.date_of_birth, pat.gender, pat.blood_group,
              u.first_name || ' ' || u.last_name as doctor_name, d.specialization, d.qualification
       FROM medical_records mr
       JOIN patients pat ON pat.id = mr.patient_id
       JOIN doctors d ON d.id = mr.doctor_id
       JOIN users u ON u.id = d.user_id
       WHERE mr.id = $1 AND mr.deleted_at IS NULL`,
            [req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Medical record not found');

        if (req.user.role === 'PATIENT' && rows[0].is_confidential) throw AppError.forbidden('This record is confidential');
        if (req.user.role === 'PATIENT') {
            const { rows: pat } = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
            if (!pat[0] || pat[0].id !== rows[0].patient_id) throw AppError.forbidden();
        }

        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const createRecord = async (req, res, next) => {
    try {
        const { patientId, appointmentId, chiefComplaint, historyOfIllness, examinationNotes, diagnosis, icdCodes, treatmentPlan, prescription, followUpDate, isConfidential } = req.body;

        const { rows: doc } = await db.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
        if (!doc[0]) throw AppError.notFound('Doctor profile not found');

        const { rows } = await db.query(
            `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, chief_complaint, history_of_illness, examination_notes, diagnosis, icd_codes, treatment_plan, prescription, follow_up_date, is_confidential, visit_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CURRENT_DATE) RETURNING *`,
            [patientId, doc[0].id, appointmentId || null, chiefComplaint, historyOfIllness, examinationNotes, diagnosis, icdCodes || [], treatmentPlan, JSON.stringify(prescription || []), followUpDate || null, isConfidential || false]
        );

        // Update appointment status to completed
        if (appointmentId) {
            await db.query('UPDATE appointments SET status = $1 WHERE id = $2', ['COMPLETED', appointmentId]);
        }

        res.status(201).json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const updateRecord = async (req, res, next) => {
    try {
        const { diagnosis, treatmentPlan, prescription, followUpDate, examinationNotes, historyOfIllness } = req.body;

        // Only the creating doctor can update
        const { rows: doc } = await db.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
        if (!doc[0]) throw AppError.forbidden();

        const { rows } = await db.query(
            `UPDATE medical_records SET
        diagnosis = COALESCE($1, diagnosis),
        treatment_plan = COALESCE($2, treatment_plan),
        prescription = COALESCE($3::jsonb, prescription),
        follow_up_date = COALESCE($4, follow_up_date),
        examination_notes = COALESCE($5, examination_notes),
        history_of_illness = COALESCE($6, history_of_illness)
       WHERE id = $7 AND doctor_id = $8 AND deleted_at IS NULL RETURNING *`,
            [diagnosis, treatmentPlan, prescription ? JSON.stringify(prescription) : null, followUpDate, examinationNotes, historyOfIllness, req.params.id, doc[0].id]
        );
        if (!rows[0]) throw AppError.notFound('Record not found or unauthorized');
        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const deleteRecord = async (req, res, next) => {
    try {
        const { rows } = await db.query(
            'UPDATE medical_records SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
            [req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Record not found');
        res.json({ status: 'success', message: 'Record deleted' });
    } catch (err) {
        next(err);
    }
};

const generatePrescriptionPdf = async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT mr.*, 
              pat.uhid, pat.first_name || ' ' || pat.last_name as patient_name, 
              pat.date_of_birth, pat.gender, pat.phone as patient_phone,
              u.first_name || ' ' || u.last_name as doctor_name, 
              d.specialization, d.qualification, d.registration_number
       FROM medical_records mr
       JOIN patients pat ON pat.id = mr.patient_id
       JOIN doctors d ON d.id = mr.doctor_id
       JOIN users u ON u.id = d.user_id
       WHERE mr.id = $1 AND mr.deleted_at IS NULL`,
            [req.params.id]
        );

        if (!rows[0]) throw AppError.notFound('Medical record not found');
        const record = rows[0];

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="prescription-${record.id}.pdf"`,
        });
        doc.pipe(res);

        // Header
        doc.rect(0, 0, 612, 120).fill('#1B4F72').fillColor('white');
        doc.fontSize(22).font('Helvetica-Bold').text('🏥 HOSPITAL CLINICAL MANAGEMENT SYSTEM', 50, 30, { align: 'center' });
        doc.fontSize(12).font('Helvetica').text('PRESCRIPTION', 50, 70, { align: 'center' });
        doc.fillColor('black');

        // Doctor info
        doc.fontSize(10).text(`Dr. ${record.doctor_name}`, 50, 140);
        doc.text(`${record.specialization} | ${record.qualification}`);
        doc.text(`Reg. No: ${record.registration_number}`);

        // Patient info box
        doc.rect(50, 200, 512, 70).stroke();
        doc.fontSize(9).text('PATIENT INFORMATION', 60, 208, { underline: true });
        doc.text(`Name: ${record.patient_name}`, 60, 222);
        doc.text(`UHID: ${record.uhid}`, 60, 234);
        doc.text(`DOB: ${record.date_of_birth?.toISOString()?.split('T')[0] || 'N/A'}`, 60, 246);
        doc.text(`Date: ${new Date(record.visit_date).toLocaleDateString()}`, 350, 222);
        doc.text(`Gender: ${record.gender}`, 350, 234);

        // Diagnosis
        doc.fontSize(11).font('Helvetica-Bold').text('Diagnosis:', 50, 290);
        doc.fontSize(10).font('Helvetica').text(record.diagnosis || 'See notes', 50, 308);

        // Prescription
        doc.fontSize(11).font('Helvetica-Bold').text('℞ PRESCRIPTION:', 50, 340);
        const rxItems = Array.isArray(record.prescription) ? record.prescription : JSON.parse(record.prescription || '[]');
        let yPos = 360;
        rxItems.forEach((item, idx) => {
            doc.fontSize(10).font('Helvetica').text(`${idx + 1}. ${item.medicine || item.name || JSON.stringify(item)}`, 60, yPos);
            if (item.dosage) doc.text(`   Dosage: ${item.dosage}`, 60, yPos + 12);
            if (item.duration) doc.text(`   Duration: ${item.duration}`, 60, yPos + 24);
            yPos += 45;
        });

        if (record.treatment_plan) {
            yPos += 10;
            doc.fontSize(11).font('Helvetica-Bold').text('Treatment Plan:', 50, yPos);
            doc.fontSize(10).font('Helvetica').text(record.treatment_plan, 50, yPos + 18);
            yPos += 50;
        }

        if (record.follow_up_date) {
            yPos += 10;
            doc.fontSize(10).text(`Follow-up Date: ${new Date(record.follow_up_date).toLocaleDateString()}`, 50, yPos);
        }

        // Signature
        doc.moveTo(400, 700).lineTo(560, 700).stroke();
        doc.fontSize(9).text('Doctor Signature', 400, 710);
        doc.text(`Dr. ${record.doctor_name}`, 400, 722);

        doc.end();
    } catch (err) {
        next(err);
    }
};

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord, generatePrescriptionPdf };
