'use strict';

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const patientController = require('../controllers/patient.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/auditLog');

const ROLES = { ADMIN: 'ADMIN', DOCTOR: 'DOCTOR', RECEPTIONIST: 'RECEPTIONIST', PATIENT: 'PATIENT' };

/**
 * @swagger
 * tags:
 *   name: Patients
 *   description: Patient management and registration
 */

// All patient routes require auth
router.use(authenticate);

/**
 * @swagger
 * /patients:
 *   get:
 *     tags: [Patients]
 *     summary: List all patients (Admin/Doctor/Receptionist)
 */
router.get('/',
    authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('search').optional().isString().trim(),
        query('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']),
        query('bloodGroup').optional().isString(),
    ],
    validate,
    patientController.listPatients
);

/**
 * @swagger
 * /patients/{id}:
 *   get:
 *     tags: [Patients]
 *     summary: Get patient by ID
 */
router.get('/:id',
    [param('id').isUUID()],
    validate,
    patientController.getPatient
);

/**
 * @swagger
 * /patients:
 *   post:
 *     tags: [Patients]
 *     summary: Register a new patient (Admin/Receptionist)
 */
router.post('/',
    authorize(ROLES.ADMIN, ROLES.RECEPTIONIST),
    [
        body('firstName').trim().notEmpty().isLength({ max: 100 }),
        body('lastName').trim().notEmpty().isLength({ max: 100 }),
        body('dateOfBirth').isISO8601().toDate(),
        body('gender').isIn(['MALE', 'FEMALE', 'OTHER']),
        body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian phone number required'),
        body('email').optional().isEmail().normalizeEmail(),
        body('bloodGroup').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
        body('address').optional().isString().trim(),
        body('city').optional().isString().trim(),
        body('state').optional().isString().trim(),
        body('pincode').optional().matches(/^\d{6}$/),
        body('emergencyContactName').optional().isString().trim(),
        body('emergencyContactPhone').optional().isString(),
        body('allergies').optional().isArray(),
        body('chronicConditions').optional().isArray(),
        body('insuranceProvider').optional().isString().trim(),
        body('insurancePolicyNumber').optional().isString().trim(),
    ],
    validate,
    auditLog('PATIENT_CREATE', 'patients'),
    patientController.createPatient
);

/**
 * @swagger
 * /patients/{id}:
 *   put:
 *     tags: [Patients]
 *     summary: Update patient details
 */
router.put('/:id',
    authorize(ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
    [
        param('id').isUUID(),
        body('phone').optional().matches(/^[6-9]\d{9}$/),
        body('email').optional().isEmail().normalizeEmail(),
        body('address').optional().isString().trim(),
    ],
    validate,
    auditLog('PATIENT_UPDATE', 'patients'),
    patientController.updatePatient
);

/**
 * @swagger
 * /patients/{id}:
 *   delete:
 *     tags: [Patients]
 *     summary: Soft-delete patient (Admin only)
 */
router.delete('/:id',
    authorize(ROLES.ADMIN),
    [param('id').isUUID()],
    validate,
    auditLog('PATIENT_DELETE', 'patients'),
    patientController.deletePatient
);

/**
 * @swagger
 * /patients/export/csv:
 *   get:
 *     tags: [Patients]
 *     summary: Export patients list as CSV (Admin/Receptionist)
 */
router.get('/export/csv',
    authorize(ROLES.ADMIN, ROLES.RECEPTIONIST),
    auditLog('PATIENT_EXPORT', 'patients'),
    patientController.exportCsv
);

module.exports = router;
