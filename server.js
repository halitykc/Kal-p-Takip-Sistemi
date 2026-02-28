const express = require('express');
const session = require('express-session');
const path = require('path');
const os = require('os');
const { initializeDB } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'kalip-takip-sistemi-gizli-anahtar-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/molds', require('./src/routes/molds'));
app.use('/api/machines', require('./src/routes/machines'));
app.use('/api/stock', require('./src/routes/stock'));
app.use('/api/pending', require('./src/routes/pending'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/import', require('./src/routes/import'));
app.use('/api/backup', require('./src/routes/backup'));
app.use('/api/export', require('./src/routes/export'));
app.use('/api/audit', require('./src/routes/audit'));
app.use('/api/maintenance', require('./src/routes/maintenance'));
app.use('/api/notifications', require('./src/routes/notifications'));

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get local IP
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}

// Start
async function start() {
    try {
        await initializeDB();
        app.listen(PORT, '0.0.0.0', () => {
            const ip = getLocalIP();
            console.log(`
  ========================================================
     KALIP TAKIP SISTEMI
  --------------------------------------------------------
     Bu PC:    http://localhost:${PORT}
     Agdan:    http://${ip}:${PORT}

     Admin:    admin / admin123
     Operator: operator / operator123

     Kapatmak icin bu pencereyi kapatin.
  ========================================================`);
        });
    } catch (err) {
        console.error('Hata:', err);
        process.exit(1);
    }
}

start();
