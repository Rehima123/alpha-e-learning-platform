const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

// ── Support/admin email — always gets role: "admin" ──────────────────────────
const ADMIN_EMAIL = 'supportalphafreshman@gmail.com';

// ── Role permission map ───────────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
    super_admin:   ['*'],
    admin:         ['*'],
    content_admin: ['courses.create','courses.edit','videos.upload','pdfs.upload','quizzes.manage'],
    finance_admin: ['payments.view','payments.approve','payments.refund','coupons.manage','revenue.view'],
    support_admin: ['students.view','tickets.manage','enrollments.view','messages.reply'],
    instructor:    ['courses.create.own','courses.edit.own','students.own.view'],
    student:       ['courses.view','enrollments.own','progress.own']
};

const userSchema = new mongoose.Schema({
    // ── Firebase UID (set when user authenticates via Google/Firebase) ─────────
    firebaseUid: {
        type:   String,
        unique: true,
        sparse: true,   // allows null/undefined for password-based users
        trim:   true
    },

    fullName: {
        type:      String,
        required:  [true, 'Please provide your full name'],
        trim:      true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },

    email: {
        type:      String,
        required:  false,
        unique:    true,
        sparse:    true,    // allows phone-only users
        lowercase: true,
        trim:      true,
        match:     [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },

    phoneNumber: {
        type:   String,
        unique: true,
        sparse: true,
        trim:   true,
        default: '',
        match:  [/^\+?[\d\s\-]{7,15}$/, 'Please provide a valid phone number']
    },

    educationLevel: { type: String, trim: true, default: null },

    password: {
        type:      String,
        minlength: [6, 'Password must be at least 6 characters'],
        select:    false  // never returned in queries unless explicitly requested
    },

    // ── Role: supportalphafreshman@gmail.com always forces "admin" ─────────────
    role: {
        type:    String,
        enum:    ['student', 'instructor', 'admin', 'super_admin',
                  'content_admin', 'finance_admin', 'support_admin'],
        default: 'student'
    },

    avatar: { type: String, default: null },

    // ── isApproved: admin can suspend accounts ────────────────────────────────
    isApproved: { type: Boolean, default: true },
    isActive:   { type: Boolean, default: true },

    enrolledCourses: [{
        course:           { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        enrolledAt:       { type: Date, default: Date.now },
        expiresAt:        Date,
        progress:         { type: Number, default: 0 },
        completedLessons: [{ type: String }]
    }],

    subscription: {
        plan:      { type: String, enum: ['free','monthly','annual'], default: 'free' },
        status:    { type: String, enum: ['active','expired','cancelled'], default: 'active' },
        startDate: Date,
        endDate:   Date
    },

    isEmailVerified:    { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // ── Single-device session enforcement ─────────────────────────────────────
    currentSessionToken: { type: String, default: null, select: false },
    lastLoginAt:         { type: Date,   default: null },
    lastLoginIP:         { type: String, default: null }

}, { timestamps: true });   // adds createdAt + updatedAt automatically

// ── Pre-validate: require email OR phoneNumber ────────────────────────────────
userSchema.pre('validate', function (next) {
    if (!this.email && !this.phoneNumber && !this.firebaseUid) {
        this.invalidate('email', 'Either email, phone number, or Firebase UID is required');
    }
    next();
});

// ── Pre-save: force admin role for support email ──────────────────────────────
userSchema.pre('save', function (next) {
    if (this.email && this.email.toLowerCase() === ADMIN_EMAIL) {
        this.role = 'admin';
    }
    next();
});

// ── Pre-save: hash password ───────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt   = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ── Instance: compare password ────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (entered) {
    return bcrypt.compare(entered, this.password);
};

// ── Instance: generate JWT with optional session ID ──────────────────────────
userSchema.methods.generateAuthToken = function (sessionId) {
    const sid = sessionId || require('crypto').randomBytes(16).toString('hex');
    return jwt.sign(
        { id: this._id, role: this.role, sid },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
};

// ── Instance: check named permission ─────────────────────────────────────────
userSchema.methods.hasPermission = function (permission) {
    const perms = ROLE_PERMISSIONS[this.role] || [];
    return perms.includes('*') || perms.includes(permission);
};

// ── Instance: is any kind of admin ───────────────────────────────────────────
userSchema.methods.isAdminUser = function () {
    return ['admin','super_admin','content_admin',
            'finance_admin','support_admin'].includes(this.role);
};

// ── Instance: generate password reset token ──────────────────────────────────
userSchema.methods.generateResetToken = function () {
    const token = jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    this.resetPasswordToken  = token;
    this.resetPasswordExpire = Date.now() + 3_600_000; // 1 hour
    return token;
};

module.exports = mongoose.model('User', userSchema);
module.exports.ADMIN_EMAIL      = ADMIN_EMAIL;
module.exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
