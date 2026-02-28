const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get pending molds
router.get('/', requireAuth, (req, res) => {
    try {
        const pending = db.prepare(`
            SELECT p.*, u.full_name as submitted_by_name, ma.name as machine_name
            FROM pending_molds p
            LEFT JOIN users u ON p.submitted_by = u.id
            LEFT JOIN machines ma ON p.machine_id = ma.id
            WHERE p.approval_status = 'pending'
            ORDER BY p.submitted_at DESC
        `).all();
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit pending mold (operator)
router.post('/', requireAuth, requireRole('admin', 'operator'), (req, res) => {
    try {
        const { product_code, mold_type, mold_code, eye_count, pin_count, status,
            machine_id, position, has_pair, arrival_date, notes } = req.body;

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

        // If admin, add directly to molds table
        if (req.session.user.role === 'admin') {
            const arrDate = arrival_date || new Date().toISOString().split('T')[0];
            const result = db.prepare(`
                INSERT INTO molds (product_code, mold_type, mold_code, eye_count, pin_count, status,
                                 machine_id, position, has_pair, arrival_date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(upperProduct, mold_type, String(mold_code), eye_count || 0, pin_count || 0,
                status || 'Yeni', machine_id || null, position || 'none', has_pair || 0,
                arrDate, notes || null);

            const moldId = result.lastInsertRowid;

            // Log stock movement
            db.prepare(`INSERT INTO stock_movements (mold_id, movement_type, movement_date, created_by)
                       VALUES (?, 'Giriş', ?, ?)`).run(moldId, arrDate, req.session.user.id);

            // If has pair, create the pair mold automatically
            const { pair_mold_code, pair_eye_count } = req.body;
            if (has_pair && pair_mold_code) {
                const pairPosition = position === 'Üst' ? 'Alt' : 'Üst';
                const pairResult = db.prepare(`
                    INSERT INTO molds (product_code, mold_type, mold_code, eye_count, pin_count, status,
                                     machine_id, position, has_pair, pair_id, arrival_date, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
                `).run(upperProduct, 'Kalıp', String(pair_mold_code), pair_eye_count || 0, pin_count || 0,
                    status || 'Yeni', machine_id || null, pairPosition, moldId,
                    arrDate, notes || null);

                // Link first mold to pair
                db.prepare('UPDATE molds SET pair_id = ? WHERE id = ?').run(pairResult.lastInsertRowid, moldId);

                // Log stock movement for pair
                db.prepare(`INSERT INTO stock_movements (mold_id, movement_type, movement_date, created_by)
                           VALUES (?, 'Giriş', ?, ?)`).run(pairResult.lastInsertRowid, arrDate, req.session.user.id);
            }

            return res.json({ id: moldId, message: has_pair && pair_mold_code ? 'Kalıp ve takımı eklendi.' : 'Kalıp eklendi.' });
        }

        // Operator: add to pending
        const { pair_mold_code, pair_pin_count } = req.body;
        const arrDate = arrival_date || new Date().toISOString().split('T')[0];
        const result = db.prepare(`
            INSERT INTO pending_molds (product_code, mold_type, mold_code, eye_count, pin_count, status,
                                      machine_id, position, has_pair, arrival_date, notes, submitted_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(upperProduct, mold_type, String(mold_code), eye_count || 0, pin_count || 0,
            status || 'Yeni', machine_id || null, position || 'none', has_pair || 0,
            arrDate, JSON.stringify({ notes: notes || null, pair_mold_code: pair_mold_code || null, pair_pin_count: pair_pin_count || 0 }),
            req.session.user.id);

        res.json({ id: result.lastInsertRowid, message: 'Kalıp onay için gönderildi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Approve pending mold (admin only)
router.post('/:id/approve', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const pending = db.prepare('SELECT * FROM pending_molds WHERE id = ? AND approval_status = ?')
            .get(req.params.id, 'pending');

        if (!pending) return res.status(404).json({ error: 'Onay bekleyen kayıt bulunamadı.' });

        const arrDate = pending.arrival_date || new Date().toISOString().split('T')[0];

        // Parse extra data from notes field (pair info stored as JSON)
        let extraData = {};
        let realNotes = pending.notes;
        try {
            const parsed = JSON.parse(pending.notes);
            if (parsed && typeof parsed === 'object' && 'pair_mold_code' in parsed) {
                extraData = parsed;
                realNotes = parsed.notes || null;
            }
        } catch (e) { /* notes is plain text */ }

        // Move to molds table
        const result = db.prepare(`
            INSERT INTO molds (product_code, mold_type, mold_code, eye_count, pin_count, status,
                             machine_id, position, has_pair, arrival_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(pending.product_code, pending.mold_type, pending.mold_code,
            pending.eye_count, pending.pin_count, pending.status,
            pending.machine_id, pending.position, pending.has_pair,
            arrDate, realNotes);

        const moldId = result.lastInsertRowid;

        // Log stock movement
        db.prepare(`INSERT INTO stock_movements (mold_id, movement_type, movement_date, created_by)
                   VALUES (?, 'Giriş', ?, ?)`).run(moldId, arrDate, req.session.user.id);

        // If has pair, create pair mold
        if (pending.has_pair && extraData.pair_mold_code) {
            const pairPosition = pending.position === 'Üst' ? 'Alt' : 'Üst';
            const pairResult = db.prepare(`
                INSERT INTO molds (product_code, mold_type, mold_code, eye_count, pin_count, status,
                                 machine_id, position, has_pair, pair_id, arrival_date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            `).run(pending.product_code, 'Kalıp', String(extraData.pair_mold_code),
                pending.eye_count, extraData.pair_pin_count || 0, pending.status,
                pending.machine_id, pairPosition, moldId, arrDate, realNotes);

            // Link first mold to pair
            db.prepare('UPDATE molds SET pair_id = ? WHERE id = ?').run(pairResult.lastInsertRowid, moldId);

            // Log stock movement for pair
            db.prepare(`INSERT INTO stock_movements (mold_id, movement_type, movement_date, created_by)
                       VALUES (?, 'Giriş', ?, ?)`).run(pairResult.lastInsertRowid, arrDate, req.session.user.id);
        }

        // Mark as approved
        db.prepare("UPDATE pending_molds SET approval_status = 'approved' WHERE id = ?").run(req.params.id);

        res.json({ message: pending.has_pair && extraData.pair_mold_code ? 'Kalıp ve takımı onaylandı.' : 'Kalıp onaylandı ve eklendi.' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Bu kalıp kodu zaten mevcut.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Reject pending mold (admin only)
router.post('/:id/reject', requireAuth, requireRole('admin'), (req, res) => {
    try {
        db.prepare("UPDATE pending_molds SET approval_status = 'rejected' WHERE id = ? AND approval_status = 'pending'")
            .run(req.params.id);
        res.json({ message: 'Kalıp reddedildi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get pending count (for badge)
router.get('/count', requireAuth, (req, res) => {
    try {
        const result = db.prepare("SELECT COUNT(*) as count FROM pending_molds WHERE approval_status = 'pending'").get();
        res.json({ count: result.count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
