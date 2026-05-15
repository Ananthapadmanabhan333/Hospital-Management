'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
    message: { status: 'error', message: 'Too many authentication attempts. Try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 *       429: { description: Too many attempts }
 */
router.post('/login',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').notEmpty().withMessage('Password required'),
    ],
    validate,
    auditLog('AUTH_LOGIN', 'auth'),
    authController.login
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user (revokes refresh token)
 *     security: [{ bearerAuth: [] }]
 */
router.post('/logout', authenticate, auditLog('AUTH_LOGOUT', 'auth'), authController.logout);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 */
router.post('/refresh', authController.refreshToken);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security: [{ bearerAuth: [] }]
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password
 */
router.post('/change-password',
    authenticate,
    [
        body('currentPassword').notEmpty().withMessage('Current password required'),
        body('newPassword')
            .isLength({ min: 8 })
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
            .withMessage('Password must be 8+ chars with uppercase, lowercase, number and special char'),
    ],
    validate,
    auditLog('AUTH_CHANGE_PASSWORD', 'auth'),
    authController.changePassword
);

module.exports = router;
