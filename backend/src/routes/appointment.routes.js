'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const appointmentController = require('../controllers/appointment.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/auditLog');

router.use(authenticate);

router.get('/',
    authorize('ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT'),
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
        query('doctorId').optional().isUUID(),
        query('patientId').optional().isUUID(),
        query('date').optional().isISO8601(),
        query('dateFrom').optional().isISO8601(),
        query('dateTo').optional().isISO8601(),
    ],
    validate,
    appointmentController.listAppointments
);

router.get('/available-slots',
    authorize('ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT'),
    [
        query('doctorId').isUUID().withMessage('Doctor ID required'),
        query('date').isISO8601().withMessage('Date required'),
    ],
    validate,
    appointmentController.getAvailableSlots
);

router.get('/:id',
    [param('id').isUUID()],
    validate,
    appointmentController.getAppointment
);

router.post('/',
    authorize('ADMIN', 'RECEPTIONIST', 'PATIENT'),
    [
        body('patientId').isUUID().withMessage('Patient ID required'),
        body('doctorId').isUUID().withMessage('Doctor ID required'),
        body('appointmentDate').isISO8601().withMessage('Valid appointment date required'),
        body('appointmentTime').matches(/^\d{2}:\d{2}$/).withMessage('Time in HH:MM format required'),
        body('type').optional().isIn(['CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'LAB_REVIEW']),
        body('chiefComplaint').optional().isString().trim().isLength({ max: 500 }),
        body('notes').optional().isString().trim(),
    ],
    validate,
    auditLog('APPOINTMENT_CREATE', 'appointments'),
    appointmentController.createAppointment
);

router.put('/:id/status',
    authorize('ADMIN', 'DOCTOR', 'RECEPTIONIST'),
    [
        param('id').isUUID(),
        body('status').isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
        body('cancellationReason').optional().isString().trim(),
    ],
    validate,
    auditLog('APPOINTMENT_STATUS_UPDATE', 'appointments'),
    appointmentController.updateStatus
);

router.put('/:id',
    authorize('ADMIN', 'RECEPTIONIST'),
    [param('id').isUUID()],
    validate,
    auditLog('APPOINTMENT_UPDATE', 'appointments'),
    appointmentController.updateAppointment
);

router.delete('/:id',
    authorize('ADMIN', 'RECEPTIONIST'),
    [param('id').isUUID()],
    validate,
    auditLog('APPOINTMENT_DELETE', 'appointments'),
    appointmentController.deleteAppointment
);

module.exports = router;
