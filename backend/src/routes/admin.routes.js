'use strict';

const express = require('express');
const { query } = require('express-validator');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const db = require('../database/connection');
const AppError = require('../utils/AppError');

router.use(authenticate, authorize('ADMIN'));

/**
 * GET /admin/analytics/overview
 */
router.get('/analytics/overview', async (req, res, next) => {
    try {
        const [patients, appointments, billing, labTests, users] = await Promise.all([
            db.query('SELECT COUNT(*) as total, SUM(CASE WHEN created_at > NOW() - INTERVAL \'30 days\' THEN 1 ELSE 0 END) as new_this_month FROM patients WHERE deleted_at IS NULL'),
            db.query(`SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN appointment_date = CURRENT_DATE THEN 1 ELSE 0 END) as today
        FROM appointments WHERE deleted_at IS NULL`),
            db.query(`SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(paid_amount), 0) as collected,
        COALESCE(SUM(balance_due), 0) as pending,
        COUNT(*) as total_invoices
        FROM billing WHERE deleted_at IS NULL AND payment_status != 'CANCELLED'`),
            db.query(`SELECT COUNT(*) as total, 
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'ORDERED' THEN 1 ELSE 0 END) as pending
        FROM lab_tests WHERE deleted_at IS NULL`),
            db.query(`SELECT role, COUNT(*) as count FROM users WHERE is_active = true AND deleted_at IS NULL GROUP BY role`),
        ]);

        res.json({
            status: 'success',
            data: {
                patients: patients.rows[0],
                appointments: appointments.rows[0],
                billing: billing.rows[0],
                labTests: labTests.rows[0],
                usersByRole: users.rows,
            },
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /admin/analytics/revenue-trend
 */
router.get('/analytics/revenue-trend', async (req, res, next) => {
    try {
        const { rows } = await db.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(paid_amount), 0) as collected,
        COUNT(*) as invoices
      FROM billing 
      WHERE created_at > NOW() - INTERVAL '12 months' AND deleted_at IS NULL
      GROUP BY month ORDER BY month
    `);
        res.json({ status: 'success', data: rows });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /admin/analytics/appointments-trend  
 */
router.get('/analytics/appointments-trend', async (req, res, next) => {
    try {
        const { rows } = await db.query(`
      SELECT 
        appointment_date as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
      FROM appointments 
      WHERE appointment_date > CURRENT_DATE - 30 AND deleted_at IS NULL
      GROUP BY appointment_date ORDER BY appointment_date
    `);
        res.json({ status: 'success', data: rows });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /admin/analytics/top-doctors
 */
router.get('/analytics/top-doctors', async (req, res, next) => {
    try {
        const { rows } = await db.query(`
      SELECT u.first_name || ' ' || u.last_name as doctor_name, d.specialization,
             COUNT(a.id) as total_appointments,
             SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
      FROM doctors d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN appointments a ON a.doctor_id = d.id AND a.deleted_at IS NULL
      WHERE d.deleted_at IS NULL
      GROUP BY u.first_name, u.last_name, d.specialization
      ORDER BY total_appointments DESC
      LIMIT 10
    `);
        res.json({ status: 'success', data: rows });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
