'use strict';

const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const db = require('../database/connection');

router.use(authenticate, authorize('ADMIN', 'RECEPTIONIST'));

/**
 * GET /reports/daily-summary  
 */
router.get('/daily-summary', async (req, res, next) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];

        const [appts, billing, labTests, newPatients] = await Promise.all([
            db.query(`SELECT status, COUNT(*) as count FROM appointments WHERE appointment_date = $1 AND deleted_at IS NULL GROUP BY status`, [date]),
            db.query(`SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(paid_amount),0) as collected, COUNT(*) as invoices FROM billing WHERE DATE(created_at) = $1 AND deleted_at IS NULL`, [date]),
            db.query(`SELECT status, COUNT(*) as count FROM lab_tests WHERE DATE(ordered_date) = $1 AND deleted_at IS NULL GROUP BY status`, [date]),
            db.query(`SELECT COUNT(*) as count FROM patients WHERE DATE(created_at) = $1 AND deleted_at IS NULL`, [date]),
        ]);

        res.json({
            status: 'success',
            data: {
                date,
                appointments: appts.rows,
                billing: billing.rows[0],
                labTests: labTests.rows,
                newPatients: newPatients.rows[0].count,
            },
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
