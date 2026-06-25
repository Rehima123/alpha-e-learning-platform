const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Protect routes — verify JWT ───────────────────────────────────────────────
exports.protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authorized — no token' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user)       return res.status(401).json({ success: false, message: 'User not found' });
        if (!req.user.isActive) return res.status(401).json({ success: false, message: 'Account deactivated' });
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

// ── Authorize by role(s) ──────────────────────────────────────────────────────
// Usage: authorize('super_admin', 'content_admin')
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // super_admin always passes
        if (req.user.role === 'super_admin') return next();
        // legacy 'admin' treated as super_admin
        if (req.user.role === 'admin') return next();

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Role '${req.user.role}' is not authorized for this action`
            });
        }
        next();
    };
};

// ── Authorize by permission string ───────────────────────────────────────────
// Usage: requirePermission('payments.approve')
exports.requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user.hasPermission(permission)) {
            return res.status(403).json({
                success: false,
                message: `You don't have permission: '${permission}'`
            });
        }
        next();
    };
};

// ── Shortcut guards ───────────────────────────────────────────────────────────
exports.isSuperAdmin  = exports.authorize('super_admin');
exports.isAnyAdmin    = exports.authorize('super_admin','content_admin','finance_admin','support_admin','admin');
exports.isContentAdmin= exports.authorize('super_admin','content_admin');
exports.isFinanceAdmin= exports.authorize('super_admin','finance_admin');
exports.isSupportAdmin= exports.authorize('super_admin','support_admin');
exports.isInstructor  = exports.authorize('super_admin','content_admin','instructor','admin');
