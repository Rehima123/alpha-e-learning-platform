/**
 * syncUserController.js
 *
 * POST /api/auth/sync-user
 *
 * Called by the React frontend immediately after Firebase authentication
 * (Google or Email/Password). Creates or updates the MongoDB user record,
 * enforces the admin-email rule, and returns a backend JWT so the rest
 * of the app can use standard Bearer-token auth.
 */

const User = require('../models/User');
const { ADMIN_EMAIL } = require('../models/User');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/sync-user
//
// Expected body (sent right after Firebase login/register):
// {
//   firebaseUid : string  (Firebase UID — required)
//   email       : string  (user's email)
//   fullName    : string  (display name)
//   avatar      : string  (photoURL, optional)
//   phoneNumber : string  (optional)
// }
// ─────────────────────────────────────────────────────────────────────────────
exports.syncUser = async (req, res, next) => {
    try {
        const { firebaseUid, email, fullName, avatar, phoneNumber } = req.body;

        if (!firebaseUid) {
            return res.status(400).json({ success: false, message: 'firebaseUid is required' });
        }
        if (!email && !phoneNumber) {
            return res.status(400).json({ success: false, message: 'Email or phone number is required' });
        }

        // ── Determine role: support email always → admin ──────────────────────
        const assignedRole = email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : undefined;
        // undefined means "don't change existing role if user already exists"

        // ── Upsert: find by firebaseUid, update or create ─────────────────────
        const updatePayload = {
            firebaseUid,
            ...(email      && { email: email.toLowerCase().trim() }),
            ...(fullName   && { fullName: fullName.trim() }),
            ...(avatar     && { avatar }),
            ...(phoneNumber && { phoneNumber: phoneNumber.trim() }),
            // Only force role when it's the admin email — otherwise preserve existing
            ...(assignedRole && { role: assignedRole })
        };

        let user = await User.findOneAndUpdate(
            { firebaseUid },
            {
                $set: updatePayload,
                // setOnInsert only runs when creating a NEW document
                $setOnInsert: {
                    role:       assignedRole || 'student',
                    isApproved: true,
                    isActive:   true,
                    subscription: { plan: 'free', status: 'active' }
                }
            },
            {
                new:            true,   // return updated document
                upsert:         true,   // create if not found
                runValidators:  true,
                setDefaultsOnInsert: true
            }
        );

        // ── Safety net: re-enforce admin email after upsert ───────────────────
        // (handles edge case where $set and $setOnInsert conflict)
        if (email?.toLowerCase() === ADMIN_EMAIL && user.role !== 'admin') {
            user = await User.findByIdAndUpdate(
                user._id,
                { role: 'admin' },
                { new: true }
            );
        }

        // ── Issue backend JWT ─────────────────────────────────────────────────
        const sessionId = crypto.randomBytes(16).toString('hex');
        const token     = user.generateAuthToken(sessionId);

        // Record session
        await User.findByIdAndUpdate(user._id, {
            currentSessionToken: sessionId,
            lastLoginAt:         new Date(),
            lastLoginIP:         req.ip || req.headers['x-forwarded-for'] || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: 'User synced successfully',
            token,
            user: {
                id:          user._id,
                firebaseUid: user.firebaseUid,
                fullName:    user.fullName,
                email:       user.email,
                phoneNumber: user.phoneNumber,
                role:        user.role,
                avatar:      user.avatar,
                isApproved:  user.isApproved,
                subscription: user.subscription
            }
        });

    } catch (error) {
        // Duplicate key on email — user registered with different Firebase UID
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue || {})[0] || 'field';
            return res.status(400).json({
                success: false,
                message: `Account with this ${field} already exists. Please log in instead.`
            });
        }
        next(error);
    }
};
