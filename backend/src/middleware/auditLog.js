'use strict';

const db = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Create an audit log entry
 */
const createAuditLog = async ({
    userId,
    action,
    resource,
    resourceId = null,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    status = 'SUCCESS',
    errorMessage = null,
}) => {
    try {
        await db.query(
            `INSERT INTO audit_logs 
        (user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                userId,
                action,
                resource,
                resourceId,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                ipAddress,
                userAgent,
                status,
                errorMessage,
            ]
        );
    } catch (err) {
        logger.error('Failed to create audit log:', err.message);
        // Never crash on audit log failure
    }
};

/**
 * Express middleware factory for audit logging
 */
const auditLog = (action, resource) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            const status = res.statusCode >= 400 ? 'FAILURE' : 'SUCCESS';
            createAuditLog({
                userId: req.user?.id || null,
                action,
                resource,
                resourceId: req.params?.id || body?.data?.id || null,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status,
                errorMessage: status === 'FAILURE' ? body?.message : null,
            });
            return originalJson(body);
        };
        next();
    };
};

module.exports = { createAuditLog, auditLog };
