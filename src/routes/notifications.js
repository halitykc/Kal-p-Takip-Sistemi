const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get notifications for current user
router.get('/', requireAuth, (req, res) => {
    try {
        const notifications = db.prepare(`
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `).all(req.session.user.id);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get unread count
router.get('/unread', requireAuth, (req, res) => {
    try {
        const result = db.prepare(
            "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0"
        ).get(req.session.user.id);
        res.json({ count: result.count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark all as read (MUST be before /:id/read)
router.put('/read-all', requireAuth, (req, res) => {
    try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
            .run(req.session.user.id);
        res.json({ message: 'Tümü okundu olarak işaretlendi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark notification as read
router.put('/:id/read', requireAuth, (req, res) => {
    try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
            .run(req.params.id, req.session.user.id);
        res.json({ message: 'Okundu olarak işaretlendi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete notification
router.delete('/:id', requireAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?')
            .run(req.params.id, req.session.user.id);
        res.json({ message: 'Bildirim silindi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper: create notification (used from other routes)
function createNotification(userId, title, message, type = 'info', link = null) {
    try {
        db.prepare(`INSERT INTO notifications (user_id, title, message, type, link)
                    VALUES (?, ?, ?, ?, ?)`)
            .run(userId, title, message, type, link);
    } catch (e) { /* silent fail */ }
}

module.exports = router;
module.exports.createNotification = createNotification;
