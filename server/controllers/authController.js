const User = require('../models/User');
const { validationResult } = require('express-validator');
const { sendEmail, templates, ownerTemplates, notifyOwner, sendLoginNotification } = require('../utils/sendEmail');

// @desc    Register user
exports.register = async (req, res, next) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { fullName, email, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create user
        const user = await User.create({
            fullName,
            email,
            password,
            role: role || 'student'
        });

        // Generate token
        const token = user.generateAuthToken();

        // Send welcome email (non-blocking)
        sendEmail({ to: user.email, ...templates.welcome(user) }).catch(() => {});

        // Notify owner of new registration (non-blocking)
        notifyOwner(ownerTemplates.newUserRegistered(user)).catch(() => {});

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
exports.login = async (req, res, next) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }

        // Verify password
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = user.generateAuthToken();

        // Send login notification email (non-blocking)
        sendLoginNotification(user.email, user.fullName);

        // Notify owner/admin that a student logged in (non-blocking)
        const ownerEmail = process.env.OWNER_EMAIL || process.env.SMTP_USER || process.env.EMAIL_FROM;
        if (ownerEmail && ownerEmail !== user.email) {
            sendEmail({
                to: ownerEmail,
                subject: `👤 New Login — ${user.fullName}`,
                html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;text-align:center;border-radius:8px 8px 0 0">
                        <h2 style="color:white;margin:0">Alpha Freshman Tutorial</h2>
                        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0">Admin Notification</p>
                    </div>
                    <div style="background:white;padding:24px;border:1px solid #eee">
                        <h3 style="color:#667eea">👤 Student Login Alert</h3>
                        <table style="width:100%;border-collapse:collapse">
                            <tr><td style="padding:6px 0;color:#666;width:40%">Name</td><td style="font-weight:600">${user.fullName}</td></tr>
                            <tr><td style="padding:6px 0;color:#666">Email</td><td>${user.email}</td></tr>
                            <tr><td style="padding:6px 0;color:#666">Role</td><td>${user.role}</td></tr>
                            <tr><td style="padding:6px 0;color:#666">Time</td><td>${new Date().toLocaleString('en-ET', { timeZone: 'Africa/Addis_Ababa' })} (Addis Ababa)</td></tr>
                        </table>
                        <a href="${process.env.CLIENT_URL || 'https://alpha-freshman-tutorial.vercel.app'}/admin-dashboard.html"
                            style="display:inline-block;margin-top:16px;background:#667eea;color:white;
                            padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">
                            View Admin Dashboard →
                        </a>
                    </div>
                    <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:0.78rem;color:#888;border-radius:0 0 8px 8px">
                        © 2026 Alpha Freshman Tutorial
                    </div>
                </div>`
            }).catch(() => {});
        }

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('enrolledCourses.course', 'title icon instructor');

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { fullName, avatar } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { fullName, avatar },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change password
exports.changePassword = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select('+password');

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Forgot password
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No user found with this email'
            });
        }

        // Generate reset token
        const resetToken = user.generateResetToken();
        await user.save();

        // Create reset URL
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        // Send email
        const message = `
            <h1>Password Reset Request</h1>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="${resetUrl}" target="_blank">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset Request',
                html: message
            });

            res.status(200).json({
                success: true,
                message: 'Password reset email sent'
            });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            return res.status(500).json({
                success: false,
                message: 'Email could not be sent'
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Reset password
exports.resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successful'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user
exports.logout = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        next(error);
    }
};
