-- Varsayılan Veriler

-- Varsayılan Admin Kullanıcı (şifre: admin123)
INSERT OR IGNORE INTO users (username, password_hash, full_name, role)
VALUES ('admin', '$2a$10$P/D.EXiL8SMNO1N9HKcZnOvUi5FazBxqdMlPfaW.NH74Ni9hI/9H6', 'Sistem Yöneticisi', 'admin');

-- Varsayılan Operatör (şifre: operator123)
INSERT OR IGNORE INTO users (username, password_hash, full_name, role)
VALUES ('operator', '$2a$10$cYJzrrvEoqpGM7.nS0nUu.IjhCGDap55PTreNlSmWQ5SquLJQ1.eW', 'Operatör', 'operator');

-- Örnek Makinalar
INSERT OR IGNORE INTO machines (name, type, status) VALUES ('Otomatik Pres 1', 'Pres', 'active');
INSERT OR IGNORE INTO machines (name, type, status) VALUES ('Otomatik Pres 2', 'Pres', 'active');
INSERT OR IGNORE INTO machines (name, type, status) VALUES ('Otomatik Çapaklama 1', 'Çapaklama', 'active');
INSERT OR IGNORE INTO machines (name, type, status) VALUES ('Otomatik Çapaklama 2', 'Çapaklama', 'active');
INSERT OR IGNORE INTO machines (name, type, status) VALUES ('Manuel Pres', 'Pres', 'active');
