'use strict';

const db = require('../database/connection');
const AppError = require('../utils/AppError');

const listTests = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        let where = 'WHERE lt.deleted_at IS NULL';
        const params = [];
        let i = 1;

        if (req.user.role === 'DOCTOR') {
            const { rows } = await db.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
            if (!rows[0]) throw AppError.notFound();
            where += ` AND lt.doctor_id = $${i++}`; params.push(rows[0].id);
        } else if (req.user.role === 'PATIENT') {
            const { rows } = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
            if (!rows[0]) throw AppError.notFound();
            where += ` AND lt.patient_id = $${i++}`; params.push(rows[0].id);
        } else if (req.user.role === 'LAB_ASSISTANT') {
            where += ` AND lt.status != 'CANCELLED'`;
        }

        if (req.query.patientId && !['DOCTOR', 'PATIENT'].includes(req.user.role)) {
            where += ` AND lt.patient_id = $${i++}`; params.push(req.query.patientId);
        }
        if (req.query.status) { where += ` AND lt.status = $${i++}`; params.push(req.query.status); }

        const [count, data] = await Promise.all([
            db.query(`SELECT COUNT(*) FROM lab_tests lt ${where}`, params),
            db.query(
                `SELECT lt.id, lt.test_name, lt.test_code, lt.category, lt.status, lt.priority,
                lt.ordered_date, lt.result_date, lt.doctor_reviewed, lt.cost, lt.result_summary,
                pat.uhid, pat.first_name || ' ' || pat.last_name as patient_name,
                u.first_name || ' ' || u.last_name as doctor_name
         FROM lab_tests lt
         JOIN patients pat ON pat.id = lt.patient_id
         JOIN doctors d ON d.id = lt.doctor_id
         JOIN users u ON u.id = d.user_id
         ${where}
         ORDER BY lt.ordered_date DESC
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

const getTest = async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT lt.*, pat.uhid, pat.first_name || ' ' || pat.last_name as patient_name,
              u.first_name || ' ' || u.last_name as doctor_name
       FROM lab_tests lt
       JOIN patients pat ON pat.id = lt.patient_id
       JOIN doctors d ON d.id = lt.doctor_id
       JOIN users u ON u.id = d.user_id
       WHERE lt.id = $1 AND lt.deleted_at IS NULL`,
            [req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Lab test not found');
        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const orderTest = async (req, res, next) => {
    try {
        const { patientId, recordId, appointmentId, testName, testCode, category, priority, cost } = req.body;

        const { rows: doc } = await db.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
        if (!doc[0]) throw AppError.notFound('Doctor profile not found');

        const { rows } = await db.query(
            `INSERT INTO lab_tests (patient_id, doctor_id, record_id, appointment_id, test_name, test_code, category, priority, cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [patientId, doc[0].id, recordId || null, appointmentId || null, testName, testCode || null, category || null, priority || 'ROUTINE', cost || 0]
        );

        res.status(201).json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const updates = { status };
        if (status === 'SAMPLE_COLLECTED') updates.sample_collected_at = new Date();

        const { rows } = await db.query(
            `UPDATE lab_tests SET status = $1, sample_collected_at = CASE WHEN $1 = 'SAMPLE_COLLECTED' THEN NOW() ELSE sample_collected_at END,
        lab_assistant_id = $2
       WHERE id = $3 AND deleted_at IS NULL RETURNING *`,
            [status, req.user.id, req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Lab test not found');
        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const uploadResult = async (req, res, next) => {
    try {
        if (!req.file) throw AppError.badRequest('PDF report file is required');

        const reportUrl = `/uploads/lab-reports/${req.file.filename}`;
        const { rows } = await db.query(
            `UPDATE lab_tests SET 
        status = 'COMPLETED', result_date = NOW(),
        report_url = $1, report_filename = $2,
        result_summary = $3,
        lab_assistant_id = $4
       WHERE id = $5 AND deleted_at IS NULL RETURNING *`,
            [reportUrl, req.file.originalname, req.body.resultSummary || null, req.user.id, req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Lab test not found');

        res.json({ status: 'success', data: rows[0], message: 'Lab report uploaded successfully' });
    } catch (err) {
        next(err);
    }
};

const reviewResult = async (req, res, next) => {
    try {
        const { rows: doc } = await db.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
        if (!doc[0]) throw AppError.forbidden();

        const { rows } = await db.query(
            `UPDATE lab_tests SET doctor_reviewed = true, doctor_review_notes = $1, reviewed_at = NOW()
       WHERE id = $2 AND doctor_id = $3 AND deleted_at IS NULL RETURNING *`,
            [req.body.notes || null, req.params.id, doc[0].id]
        );
        if (!rows[0]) throw AppError.notFound('Lab test not found or unauthorized');
        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

module.exports = { listTests, getTest, orderTest, updateStatus, uploadResult, reviewResult };
