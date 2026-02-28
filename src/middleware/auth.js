// Authentication & Authorization Middleware

function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Oturum gerekli. Lütfen giriş yapın.' });
    }
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: 'Oturum gerekli.' });
        }
        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
        }
        next();
    };
}

module.exports = { requireAuth, requireRole };
