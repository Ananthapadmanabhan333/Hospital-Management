'use strict';

const express = require('express');
const { query } = require('express-validator');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const db = require('../database/connection');

router.use(authenticate, authorize('ADMIN'));

/**
 * GET /audit
 */
router.get('/',
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 200 }),
        query('userId').optional().isUUID(),
        query('action').optional().isString(),
        query('resource').optional().isString(),
        query('status').optional().isIn(['SUCCESS', 'FAILURE']),
        query('dateFrom').optional().isISO8601(),
        query('dateTo').optional().isISO8601(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 50, 200);
            const offset = (page - 1) * limit;

            let where = 'WHERE 1=1';
            const params = [];
            let i = 1;

            if (req.query.userId) { where += ` AND al.user_id = $${i++}`; params.push(req.query.userId); }
            if (req.query.action) { where += ` AND al.action ILIKE $${i++}`; params.push(`%${req.query.action}%`); }
            if (req.query.resource) { where += ` AND al.resource = $${i++}`; params.push(req.query.resource); }
            if (req.query.status) { where += ` AND al.status = $${i++}`; params.push(req.query.status); }
            if (req.query.dateFrom) { where += ` AND al.created_at >= $${i++}`; params.push(req.query.dateFrom); }
            if (req.query.dateTo) { where += ` AND al.created_at <= $${i++}`; params.push(req.query.dateTo); }

            const [count, data] = await Promise.all([
                db.query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params),
                db.query(
                    `SELECT al.id, al.action, al.resource, al.resource_id, al.status, al.ip_address, al.created_at,
                  u.email, u.role, u.first_name || ' ' || u.last_name as user_name
           FROM audit_logs al
           LEFT JOIN users u ON u.id = al.user_id
           ${where}
           ORDER BY al.created_at DESC
           LIMIT $${i} OFFSET $${i + 1}`,
                    [...params, limit, offset]
                ),
            ]);

            const total = parseInt(count.rows[0].count);
            res.json({ status: 'success', data: data.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
