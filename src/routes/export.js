const express = require('express');
const XLSX = require('xlsx');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Export molds to Excel
router.get('/molds', requireAuth, (req, res) => {
    try {
        const molds = db.prepare(`
            SELECT m.product_code as "Ürün Kodu", m.mold_type as "Kalıp Türü",
                   m.mold_code as "Kalıp Kodu", m.eye_count as "Göz Sayısı",
                   m.pin_count as "Pim Sayısı", m.status as "Durum",
                   m.position as "Pozisyon", ma.name as "Makina",
                   m.arrival_date as "Geliş Tarihi", m.departure_date as "Çıkış Tarihi",
                   m.notes as "Notlar"
            FROM molds m
            LEFT JOIN machines ma ON m.machine_id = ma.id
            ORDER BY m.product_code, m.mold_type
        `).all();

        const ws = XLSX.utils.json_to_sheet(molds);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Kalıplar');

        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 20 },
            { wch: 14 }, { wch: 14 }, { wch: 30 }
        ];

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = `kaliplar_${new Date().toISOString().slice(0, 10)}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export stock movements to Excel
router.get('/stock', requireAuth, (req, res) => {
    try {
        const { movement_type, date_from, date_to } = req.query;
        let sql = `SELECT sm.movement_date as "Tarih", sm.movement_type as "Hareket Türü",
                          m.mold_code as "Kalıp Kodu", m.product_code as "Ürün Kodu",
                          m.mold_type as "Kalıp Türü", sm.notes as "Not",
                          u.full_name as "Kullanıcı"
                   FROM stock_movements sm
                   JOIN molds m ON sm.mold_id = m.id
                   LEFT JOIN users u ON sm.created_by = u.id
                   WHERE 1=1`;
        const params = [];
        if (movement_type) { sql += ' AND sm.movement_type = ?'; params.push(movement_type); }
        if (date_from) { sql += ' AND sm.movement_date >= ?'; params.push(date_from); }
        if (date_to) { sql += ' AND sm.movement_date <= ?'; params.push(date_to); }
        sql += ' ORDER BY sm.movement_date DESC';

        const movements = db.prepare(sql).all(...params);

        const ws = XLSX.utils.json_to_sheet(movements);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stok Hareketleri');
        ws['!cols'] = [
            { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
            { wch: 12 }, { wch: 30 }, { wch: 18 }
        ];

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = `stok_hareketleri_${new Date().toISOString().slice(0, 10)}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export maintenance records
router.get('/maintenance', requireAuth, (req, res) => {
    try {
        const records = db.prepare(`
            SELECT m.mold_code as "Kalıp Kodu", m.product_code as "Ürün Kodu",
                   mr.maintenance_type as "Bakım Türü", mr.description as "Açıklama",
                   mr.start_date as "Başlangıç", mr.end_date as "Bitiş",
                   mr.cost as "Maliyet", mr.technician as "Teknisyen",
                   mr.status as "Durum", mr.next_maintenance_date as "Sonraki Bakım"
            FROM maintenance_records mr
            JOIN molds m ON mr.mold_id = m.id
            ORDER BY mr.start_date DESC
        `).all();

        const ws = XLSX.utils.json_to_sheet(records);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bakım Kayıtları');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = `bakim_kayitlari_${new Date().toISOString().slice(0, 10)}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
