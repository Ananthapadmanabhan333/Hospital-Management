'use strict';

const jwt = require('jsonwebtoken');
const db = require('../database/connection');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Verify JWT access token from Authorization header or cookie
 */
const authenticate = async (req, res, next) => {
    try {
        let token = null;

        // 1. Try cookie first (preferred for web)
        if (req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }
        // 2. Fall back to Authorization header (for API clients)
        else if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new AppError('Authentication required', 401);
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Fetch user from DB (validate still exists and is active)
        const { rows } = await db.query(
            'SELECT id, email, role, is_active, password_changed_at FROM users WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
            [decoded.userId]
        );

        if (!rows[0]) {
            throw new AppError('User account not found or deactivated', 401);
        }

        const user = rows[0];

        // Check password change after token issue
        if (user.password_changed_at) {
            const changedAt = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
            if (decoded.iat < changedAt) {
                throw new AppError('Password was changed. Please log in again.', 401);
            }
        }

        req.user = { id: user.id, email: user.email, role: user.role };
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Role-based access control
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Authentication required', 401));
        }
        if (!roles.includes(req.user.role)) {
            logger.warn(`Unauthorized access attempt: user ${req.user.id} (${req.user.role}) → ${roles.join(',')}`);
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

/**
 * Optionally authenticate (does not fail if no token)
 */
const optionalAuth = async (req, res, next) => {
    try {
        await authenticate(req, res, next);
    } catch {
        next();
    }
};

module.exports = { authenticate, authorize, optionalAuth };
