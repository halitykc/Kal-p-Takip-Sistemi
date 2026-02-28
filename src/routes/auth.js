const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const router = express.Router();

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
        return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Şifre hatalı.' });
    }

    req.session.user = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
    };

    res.json({ user: req.session.user });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Çıkış yapıldı.' });
});

// Current user
router.get('/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Oturum yok.' });
    }
    res.json({ user: req.session.user });
});

module.exports = router;
