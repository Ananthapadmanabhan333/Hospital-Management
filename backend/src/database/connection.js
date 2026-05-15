'use strict';

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'hospital_cms',
    user: process.env.DB_USER || 'hospital_admin',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL pool error:', err);
});

pool.on('connect', () => {
    logger.debug('New DB client connected');
});

/**
 * Execute a query
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 1000) {
            logger.warn(`Slow query detected (${duration}ms): ${text.substring(0, 100)}`);
        }
        return result;
    } catch (err) {
        logger.error('Database query error:', { query: text, params, error: err.message });
        throw err;
    }
};

/**
 * Get a client for transactions
 */
const getClient = () => pool.connect();

/**
 * Execute in a transaction
 */
const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Transaction rolled back:', err.message);
        throw err;
    } finally {
        client.release();
    }
};

/**
 * End pool (graceful shutdown)
 */
const end = () => pool.end();

module.exports = { query, getClient, withTransaction, end };
