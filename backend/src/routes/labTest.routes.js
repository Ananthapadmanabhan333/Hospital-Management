'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();

const labTestController = require('../controllers/labTest.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/auditLog');

// PDF upload config
const uploadDir = process.env.UPLOAD_DIR || './uploads/lab-reports';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `lab-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed for lab reports'), false);
        }
    },
});

router.use(authenticate);

router.get('/',
    authorize('ADMIN', 'DOCTOR', 'LAB_ASSISTANT', 'PATIENT'),
    [
        query('patientId').optional().isUUID(),
        query('status').optional().isIn(['ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED']),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    labTestController.listTests
);

router.get('/:id',
    [param('id').isUUID()],
    validate,
    labTestController.getTest
);

router.post('/',
    authorize('DOCTOR'),
    [
        body('patientId').isUUID(),
        body('testName').notEmpty().trim(),
        body('testCode').optional().isString().trim(),
        body('category').optional().isString().trim(),
        body('priority').optional().isIn(['ROUTINE', 'URGENT', 'STAT']),
        body('cost').optional().isFloat({ min: 0 }),
    ],
    validate,
    auditLog('LAB_TEST_ORDER', 'lab_tests'),
    labTestController.orderTest
);

router.patch('/:id/status',
    authorize('LAB_ASSISTANT', 'ADMIN'),
    [
        param('id').isUUID(),
        body('status').isIn(['ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED']),
    ],
    validate,
    auditLog('LAB_TEST_STATUS', 'lab_tests'),
    labTestController.updateStatus
);

router.post('/:id/upload-result',
    authorize('LAB_ASSISTANT', 'ADMIN'),
    [param('id').isUUID()],
    upload.single('report'),
    auditLog('LAB_RESULT_UPLOAD', 'lab_tests'),
    labTestController.uploadResult
);

router.post('/:id/review',
    authorize('DOCTOR'),
    [
        param('id').isUUID(),
        body('notes').optional().isString().trim(),
    ],
    validate,
    auditLog('LAB_RESULT_REVIEW', 'lab_tests'),
    labTestController.reviewResult
);

module.exports = router;
