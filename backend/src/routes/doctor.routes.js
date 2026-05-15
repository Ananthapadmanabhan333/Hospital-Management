'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/auditLog');
const db = require('../database/connection');
const AppError = require('../utils/AppError');

router.use(authenticate);

// GET /doctors - list all doctors
router.get('/', [
    query('specialization').optional().isString(),
    query('department').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        let where = 'WHERE d.deleted_at IS NULL AND u.is_active = true';
        const params = [];
        let i = 1;

        if (req.query.specialization) { where += ` AND d.specialization ILIKE $${i++}`; params.push(`%${req.query.specialization}%`); }
        if (req.query.department) { where += ` AND d.department ILIKE $${i++}`; params.push(`%${req.query.department}%`); }

        const [count, data] = await Promise.all([
            db.query(`SELECT COUNT(*) FROM doctors d JOIN users u ON u.id = d.user_id ${where}`, params),
            db.query(
                `SELECT d.id, d.registration_number, d.specialization, d.department, d.qualification,
                d.experience_years, d.consultation_fee, d.is_available, d.bio,
                u.first_name, u.last_name, u.email, u.phone, u.avatar_url
         FROM doctors d JOIN users u ON u.id = d.user_id
         ${where}
         ORDER BY u.first_name ASC
         LIMIT $${i} OFFSET $${i + 1}`,
                [...params, limit, offset]
            ),
        ]);

        const total = parseInt(count.rows[0].count);
        res.json({ status: 'success', data: data.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) { next(err); }
});

// GET /doctors/:id
router.get('/:id', [param('id').isUUID()], validate, async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT d.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url
       FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.id = $1 AND d.deleted_at IS NULL`,
            [req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Doctor not found');
        res.json({ status: 'success', data: rows[0] });
    } catch (err) { next(err); }
});

// POST /doctors - create doctor (Admin only)
router.post('/',
    authorize('ADMIN'),
    [
        body('userId').isUUID(),
        body('registrationNumber').notEmpty().trim(),
        body('specialization').notEmpty().trim(),
        body('department').optional().trim(),
        body('qualification').optional().trim(),
        body('experienceYears').optional().isInt({ min: 0 }),
        body('consultationFee').optional().isFloat({ min: 0 }),
        body('slotDurationMin').optional().isInt({ min: 15 }),
        body('maxPatientsPerDay').optional().isInt({ min: 1 }),
    ],
    validate,
    auditLog('DOCTOR_CREATE', 'doctors'),
    async (req, res, next) => {
        try {
            const { userId, registrationNumber, specialization, department, qualification, experienceYears, consultationFee, slotDurationMin, maxPatientsPerDay, bio } = req.body;
            const { rows } = await db.query(
                `INSERT INTO doctors (user_id, registration_number, specialization, department, qualification, experience_years, consultation_fee, slot_duration_min, max_patients_per_day, bio)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
                [userId, registrationNumber, specialization, department || null, qualification || null, experienceYears || 0, consultationFee || 0, slotDurationMin || 30, maxPatientsPerDay || 20, bio || null]
            );
            res.status(201).json({ status: 'success', data: rows[0] });
        } catch (err) { next(err); }
    }
);

module.exports = router;
