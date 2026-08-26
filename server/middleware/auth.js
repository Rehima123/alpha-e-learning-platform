const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Protect routes — verify JWT + single-device session enforcement ──────────
exports.protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authorized — no token' });
        }

        // ── Handle Firebase fallback token (firebase-{uid}) ───────────────────
        if (token.startsWith('firebase-')) {
            const firebaseUid = token.replace('firebase-', '');
            // Find user by firebaseUid or try to find by any matching uid stored
            let user = await User.findOne({ firebaseUid });
            if (!user) {
                // Try matching by a stored field or create a minimal guest user object
                // For now, allow access with a guest user object
                req.user = {
                    _id: firebaseUid,
                    id: firebaseUid,
                    role: 'student',
                    isActive: true,
                    firebaseUid
                };
                return next();
            }
            if (!user.isActive) return res.status(401).json({ success: false, message: 'Account deactivated' });
            req.user = user;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user including currentSessionToken
        const user = await User.findById(decoded.id).select('+currentSessionToken');
        if (!user)         return res.status(401).json({ success: false, message: 'User not found' });
        if (!user.isActive) return res.status(401).json({ success: false, message: 'Account deactivated' });

        // ── Single-device check: sid in JWT must match DB ─────────────────────
        if (decoded.sid && user.currentSessionToken && decoded.sid !== user.currentSessionToken) {
            return res.status(401).json({
                success: false,
                code: 'SESSION_DISPLACED',
                message: 'Your account was logged in from another device. Please log in again.'
            });
        }

        req.user = user;
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
