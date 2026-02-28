const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get audit log for an entity or all
router.get('/', requireAuth, (req, res) => {
    try {
        const { entity_type, entity_id, limit } = req.query;
        let sql = `SELECT a.*, u.full_name as changed_by_name
                   FROM audit_log a
                   LEFT JOIN users u ON a.changed_by = u.id
                   WHERE 1=1`;
        const params = [];

        if (entity_type) { sql += ' AND a.entity_type = ?'; params.push(entity_type); }
        if (entity_id) { sql += ' AND a.entity_id = ?'; params.push(entity_id); }

        sql += ' ORDER BY a.changed_at DESC';
        sql += ` LIMIT ${parseInt(limit) || 100}`;

        const logs = db.prepare(sql).all(...params);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper to create audit log entry (used from other routes)
function logAudit(entityType, entityId, action, fieldName, oldValue, newValue, changedBy) {
    try {
        db.prepare(`INSERT INTO audit_log (entity_type, entity_id, action, field_name, old_value, new_value, changed_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(entityType, entityId, action, fieldName,
                oldValue !== undefined ? String(oldValue) : null,
                newValue !== undefined ? String(newValue) : null,
                changedBy);
    } catch (e) { /* silent fail for audit */ }
}

module.exports = router;
module.exports.logAudit = logAudit;
