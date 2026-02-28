const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAudit } = require('./audit');
const router = express.Router();

// Get maintenance records with filters
router.get('/', requireAuth, (req, res) => {
    try {
        const { mold_id, status, maintenance_type } = req.query;
        let sql = `SELECT mr.*, m.mold_code, m.product_code, m.mold_type, u.full_name as created_by_name
                   FROM maintenance_records mr
                   JOIN molds m ON mr.mold_id = m.id
                   LEFT JOIN users u ON mr.created_by = u.id
                   WHERE 1=1`;
        const params = [];

        if (mold_id) { sql += ' AND mr.mold_id = ?'; params.push(mold_id); }
        if (status) { sql += ' AND mr.status = ?'; params.push(status); }
        if (maintenance_type) { sql += ' AND mr.maintenance_type = ?'; params.push(maintenance_type); }

        sql += ' ORDER BY mr.start_date DESC LIMIT 200';
        const records = db.prepare(sql).all(...params);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get upcoming maintenance
router.get('/upcoming', requireAuth, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const records = db.prepare(`
            SELECT mr.*, m.mold_code, m.product_code, m.mold_type
            FROM maintenance_records mr
            JOIN molds m ON mr.mold_id = m.id
            WHERE mr.next_maintenance_date IS NOT NULL 
              AND mr.next_maintenance_date <= date(?, '+30 days')
              AND mr.status = 'Tamamlandı'
            ORDER BY mr.next_maintenance_date ASC
        `).all(today);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create maintenance record (admin only)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { mold_id, maintenance_type, description, start_date, end_date,
            cost, technician, status, next_maintenance_date } = req.body;

        if (!mold_id || !maintenance_type || !start_date) {
            return res.status(400).json({ error: 'Kalıp, bakım türü ve başlangıç tarihi zorunludur.' });
        }

        const result = db.prepare(`
            INSERT INTO maintenance_records (mold_id, maintenance_type, description, start_date, end_date,
                                            cost, technician, status, next_maintenance_date, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(mold_id, maintenance_type, description || null, start_date, end_date || null,
            cost || 0, technician || null, status || 'Planlandı',
            next_maintenance_date || null, req.session.user.id);

        // Update mold status if maintenance is starting
        if (status === 'Devam Ediyor') {
            db.prepare("UPDATE molds SET status = 'Bakımda', updated_at = datetime('now') WHERE id = ?")
                .run(mold_id);
            logAudit('mold', mold_id, 'status_change', 'status', null, 'Bakımda', req.session.user.id);
        }

        logAudit('maintenance', result.lastInsertRowid, 'create', null, null,
            `${maintenance_type} - ${start_date}`, req.session.user.id);

        // Notify admins about maintenance
        const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
        const mold = db.prepare("SELECT mold_code, product_code FROM molds WHERE id = ?").get(mold_id);
        admins.forEach(admin => {
            db.prepare(`INSERT INTO notifications (user_id, title, message, type, link)
                       VALUES (?, ?, ?, ?, ?)`)
                .run(admin.id, 'Bakım Kaydı Oluşturuldu',
                    `${mold.mold_code} (${mold.product_code}) için ${maintenance_type} kaydı oluşturuldu.`,
                    'info', 'maintenance');
        });

        res.json({ id: result.lastInsertRowid, message: 'Bakım kaydı oluşturuldu.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update maintenance record
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { maintenance_type, description, start_date, end_date,
            cost, technician, status, next_maintenance_date } = req.body;

        const old = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(req.params.id);
        if (!old) return res.status(404).json({ error: 'Bakım kaydı bulunamadı.' });

        db.prepare(`
            UPDATE maintenance_records SET maintenance_type=?, description=?, start_date=?, end_date=?,
                                          cost=?, technician=?, status=?, next_maintenance_date=?
            WHERE id=?
        `).run(maintenance_type, description || null, start_date, end_date || null,
            cost || 0, technician || null, status, next_maintenance_date || null, req.params.id);

        // Update mold status based on maintenance status
        if (status === 'Devam Ediyor' && old.status !== 'Devam Ediyor') {
            db.prepare("UPDATE molds SET status = 'Bakımda', updated_at = datetime('now') WHERE id = ?")
                .run(old.mold_id);
        } else if (status === 'Tamamlandı' && old.status !== 'Tamamlandı') {
            db.prepare("UPDATE molds SET status = 'Stokta', updated_at = datetime('now') WHERE id = ?")
                .run(old.mold_id);
        }

        logAudit('maintenance', req.params.id, 'update', 'status', old.status, status, req.session.user.id);

        res.json({ message: 'Bakım kaydı güncellendi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete maintenance record
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
    try {
        db.prepare('DELETE FROM maintenance_records WHERE id = ?').run(req.params.id);
        res.json({ message: 'Bakım kaydı silindi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
