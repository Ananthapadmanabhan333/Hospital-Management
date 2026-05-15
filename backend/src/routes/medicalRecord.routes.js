'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const medicalRecordController = require('../controllers/medicalRecord.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/auditLog');

router.use(authenticate);

router.get('/',
    authorize('ADMIN', 'DOCTOR', 'PATIENT'),
    [
        query('patientId').optional().isUUID(),
        query('doctorId').optional().isUUID(),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    medicalRecordController.listRecords
);

router.get('/:id',
    [param('id').isUUID()],
    validate,
    medicalRecordController.getRecord
);

router.post('/',
    authorize('DOCTOR'),
    [
        body('patientId').isUUID(),
        body('appointmentId').optional().isUUID(),
        body('chiefComplaint').optional().isString().trim(),
        body('diagnosis').notEmpty().withMessage('Diagnosis required'),
        body('treatmentPlan').optional().isString().trim(),
        body('prescription').optional().isArray(),
        body('followUpDate').optional().isISO8601(),
        body('isConfidential').optional().isBoolean(),
    ],
    validate,
    auditLog('MEDICAL_RECORD_CREATE', 'medical_records'),
    medicalRecordController.createRecord
);

router.put('/:id',
    authorize('DOCTOR'),
    [
        param('id').isUUID(),
        body('diagnosis').optional().isString(),
        body('treatmentPlan').optional().isString(),
        body('prescription').optional().isArray(),
        body('followUpDate').optional().isISO8601(),
    ],
    validate,
    auditLog('MEDICAL_RECORD_UPDATE', 'medical_records'),
    medicalRecordController.updateRecord
);

router.delete('/:id',
    authorize('ADMIN'),
    [param('id').isUUID()],
    validate,
    auditLog('MEDICAL_RECORD_DELETE', 'medical_records'),
    medicalRecordController.deleteRecord
);

// Prescription PDF
router.get('/:id/prescription/pdf',
    [param('id').isUUID()],
    validate,
    auditLog('PRESCRIPTION_DOWNLOAD', 'medical_records'),
    medicalRecordController.generatePrescriptionPdf
);

module.exports = router;
