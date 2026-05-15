'use strict';

const db = require('../database/connection');
const AppError = require('../utils/AppError');

/**
 * GET /appointments
 */
const listAppointments = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const { status, doctorId, patientId, date, dateFrom, dateTo } = req.query;

        let where = 'WHERE a.deleted_at IS NULL';
        const params = [];
        let i = 1;

        // Role-based filtering
        if (req.user.role === 'DOCTOR') {
            const { rows } = await db.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
            if (!rows[0]) throw AppError.notFound('Doctor profile not found');
            where += ` AND a.doctor_id = $${i++}`;
            params.push(rows[0].id);
        } else if (req.user.role === 'PATIENT') {
            const { rows } = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
            if (!rows[0]) throw AppError.notFound('Patient profile not found');
            where += ` AND a.patient_id = $${i++}`;
            params.push(rows[0].id);
        }

        if (status) { where += ` AND a.status = $${i++}`; params.push(status); }
        if (doctorId && req.user.role !== 'DOCTOR') { where += ` AND a.doctor_id = $${i++}`; params.push(doctorId); }
        if (patientId && req.user.role !== 'PATIENT') { where += ` AND a.patient_id = $${i++}`; params.push(patientId); }
        if (date) { where += ` AND a.appointment_date = $${i++}`; params.push(date); }
        if (dateFrom) { where += ` AND a.appointment_date >= $${i++}`; params.push(dateFrom); }
        if (dateTo) { where += ` AND a.appointment_date <= $${i++}`; params.push(dateTo); }

        const countQuery = `SELECT COUNT(*) FROM appointments a ${where}`;
        const dataQuery = `
      SELECT a.id, a.appointment_date, a.appointment_time, a.duration_min, a.status, a.type,
             a.chief_complaint, a.notes, a.created_at,
             pat.uhid, pat.first_name || ' ' || pat.last_name as patient_name, pat.phone as patient_phone,
             u.first_name || ' ' || u.last_name as doctor_name, d.specialization
      FROM appointments a
      JOIN patients pat ON pat.id = a.patient_id
      JOIN doctors d ON d.id = a.doctor_id
      JOIN users u ON u.id = d.user_id
      ${where}
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT $${i} OFFSET $${i + 1}
    `;

        const [count, data] = await Promise.all([
            db.query(countQuery, params),
            db.query(dataQuery, [...params, limit, offset]),
        ]);

        const total = parseInt(count.rows[0].count);
        res.set('X-Total-Count', total);
        res.json({ status: 'success', data: data.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /appointments/available-slots
 */
const getAvailableSlots = async (req, res, next) => {
    try {
        const { doctorId, date } = req.query;

        const { rows: doctor } = await db.query(
            'SELECT slot_duration_min, max_patients_per_day FROM doctors WHERE id = $1 AND deleted_at IS NULL',
            [doctorId]
        );
        if (!doctor[0]) throw AppError.notFound('Doctor not found');

        // Get booked slots
        const { rows: booked } = await db.query(
            'SELECT appointment_time FROM appointments WHERE doctor_id = $1 AND appointment_date = $2 AND status != $3 AND deleted_at IS NULL',
            [doctorId, date, 'CANCELLED']
        );

        const bookedTimes = new Set(booked.map(r => r.appointment_time.substring(0, 5)));
        const slotDuration = doctor[0].slot_duration_min || 30;
        const slots = [];

        // Generate slots from 9:00 to 17:00
        for (let h = 9; h < 17; h++) {
            for (let m = 0; m < 60; m += slotDuration) {
                const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                slots.push({ time, available: !bookedTimes.has(time) });
            }
        }

        res.json({ status: 'success', data: { doctorId, date, slots } });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /appointments/:id
 */
const getAppointment = async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT a.*, 
              pat.uhid, pat.first_name || ' ' || pat.last_name as patient_name, pat.phone as patient_phone,
              u.first_name || ' ' || u.last_name as doctor_name, d.specialization, d.department
       FROM appointments a
       JOIN patients pat ON pat.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users u ON u.id = d.user_id
       WHERE a.id = $1 AND a.deleted_at IS NULL`,
            [req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Appointment not found');

        // Enforce access control
        if (req.user.role === 'PATIENT') {
            const { rows: pat } = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
            if (!pat[0] || pat[0].id !== rows[0].patient_id) throw AppError.forbidden();
        }

        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /appointments
 */
const createAppointment = async (req, res, next) => {
    try {
        const { patientId, doctorId, appointmentDate, appointmentTime, type, chiefComplaint, notes } = req.body;

        // Patients can only book for themselves
        if (req.user.role === 'PATIENT') {
            const { rows } = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
            if (!rows[0] || rows[0].id !== patientId) throw AppError.forbidden('You can only book appointments for yourself');
        }

        // Check slot availability
        const { rows: existing } = await db.query(
            `SELECT id FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3 
       AND status != 'CANCELLED' AND deleted_at IS NULL`,
            [doctorId, appointmentDate, appointmentTime]
        );
        if (existing[0]) throw AppError.conflict('This appointment slot is already booked');

        // Validate doctor and patient exist
        const [{ rows: doc }, { rows: pat }] = await Promise.all([
            db.query('SELECT id, is_available FROM doctors WHERE id = $1 AND deleted_at IS NULL', [doctorId]),
            db.query('SELECT id FROM patients WHERE id = $1 AND deleted_at IS NULL', [patientId]),
        ]);
        if (!doc[0]) throw AppError.notFound('Doctor not found');
        if (!doc[0].is_available) throw AppError.badRequest('Doctor is not available');
        if (!pat[0]) throw AppError.notFound('Patient not found');

        const { rows } = await db.query(
            `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, chief_complaint, notes, booked_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [patientId, doctorId, appointmentDate, appointmentTime, type || 'CONSULTATION', chiefComplaint, notes, req.user.id]
        );

        res.status(201).json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /appointments/:id/status
 */
const updateStatus = async (req, res, next) => {
    try {
        const { status, cancellationReason } = req.body;
        const { rows } = await db.query(
            `UPDATE appointments SET status = $1, cancellation_reason = $2 WHERE id = $3 AND deleted_at IS NULL RETURNING *`,
            [status, cancellationReason || null, req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Appointment not found');
        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /appointments/:id
 */
const updateAppointment = async (req, res, next) => {
    try {
        const { appointmentDate, appointmentTime, chiefComplaint, notes } = req.body;
        const { rows } = await db.query(
            `UPDATE appointments SET 
        appointment_date = COALESCE($1, appointment_date),
        appointment_time = COALESCE($2, appointment_time),
        chief_complaint = COALESCE($3, chief_complaint),
        notes = COALESCE($4, notes)
       WHERE id = $5 AND deleted_at IS NULL RETURNING *`,
            [appointmentDate, appointmentTime, chiefComplaint, notes, req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Appointment not found');
        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /appointments/:id
 */
const deleteAppointment = async (req, res, next) => {
    try {
        const { rows } = await db.query(
            'UPDATE appointments SET deleted_at = NOW(), status = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id',
            ['CANCELLED', req.params.id]
        );
        if (!rows[0]) throw AppError.notFound('Appointment not found');
        res.json({ status: 'success', message: 'Appointment cancelled' });
    } catch (err) {
        next(err);
    }
};

module.exports = { listAppointments, getAvailableSlots, getAppointment, createAppointment, updateStatus, updateAppointment, deleteAppointment };
