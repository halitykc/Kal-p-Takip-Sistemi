const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAudit } = require('./audit');
const router = express.Router();

// Get unique statuses (MUST be before /:id route)
router.get('/meta/statuses', requireAuth, (req, res) => {
    try {
        const statuses = db.prepare('SELECT DISTINCT status FROM molds ORDER BY status').all();
        res.json(statuses.map(s => s.status));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all molds with filters
router.get('/', requireAuth, (req, res) => {
    try {
        const { mold_type, status, machine_id, search, product_code } = req.query;
        let sql = `SELECT m.*, ma.name as machine_name, pm.mold_code as pair_code
                    FROM molds m
                    LEFT JOIN machines ma ON m.machine_id = ma.id
                    LEFT JOIN molds pm ON m.pair_id = pm.id
                    WHERE 1=1`;
        const params = [];

        if (mold_type) { sql += ' AND m.mold_type = ?'; params.push(mold_type); }
        if (status) { sql += ' AND m.status = ?'; params.push(status); }
        if (machine_id) { sql += ' AND m.machine_id = ?'; params.push(machine_id); }
        if (product_code) { sql += ' AND m.product_code = ?'; params.push(product_code); }
        if (search) {
            sql += ' AND (m.product_code LIKE ? OR m.mold_code LIKE ? OR m.notes LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY m.updated_at DESC';
        const molds = db.prepare(sql).all(...params);
        res.json(molds);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single mold
router.get('/:id', requireAuth, (req, res) => {
    try {
        const mold = db.prepare(`
            SELECT m.*, ma.name as machine_name, pm.mold_code as pair_code
            FROM molds m
            LEFT JOIN machines ma ON m.machine_id = ma.id
            LEFT JOIN molds pm ON m.pair_id = pm.id
            WHERE m.id = ?
        `).get(req.params.id);
        if (!mold) return res.status(404).json({ error: 'Kalıp bulunamadı.' });
        res.json(mold);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create mold (admin only)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { product_code, mold_type, mold_code, eye_count, pin_count, status,
            machine_id, position, has_pair, pair_id, arrival_date, notes } = req.body;

        if (!product_code || !mold_type || !mold_code) {
            return res.status(400).json({ error: 'Ürün kodu, kalıp türü ve kalıp kodu zorunludur.' });
        }
        const upperProduct = product_code.toUpperCase();
        if (!/^\d+$/.test(String(mold_code))) {
            return res.status(400).json({ error: 'Kalıp kodu sadece rakamlardan oluşmalıdır.' });
        }
        if (mold_type === 'Kalıp' && (!position || position === 'none')) {
            return res.status(400).json({ error: 'Kalıp türünde Üst veya Alt seçimi zorunludur.' });
        }

        const result = db.prepare(`
            INSERT INTO molds (product_code, mold_type, mold_code, eye_count, pin_count, status,
                             machine_id, position, has_pair, pair_id, arrival_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(upperProduct, mold_type, String(mold_code),
            eye_count || 0, pin_count || 0, status || 'Yeni',
            machine_id || null, position || 'none', has_pair || 0,
            pair_id || null, arrival_date || new Date().toISOString().split('T')[0], notes || null);

        // Log stock movement for arrival
        if (arrival_date) {
            db.prepare(`INSERT INTO stock_movements (mold_id, movement_type, movement_date, created_by)
                       VALUES (?, 'Giriş', ?, ?)`).run(result.lastInsertRowid, arrival_date, req.session.user.id);
        }

        res.json({ id: result.lastInsertRowid, message: 'Kalıp eklendi.' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Bu kalıp kodu zaten mevcut.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Update mold (admin only)
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { product_code, mold_type, mold_code, eye_count, pin_count, status,
            machine_id, position, has_pair, pair_id, arrival_date, departure_date, notes } = req.body;

        db.prepare(`
            UPDATE molds SET product_code=?, mold_type=?, mold_code=?, eye_count=?, pin_count=?,
                           status=?, machine_id=?, position=?, has_pair=?, pair_id=?,
                           arrival_date=?, departure_date=?, notes=?, updated_at=datetime('now')
            WHERE id=?
        `).run(product_code, mold_type, mold_code, eye_count || 0, pin_count || 0,
            status, machine_id || null, position || 'none', has_pair || 0,
            pair_id || null, arrival_date || null, departure_date || null,
            notes || null, req.params.id);

        res.json({ message: 'Kalıp güncellendi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete mold (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        // Remove related stock movements first
        db.prepare('DELETE FROM stock_movements WHERE mold_id = ?').run(req.params.id);
        // Remove pair references
        db.prepare('UPDATE molds SET pair_id = NULL WHERE pair_id = ?').run(req.params.id);
        const result = db.prepare('DELETE FROM molds WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Kalıp bulunamadı.' });
        }
        res.json({ message: 'Kalıp silindi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
