'use strict';

const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Validation middleware - runs after express-validator chains
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formatted = errors.array().map(e => ({
            field: e.path,
            message: e.msg,
            value: e.value,
        }));
        return next(AppError.badRequest('Validation failed', formatted));
    }
    next();
};

module.exports = { validate };
