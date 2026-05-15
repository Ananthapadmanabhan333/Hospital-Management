'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const billingController = require('../controllers/billing.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/auditLog');

router.use(authenticate);

router.get('/',
    authorize('ADMIN', 'RECEPTIONIST', 'PATIENT'),
    [
        query('patientId').optional().isUUID(),
        query('paymentStatus').optional().isIn(['PENDING', 'PARTIAL', 'PAID', 'CANCELLED', 'REFUNDED']),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    billingController.listInvoices
);

router.get('/:id',
    [param('id').isUUID()],
    validate,
    billingController.getInvoice
);

router.post('/',
    authorize('ADMIN', 'RECEPTIONIST'),
    [
        body('patientId').isUUID(),
        body('appointmentId').optional().isUUID(),
        body('items').isArray({ min: 1 }).withMessage('At least one billing item required'),
        body('items.*.description').notEmpty().trim(),
        body('items.*.quantity').isInt({ min: 1 }),
        body('items.*.unitPrice').isFloat({ min: 0 }),
        body('taxRate').optional().isFloat({ min: 0, max: 100 }),
        body('discountAmount').optional().isFloat({ min: 0 }),
        body('notes').optional().isString().trim(),
    ],
    validate,
    auditLog('BILLING_CREATE', 'billing'),
    billingController.createInvoice
);

router.patch('/:id/payment',
    authorize('ADMIN', 'RECEPTIONIST'),
    [
        param('id').isUUID(),
        body('paidAmount').isFloat({ min: 0 }),
        body('paymentMethod').isIn(['CASH', 'CARD', 'UPI', 'INSURANCE', 'BANK_TRANSFER']),
    ],
    validate,
    auditLog('BILLING_PAYMENT', 'billing'),
    billingController.recordPayment
);

router.get('/:id/pdf',
    [param('id').isUUID()],
    validate,
    auditLog('INVOICE_DOWNLOAD', 'billing'),
    billingController.generateInvoicePdf
);

router.get('/export/csv',
    authorize('ADMIN', 'RECEPTIONIST'),
    billingController.exportCsv
);

module.exports = router;
