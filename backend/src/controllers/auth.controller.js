'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database/connection');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

const generateTokens = (userId, role) => {
    const accessToken = jwt.sign(
        { userId, role },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRY, issuer: 'hospital-cms', audience: 'hospital-cms-client' }
    );
    const refreshToken = jwt.sign(
        { userId, role, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRY, issuer: 'hospital-cms', audience: 'hospital-cms-client' }
    );
    return { accessToken, refreshToken };
};

const setAuthCookies = (res, accessToken, refreshToken) => {
    const cookieOpts = {
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: 'strict',
        domain: process.env.COOKIE_DOMAIN || 'localhost',
    };
    res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth/refresh' });
};

/**
 * POST /auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const { rows } = await db.query(
            `SELECT id, email, password_hash, role, first_name, last_name, is_active, 
              failed_login_attempts, locked_until, is_email_verified
       FROM users WHERE email = $1 AND deleted_at IS NULL`,
            [email]
        );

        const user = rows[0];

        // Timing-safe: always compare even if user not found
        const fakeHash = '$2a$12$fakehashfakehashfakehashfakehashfakehashfakehashfakehash.';
        const passwordMatch = await bcrypt.compare(password, user?.password_hash || fakeHash);

        if (!user || !passwordMatch) {
            if (user) {
                await db.query(
                    'UPDATE users SET failed_login_attempts = failed_login_attempts + 1, locked_until = CASE WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL \'15 minutes\' ELSE locked_until END WHERE id = $1',
                    [user.id]
                );
            }
            throw AppError.unauthorized('Invalid email or password');
        }

        if (!user.is_active) throw AppError.unauthorized('Account is deactivated. Contact admin.');
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            throw AppError.unauthorized('Account is temporarily locked due to too many failed attempts. Try again later.');
        }

        // Reset failed attempts on success
        await db.query(
            'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1',
            [user.id]
        );

        const { accessToken, refreshToken } = generateTokens(user.id, user.role);

        // Store hashed refresh token
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
            [user.id, tokenHash, expiresAt, req.ip, req.get('User-Agent')]
        );

        setAuthCookies(res, accessToken, refreshToken);

        logger.info(`User logged in: ${user.email} (${user.role})`);

        res.json({
            status: 'success',
            data: {
                user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
                accessToken,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /auth/logout
 */
const logout = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        if (refreshToken) {
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            await db.query('UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
        }
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
        res.json({ status: 'success', message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /auth/refresh
 */
const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!token) throw AppError.unauthorized('Refresh token required');

        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
            issuer: 'hospital-cms',
            audience: 'hospital-cms-client',
        });

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const { rows } = await db.query(
            'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()',
            [tokenHash]
        );

        if (!rows[0]) throw AppError.unauthorized('Invalid or expired refresh token');

        // Revoke old token (rotation)
        await db.query('UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE id = $1', [rows[0].id]);

        const { rows: users } = await db.query(
            'SELECT id, role FROM users WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
            [decoded.userId]
        );

        if (!users[0]) throw AppError.unauthorized('User not found');

        const { accessToken: newAccess, refreshToken: newRefresh } = generateTokens(users[0].id, users[0].role);
        const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
            [users[0].id, newHash, expiresAt, req.ip, req.get('User-Agent')]
        );

        setAuthCookies(res, newAccess, newRefresh);

        res.json({ status: 'success', data: { accessToken: newAccess } });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /auth/me
 */
const getMe = async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.is_active, u.last_login_at, u.created_at,
              p.id as patient_id, p.uhid,
              d.id as doctor_id, d.specialization, d.department
       FROM users u
       LEFT JOIN patients p ON p.user_id = u.id AND p.deleted_at IS NULL
       LEFT JOIN doctors d ON d.user_id = u.id AND d.deleted_at IS NULL
       WHERE u.id = $1`,
            [req.user.id]
        );

        if (!rows[0]) throw AppError.notFound('User not found');

        res.json({ status: 'success', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /auth/change-password
 */
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (!rows[0]) throw AppError.notFound('User not found');

        const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!match) throw AppError.badRequest('Current password is incorrect');

        const newHash = await bcrypt.hash(newPassword, 12);
        await db.query(
            'UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2',
            [newHash, req.user.id]
        );

        // Revoke all refresh tokens
        await db.query('UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE user_id = $1', [req.user.id]);

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

        res.json({ status: 'success', message: 'Password changed successfully. Please log in again.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { login, logout, refreshToken, getMe, changePassword };
