'use strict';

/**
 * Custom application error class
 */
class AppError extends Error {
    constructor(message, statusCode = 500, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
        this.errors = errors;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message, errors = null) {
        return new AppError(message, 400, errors);
    }

    static unauthorized(message = 'Unauthorized') {
        return new AppError(message, 401);
    }

    static forbidden(message = 'Forbidden') {
        return new AppError(message, 403);
    }

    static notFound(message = 'Resource not found') {
        return new AppError(message, 404);
    }

    static conflict(message = 'Conflict') {
        return new AppError(message, 409);
    }

    static internal(message = 'Internal server error') {
        return new AppError(message, 500);
    }
}

module.exports = AppError;
