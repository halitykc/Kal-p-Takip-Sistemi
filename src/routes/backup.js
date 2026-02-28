const express = require('express');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'kalip.db');
const BACKUP_DIR = path.join(__dirname, '..', '..', 'data', 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Create backup (admin only)
router.post('/create', requireAuth, requireRole('admin'), (req, res) => {
    try {
        if (!fs.existsSync(DB_PATH)) {
            return res.status(404).json({ error: 'Veritabanı dosyası bulunamadı.' });
        }

        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupName = `kalip_backup_${timestamp}.db`;
        const backupPath = path.join(BACKUP_DIR, backupName);

        fs.copyFileSync(DB_PATH, backupPath);

        res.json({
            message: 'Yedekleme başarıyla oluşturuldu.',
            filename: backupName,
            size: fs.statSync(backupPath).size,
            date: now.toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List backups
router.get('/list', requireAuth, requireRole('admin'), (req, res) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return res.json([]);
        }

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.db'))
            .map(f => {
                const stats = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    filename: f,
                    size: stats.size,
                    date: stats.mtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Download backup
router.get('/download/:filename', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const filename = req.params.filename;
        // Prevent path traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Geçersiz dosya adı.' });
        }
        const filePath = path.join(BACKUP_DIR, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Yedek dosyası bulunamadı.' });
        }
        res.download(filePath, filename);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete backup
router.delete('/:filename', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const filename = req.params.filename;
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Geçersiz dosya adı.' });
        }
        const filePath = path.join(BACKUP_DIR, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Yedek dosyası bulunamadı.' });
        }
        fs.unlinkSync(filePath);
        res.json({ message: 'Yedek silindi.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
