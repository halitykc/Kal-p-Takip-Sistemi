const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/stats', requireAuth, (req, res) => {
    try {
        const total = db.prepare('SELECT COUNT(*) as count FROM molds').get().count;
        const byType = db.prepare('SELECT mold_type, COUNT(*) as count FROM molds GROUP BY mold_type').all();
        const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM molds GROUP BY status').all();
        const pendingCount = db.prepare("SELECT COUNT(*) as count FROM pending_molds WHERE approval_status = 'pending'").get().count;

        const recentMovements = db.prepare(`
            SELECT sm.*, m.mold_code, m.product_code, m.mold_type, u.full_name as created_by_name
            FROM stock_movements sm
            JOIN molds m ON sm.mold_id = m.id
            LEFT JOIN users u ON sm.created_by = u.id
            ORDER BY sm.created_at DESC LIMIT 10
        `).all();

        const recentMolds = db.prepare(`
            SELECT m.*, ma.name as machine_name FROM molds m
            LEFT JOIN machines ma ON m.machine_id = ma.id
            ORDER BY m.created_at DESC LIMIT 5
        `).all();

        const machineUtilization = db.prepare(`
            SELECT ma.name, COUNT(mo.id) as mold_count
            FROM machines ma
            LEFT JOIN molds mo ON mo.machine_id = ma.id
            GROUP BY ma.id
            ORDER BY mold_count DESC
        `).all();

        // Product completeness: Kalıp Üst + Kalıp Alt + Zımba + Plaka = Tam Takım
        const allMolds = db.prepare(`
            SELECT product_code, mold_type, position, COUNT(*) as cnt FROM molds GROUP BY product_code, mold_type, position
        `).all();

        const productMap = {};
        allMolds.forEach(row => {
            if (!row.product_code) return;
            if (!productMap[row.product_code]) {
                productMap[row.product_code] = { product_code: row.product_code, kalip_ust: 0, kalip_alt: 0, zimba: 0, plaka: 0 };
            }
            const p = productMap[row.product_code];
            if (row.mold_type === 'Kalıp' && row.position === 'Üst') p.kalip_ust += row.cnt;
            else if (row.mold_type === 'Kalıp' && row.position === 'Alt') p.kalip_alt += row.cnt;
            else if (row.mold_type === 'Kalıp') { /* position=none — count as both missing */ }
            else if (row.mold_type === 'Zımba') p.zimba += row.cnt;
            else if (row.mold_type === 'Plaka') p.plaka += row.cnt;
        });
        const productCompleteness = Object.values(productMap).sort((a, b) => a.product_code.localeCompare(b.product_code));

        res.json({
            total,
            byType,
            byStatus,
            pendingCount,
            recentMovements,
            recentMolds,
            machineUtilization,
            productCompleteness
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
