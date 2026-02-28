const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get all machines
router.get('/', requireAuth, (req, res) => {
    try {
        const machines = db.prepare(`
            SELECT m.*, COUNT(mo.id) as mold_count
            FROM machines m
            LEFT JOIN molds mo ON mo.machine_id = m.id
            GROUP BY m.id
            ORDER BY m.name
        `).all();
        res.json(machines);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get machine with its molds
router.get('/:id', requireAuth, (req, res) => {
    try {
        const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.id);
        if (!machine) return res.status(404).json({ error: 'Makina bulunamadı.' });

        const molds = db.prepare('SELECT * FROM molds WHERE machine_id = ?').all(req.params.id);
        res.json({ ...machine, molds });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create machine (admin only)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { name, type, status } = req.body;
        if (!name) return res.status(400).json({ error: 'Makina adı zorunludur.' });

        const result = db.prepare('INSERT INTO machines (name, type, status) VALUES (?, ?, ?)')
            .run(name, type || '', status || 'active');
        res.json({ id: result.lastInsertRowid, message: 'Makina eklendi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update machine (admin only)
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { name, type, status } = req.body;
        db.prepare('UPDATE machines SET name=?, type=?, status=? WHERE id=?')
            .run(name, type || '', status || 'active', req.params.id);
        res.json({ message: 'Makina güncellendi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete machine (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        db.prepare('UPDATE molds SET machine_id = NULL WHERE machine_id = ?').run(req.params.id);
        db.prepare('DELETE FROM machines WHERE id = ?').run(req.params.id);
        res.json({ message: 'Makina silindi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
