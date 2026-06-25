const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ── Role permission map ───────────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
    super_admin:     ['*'],                                          // full control
    content_admin:   ['courses.create','courses.edit','videos.upload','pdfs.upload','quizzes.manage'],
    finance_admin:   ['payments.view','payments.approve','payments.refund','coupons.manage','revenue.view'],
    support_admin:   ['students.view','tickets.manage','enrollments.view','messages.reply'],
    instructor:      ['courses.create.own','courses.edit.own','students.own.view'],
    student:         ['courses.view','enrollments.own','progress.own']
};

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please provide your full name'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    role: {
        type: String,
        enum: ['student', 'instructor', 'super_admin', 'content_admin', 'finance_admin', 'support_admin', 'admin'],
        default: 'student'
    },
    avatar: {
        type: String,
        default: null
    },
    enrolledCourses: [{
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        enrolledAt: { type: Date, default: Date.now },
        expiresAt: Date,
        progress: { type: Number, default: 0 },
        completedLessons: [{ type: String }]
    }],
    subscription: {
        plan:   { type: String, enum: ['free', 'monthly', 'annual'], default: 'free' },
        status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
        startDate: Date,
        endDate: Date
    },
    isActive:        { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// ── Hash password before saving ───────────────────────────────────────────────
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ── Compare password ──────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// ── Generate JWT ──────────────────────────────────────────────────────────────
userSchema.methods.generateAuthToken = function() {
    return jwt.sign(
        { id: this._id, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// ── Check permission ──────────────────────────────────────────────────────────
userSchema.methods.hasPermission = function(permission) {
    const perms = ROLE_PERMISSIONS[this.role] || [];
    return perms.includes('*') || perms.includes(permission);
};

// ── Is any kind of admin ──────────────────────────────────────────────────────
userSchema.methods.isAdmin = function() {
    return ['super_admin', 'content_admin', 'finance_admin', 'support_admin', 'admin'].includes(this.role);
};

// ── Generate Password Reset Token ─────────────────────────────────────────────
userSchema.methods.generateResetToken = function() {
    const resetToken = jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    this.resetPasswordToken = resetToken;
    this.resetPasswordExpire = Date.now() + 3600000;
    return resetToken;
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
