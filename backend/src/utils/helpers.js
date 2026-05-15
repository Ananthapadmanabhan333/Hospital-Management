'use strict';

const db = require('../database/connection');

/**
 * Generate UHID: UHID00001, UHID00002, ...
 */
const generateUHID = async () => {
    const prefix = process.env.UHID_PREFIX || 'UHID';
    const { rows } = await db.query(`SELECT COUNT(*) as count FROM patients`);
    const next = parseInt(rows[0].count) + 1;
    return `${prefix}${String(next).padStart(5, '0')}`;
};

/**
 * Generate invoice number: INV-2024-00001
 */
const generateInvoiceNumber = async () => {
    const year = new Date().getFullYear();
    const { rows } = await db.query(`SELECT COUNT(*) as count FROM billing WHERE EXTRACT(YEAR FROM created_at) = $1`, [year]);
    const next = parseInt(rows[0].count) + 1;
    return `INV-${year}-${String(next).padStart(5, '0')}`;
};

/**
 * Paginate helper
 */
const paginate = (page, limit) => {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    return { page: p, limit: l, offset: (p - 1) * l };
};

/**
 * Format date to ISO
 */
const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toISOString().split('T')[0];
};

/**
 * Sanitize sort column to prevent SQL injection
 */
const safeSortColumn = (column, allowed) => {
    return allowed.includes(column) ? column : allowed[0];
};

module.exports = { generateUHID, generateInvoiceNumber, paginate, formatDate, safeSortColumn };
