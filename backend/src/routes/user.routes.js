'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const bcrypt = require('bcryptjs');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/auditLog');
const db = require('../database/connection');
const AppError = require('../utils/AppError');

router.use(authenticate);

// GET /users - Admin only
router.get('/',
    authorize('ADMIN'),
    [
        query('role').optional().isIn(['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'LAB_ASSISTANT', 'PATIENT']),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('search').optional().isString().trim(),
        query('isActive').optional().isBoolean(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const offset = (page - 1) * limit;

            let where = 'WHERE deleted_at IS NULL';
            const params = [];
            let i = 1;

            if (req.query.role) { where += ` AND role = $${i++}`; params.push(req.query.role); }
            if (req.query.search) { where += ` AND (first_name ILIKE $${i++} OR last_name ILIKE $${i} OR email ILIKE $${i})`; params.push(`%${req.query.search}%`); i++; }
            if (req.query.isActive !== undefined) { where += ` AND is_active = $${i++}`; params.push(req.query.isActive === 'true'); }

            const [count, data] = await Promise.all([
                db.query(`SELECT COUNT(*) FROM users ${where}`, params),
                db.query(
                    `SELECT id, email, role, first_name, last_name, phone, is_active, is_email_verified, last_login_at, created_at
           FROM users ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
                    [...params, limit, offset]
                ),
            ]);

            const total = parseInt(count.rows[0].count);
            res.json({ status: 'success', data: data.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
        } catch (err) { next(err); }
    }
);

// POST /users - Admin creates new user
router.post('/',
    authorize('ADMIN'),
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
        body('role').isIn(['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'LAB_ASSISTANT', 'PATIENT']),
        body('firstName').notEmpty().trim(),
        body('lastName').notEmpty().trim(),
        body('phone').optional().isString(),
    ],
    validate,
    auditLog('USER_CREATE', 'users'),
    async (req, res, next) => {
        try {
            const { email, password, role, firstName, lastName, phone } = req.body;
            const hash = await bcrypt.hash(password, 12);
            const { rows } = await db.query(
                `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id, email, role, first_name, last_name, created_at`,
                [email, hash, role, firstName, lastName, phone || null]
            );
            res.status(201).json({ status: 'success', data: rows[0] });
        } catch (err) { next(err); }
    }
);

// PATCH /users/:id/toggle-active
router.patch('/:id/toggle-active',
    authorize('ADMIN'),
    [param('id').isUUID()],
    validate,
    auditLog('USER_TOGGLE_ACTIVE', 'users'),
    async (req, res, next) => {
        try {
            const { rows } = await db.query(
                'UPDATE users SET is_active = NOT is_active WHERE id = $1 AND deleted_at IS NULL RETURNING id, email, is_active',
                [req.params.id]
            );
            if (!rows[0]) throw AppError.notFound('User not found');
            res.json({ status: 'success', data: rows[0] });
        } catch (err) { next(err); }
    }
);

module.exports = router;
