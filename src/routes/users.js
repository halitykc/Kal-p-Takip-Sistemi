const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get all users (admin)
router.get('/', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const users = db.prepare('SELECT id, username, full_name, role, created_at FROM users ORDER BY id').all();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create user (admin)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        if (!username || !password || !full_name) {
            return res.status(400).json({ error: 'Kullanıcı adı, şifre ve ad soyad zorunludur.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
            .run(username, hash, full_name, role || 'viewer');
        res.json({ id: result.lastInsertRowid, message: 'Kullanıcı oluşturuldu.' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten mevcut.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Update user (admin)
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        if (password) {
            const hash = bcrypt.hashSync(password, 10);
            db.prepare('UPDATE users SET username=?, password_hash=?, full_name=?, role=? WHERE id=?')
                .run(username, hash, full_name, role, req.params.id);
        } else {
            db.prepare('UPDATE users SET username=?, full_name=?, role=? WHERE id=?')
                .run(username, full_name, role, req.params.id);
        }
        res.json({ message: 'Kullanıcı güncellendi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete user (admin)
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        if (parseInt(req.params.id) === req.session.user.id) {
            return res.status(400).json({ error: 'Kendinizi silemezsiniz.' });
        }
        db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
        res.json({ message: 'Kullanıcı silindi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
