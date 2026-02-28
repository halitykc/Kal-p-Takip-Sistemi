const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get stock movements with filters
router.get('/', requireAuth, (req, res) => {
    try {
        const { mold_id, movement_type, date_from, date_to } = req.query;
        let sql = `SELECT sm.*, m.mold_code, m.product_code, m.mold_type, u.full_name as created_by_name
                   FROM stock_movements sm
                   JOIN molds m ON sm.mold_id = m.id
                   LEFT JOIN users u ON sm.created_by = u.id
                   WHERE 1=1`;
        const params = [];

        if (mold_id) { sql += ' AND sm.mold_id = ?'; params.push(mold_id); }
        if (movement_type) { sql += ' AND sm.movement_type = ?'; params.push(movement_type); }
        if (date_from) { sql += ' AND sm.movement_date >= ?'; params.push(date_from); }
        if (date_to) { sql += ' AND sm.movement_date <= ?'; params.push(date_to); }

        sql += ' ORDER BY sm.movement_date DESC, sm.id DESC LIMIT 200';
        const movements = db.prepare(sql).all(...params);
        res.json(movements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create stock movement (admin only)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { mold_id, movement_type, movement_date, notes } = req.body;
        if (!mold_id || !movement_type || !movement_date) {
            return res.status(400).json({ error: 'Kalıp, hareket türü ve tarih zorunludur.' });
        }

        db.prepare(`INSERT INTO stock_movements (mold_id, movement_type, movement_date, notes, created_by)
                    VALUES (?, ?, ?, ?, ?)`)
            .run(mold_id, movement_type, movement_date, notes || null, req.session.user.id);

        // Update mold status based on movement
        if (movement_type === 'Çıkış') {
            db.prepare("UPDATE molds SET status = 'Çıkış', departure_date = ?, updated_at = datetime('now') WHERE id = ?")
                .run(movement_date, mold_id);
        } else if (movement_type === 'Giriş') {
            db.prepare("UPDATE molds SET status = 'Stokta', departure_date = NULL, updated_at = datetime('now') WHERE id = ?")
                .run(mold_id);
        }

        res.json({ message: 'Stok hareketi kaydedildi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
