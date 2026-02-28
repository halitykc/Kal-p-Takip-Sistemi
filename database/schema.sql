-- Kalıp Takip Sistemi — Veritabanı Şeması

-- Kullanıcılar
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','operator','viewer')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Makinalar
CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','maintenance')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Kalıplar (Ana tablo)
CREATE TABLE IF NOT EXISTS molds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT NOT NULL,
    mold_type TEXT NOT NULL CHECK(mold_type IN ('Kalıp','Zımba','Plaka')),
    mold_code TEXT NOT NULL,
    eye_count INTEGER DEFAULT 0,
    pin_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Yeni',
    machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
    position TEXT DEFAULT 'none' CHECK(position IN ('Üst','Alt','none')),
    has_pair INTEGER DEFAULT 0,
    pair_id INTEGER REFERENCES molds(id) ON DELETE SET NULL,
    arrival_date TEXT,
    departure_date TEXT,
    photo_path TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Onay Bekleyen Kalıplar
CREATE TABLE IF NOT EXISTS pending_molds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT NOT NULL,
    mold_type TEXT NOT NULL CHECK(mold_type IN ('Kalıp','Zımba','Plaka')),
    mold_code TEXT NOT NULL,
    eye_count INTEGER DEFAULT 0,
    pin_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Yeni',
    machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
    position TEXT DEFAULT 'none' CHECK(position IN ('Üst','Alt','none')),
    has_pair INTEGER DEFAULT 0,
    arrival_date TEXT,
    notes TEXT,
    submitted_by INTEGER REFERENCES users(id),
    submitted_at TEXT DEFAULT (datetime('now')),
    approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending','approved','rejected'))
);

-- Stok Hareketleri
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mold_id INTEGER NOT NULL REFERENCES molds(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('Giriş','Çıkış')),
    movement_date TEXT NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Değişiklik Geçmişi (Audit Log)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER REFERENCES users(id),
    changed_at TEXT DEFAULT (datetime('now'))
);

-- Bakım Kayıtları
CREATE TABLE IF NOT EXISTS maintenance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mold_id INTEGER NOT NULL REFERENCES molds(id) ON DELETE CASCADE,
    maintenance_type TEXT NOT NULL CHECK(maintenance_type IN ('Bakım','Arıza','Revizyon','Kontrol')),
    description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    cost REAL DEFAULT 0,
    technician TEXT,
    status TEXT NOT NULL DEFAULT 'Planlandı' CHECK(status IN ('Planlandı','Devam Ediyor','Tamamlandı','İptal')),
    next_maintenance_date TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Bildirimler
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK(type IN ('info','warning','success','danger')),
    is_read INTEGER DEFAULT 0,
    link TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_molds_product_code ON molds(product_code);
CREATE INDEX IF NOT EXISTS idx_molds_type ON molds(mold_type);
CREATE INDEX IF NOT EXISTS idx_molds_status ON molds(status);
CREATE INDEX IF NOT EXISTS idx_molds_machine ON molds(machine_id);
CREATE INDEX IF NOT EXISTS idx_molds_pair ON molds(pair_id);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_molds(approval_status);
CREATE INDEX IF NOT EXISTS idx_stock_mold ON stock_movements(mold_id);
CREATE INDEX IF NOT EXISTS idx_stock_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_maint_mold ON maintenance_records(mold_id);
CREATE INDEX IF NOT EXISTS idx_maint_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maint_next ON maintenance_records(next_maintenance_date);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
