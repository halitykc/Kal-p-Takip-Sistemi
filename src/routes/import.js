const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Setup multer for file uploads
const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
    dest: uploadDir,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
        else cb(new Error('Sadece Excel dosyaları (.xlsx, .xls, .csv) kabul edilir.'));
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post('/excel', requireAuth, requireRole('admin'), upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi.' });

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        if (data.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Excel dosyası boş.' });
        }

        // Get machines for matching
        const machines = db.prepare('SELECT id, name FROM machines').all();
        const machineMap = {};
        machines.forEach(m => { machineMap[m.name.toLowerCase()] = m.id; });

        let imported = 0;
        let skipped = 0;
        const errors = [];

        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO molds (product_code, mold_type, mold_code, eye_count, pin_count,
                                        status, machine_id, position, has_pair, arrival_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMovement = db.prepare(`
            INSERT INTO stock_movements (mold_id, movement_type, movement_date, created_by)
            VALUES (?, 'Giriş', ?, ?)
        `);

        const importTransaction = db.transaction((rows) => {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    // Map column names (flexible matching)
                    const productCode = row['Ürün Kodu'] || row['Urun Kodu'] || row['product_code'] || '';
                    let moldType = row['Kalıp Türü'] || row['Kalip Turu'] || row['mold_type'] || '';
                    const moldCode = row['Kalıp Kodu'] || row['Kalip Kodu'] || row['mold_code'] || '';
                    const eyeCount = parseInt(row['Göz Sayısı'] || row['Goz Sayisi'] || row['eye_count'] || 0) || 0;
                    const pinCount = parseInt(row['Pim Sayısı'] || row['Pim Sayisi'] || row['pin_count'] || 0) || 0;
                    const status = row['Durumu'] || row['Durum'] || row['status'] || 'Yeni';
                    const machineName = row['Makinası'] || row['Makina'] || row['machine'] || '';
                    let position = row['Üst mü? Alt mı kalıp?'] || row['Pozisyon'] || row['position'] || '';
                    const hasPairRaw = row['takım olarak var mı?'] || row['Takım'] || row['has_pair'] || '';
                    let arrivalDate = row['Geliş Tarihi'] || row['Gelis Tarihi'] || row['arrival_date'] || '';

                    if (!productCode) { skipped++; continue; }
                    const upperProductCode = productCode.toUpperCase();

                    // Normalize mold type
                    if (moldType.toLowerCase().includes('zımba') || moldType.toLowerCase().includes('zimba')) moldType = 'Zımba';
                    else if (moldType.toLowerCase().includes('plaka')) moldType = 'Plaka';
                    else if (moldType.toLowerCase().includes('kalıp') || moldType.toLowerCase().includes('kalip')) moldType = 'Kalıp';
                    else if (!['Kalıp', 'Zımba', 'Plaka'].includes(moldType)) moldType = 'Kalıp';

                    // Normalize position
                    if (position.toLowerCase().includes('üst') || position.toLowerCase().includes('ust') || position === 'ÜST') position = 'Üst';
                    else if (position.toLowerCase().includes('alt') || position === 'ALT') position = 'Alt';
                    else position = 'none';

                    // Normalize has_pair
                    const hasPair = (hasPairRaw === 'EVET' || hasPairRaw === 'Evet' || hasPairRaw === '1' || hasPairRaw === true) ? 1 : 0;

                    // Match machine
                    const machineId = machineName ? (machineMap[machineName.toLowerCase()] || null) : null;

                    // Normalize date
                    if (arrivalDate) {
                        if (typeof arrivalDate === 'number') {
                            // Excel serial date
                            const d = XLSX.SSF.parse_date_code(arrivalDate);
                            arrivalDate = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
                        } else {
                            // Try to parse various formats
                            const parts = String(arrivalDate).split(/[./-]/);
                            if (parts.length === 3) {
                                let [a, b, c] = parts.map(p => parseInt(p));
                                if (a > 31) arrivalDate = `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
                                else arrivalDate = `${c < 100 ? 2000 + c : c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
                            }
                        }
                    }

                    const result = insertStmt.run(upperProductCode, moldType, String(moldCode), eyeCount, pinCount,
                        status, machineId, position, hasPair, arrivalDate || null, null);

                    if (result.changes > 0) {
                        imported++;
                        if (arrivalDate) {
                            insertMovement.run(result.lastInsertRowid, arrivalDate, req.session.user.id);
                        }
                    } else {
                        skipped++;
                    }
                } catch (rowErr) {
                    errors.push(`Satır ${i + 2}: ${rowErr.message}`);
                    skipped++;
                }
            }
        });

        importTransaction(data);

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            message: `Import tamamlandı. ${imported} kayıt eklendi, ${skipped} atlanan.`,
            imported,
            skipped,
            total: data.length,
            errors: errors.slice(0, 10)
        });
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
