'use strict';

const logger = require('../utils/logger');

/**
 * Centralized error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errors = err.errors || null;

    // PostgreSQL errors
    if (err.code === '23505') {
        statusCode = 409;
        message = 'A record with this information already exists';
    } else if (err.code === '23503') {
        statusCode = 400;
        message = 'Referenced record does not exist';
    } else if (err.code === '23502') {
        statusCode = 400;
        message = `Required field missing: ${err.column}`;
    } else if (err.code === '42703') {
        statusCode = 400;
        message = 'Invalid field in query';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid authentication token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication token has expired';
    }

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File size exceeds the maximum allowed limit';
    }

    // Don't leak internals in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'An unexpected error occurred';
    }

    logger.error(`[${req.method}] ${req.path} → ${statusCode}: ${err.message}`, {
        stack: err.stack,
        user: req.user?.id,
        body: req.body,
    });

    res.status(statusCode).json({
        status: 'error',
        message,
        ...(errors && { errors }),
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
