/**
 * authMiddleware.js — Security Authorization Middleware
 *
 * Supplements the existing auth.js middleware with Firebase-aware
 * and admin-email-based authorization for sensitive routes.
 */

const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const { ADMIN_EMAIL } = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// verifyFirebaseOrJWT
//
// Accepts EITHER:
//   a) A standard backend JWT  → decoded + DB lookup
//   b) A Firebase synced JWT   → decoded + DB lookup
//   c) A raw "firebase-{uid}"  → DB lookup by firebaseUid
//
// Sets req.user and calls next(), or returns 401.
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyFirebaseOrJWT = async (req, res, next) => {
    try {
        let token = req.headers.authorization?.startsWith('Bearer')
            ? req.headers.authorization.split(' ')[1]
            : null;

        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authorized — no token' });
        }

        // ── Raw Firebase fallback token (firebase-{uid}) ──────────────────────
        if (token.startsWith('firebase-')) {
            const uid  = token.replace('firebase-', '');
            const user = await User.findOne({ firebaseUid: uid });

            if (!user) {
                return res.status(401).json({ success: false, message: 'Firebase user not synced. Please log in again.' });
            }
            if (!user.isActive || !user.isApproved) {
                return res.status(401).json({ success: false, message: 'Account suspended' });
            }
            req.user = user;
            return next();
        }

        // ── Standard JWT (backend-issued) ─────────────────────────────────────
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user    = await User.findById(decoded.id).select('+currentSessionToken');

        if (!user)          return res.status(401).json({ success: false, message: 'User not found' });
        if (!user.isActive) return res.status(401).json({ success: false, message: 'Account deactivated' });

        // Single-device check
        if (decoded.sid && user.currentSessionToken && decoded.sid !== user.currentSessionToken) {
            return res.status(401).json({
                success: false,
                code:    'SESSION_DISPLACED',
                message: 'Your account was signed in from another device.'
            });
        }

        req.user = user;
        next();
    } catch {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// verifyAdmin
//
// Requires the authenticated user to EITHER:
//   • have email === supportalphafreshman@gmail.com, OR
//   • have role === 'admin' or 'super_admin'
//
// Must be used AFTER verifyFirebaseOrJWT (or the existing protect middleware).
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const adminRoles = ['admin', 'super_admin'];
    const isAdminEmail = req.user.email?.toLowerCase() === ADMIN_EMAIL;
    const isAdminRole  = adminRoles.includes(req.user.role);

    if (!isAdminEmail && !isAdminRole) {
        return res.status(403).json({
            success: false,
            message: 'Access denied — admin only'
        });
    }

    next();
};

// ─────────────────────────────────────────────────────────────────────────────
// verifyAnyAdmin
//
// Allows access to any admin-tier role:
//   admin, super_admin, content_admin, finance_admin, support_admin
// Also always allows supportalphafreshman@gmail.com.
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyAnyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const adminRoles   = ['admin','super_admin','content_admin','finance_admin','support_admin'];
    const isAdminEmail = req.user.email?.toLowerCase() === ADMIN_EMAIL;
    const isAdminRole  = adminRoles.includes(req.user.role);

    if (!isAdminEmail && !isAdminRole) {
        return res.status(403).json({
            success: false,
            message: 'Access denied — admin role required'
        });
    }

    next();
};
