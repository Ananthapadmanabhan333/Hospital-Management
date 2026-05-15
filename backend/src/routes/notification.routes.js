'use strict';

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const db = require('../database/connection');

router.use(authenticate);

// GET /notifications
router.get('/', async (req, res, next) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        const unread = rows.filter(n => !n.is_read).length;
        res.json({ status: 'success', data: rows, unreadCount: unread });
    } catch (err) {
        next(err);
    }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        res.json({ status: 'success', message: 'Notification marked as read' });
    } catch (err) {
        next(err);
    }
});

// PATCH /notifications/mark-all-read
router.patch('/mark-all-read', async (req, res, next) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
            [req.user.id]
        );
        res.json({ status: 'success', message: 'All notifications marked as read' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
