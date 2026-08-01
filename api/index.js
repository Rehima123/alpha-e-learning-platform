// Vercel Serverless Function — Express Backend
// This file serves the entire Node.js backend as a Vercel API function

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: './server/.env' });

// Import routes
const authRoutes          = require('../server/routes/auth');
const courseRoutes        = require('../server/routes/courses');
const userRoutes          = require('../server/routes/users');
const enrollmentRoutes    = require('../server/routes/enrollments');
const paymentRoutes       = require('../server/routes/payments');
const adminRoutes         = require('../server/routes/admin');
const couponRoutes        = require('../server/routes/coupons');
const aiRoutes            = require('../server/routes/ai');
const videoRoutes         = require('../server/routes/videos');
const manualPaymentRoutes = require('../server/routes/manualPayments');

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: [
        'https://alpha-freshman-tutorial.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
        ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])
    ],
    credentials: true
}));

// ── Body Parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/courses',     courseRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/payments',    manualPaymentRoutes);  // manual receipt routes first
app.use('/api/payments',    paymentRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/coupons',     couponRoutes);
app.use('/api/ai',          aiRoutes);
app.use('/api/videos',      videoRoutes);

// ── Per-user course access check ──────────────────────────────────────────────
app.get('/api/courses/:courseId/access', async (req, res) => {
    try {
        const Course      = require('../server/models/Course');
        const Enrollment  = require('../server/models/Enrollment');
        const jwt         = require('jsonwebtoken');

        const { courseId } = req.params;

        // Authenticate user (optional — unauthenticated gets false for locked)
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
                userId = decoded.id;
            } catch (_) { /* invalid token — treat as unauthenticated */ }
        }

        const course = await Course.findById(courseId).select('isPremium isLocked price');
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Free course — always accessible
        if (!course.isPremium || course.price === 0 || course.isLocked === false) {
            return res.json({ success: true, hasAccess: true, reason: 'free' });
        }

        // User not logged in — no access to locked course
        if (!userId) {
            return res.json({ success: true, hasAccess: false, reason: 'login_required' });
        }

        // Check approved enrollment
        const enrollment = await Enrollment.findOne({ student: userId, course: courseId });
        if (enrollment && enrollment.status === 'approved') {
            return res.json({ success: true, hasAccess: true, reason: 'enrolled' });
        }

        // Check active subscription on user object
        const User = require('../server/models/User');
        const user = await User.findById(userId).select('subscription');
        if (user && ['monthly', 'annual'].includes(user.subscription?.plan)) {
            return res.json({ success: true, hasAccess: true, reason: 'subscription' });
        }

        return res.json({
            success: true,
            hasAccess: false,
            reason: enrollment ? enrollment.status : 'not_enrolled'
        });
    } catch (err) {
        console.error('Access check error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to check access' });
    }
});

// ── Admin: toggle course lock status ─────────────────────────────────────────
app.put('/api/admin/courses/:courseId/toggle-lock', async (req, res) => {
    try {
        const jwt    = require('jsonwebtoken');
        const Course = require('../server/models/Course');

        // Auth
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
        if (!['admin','super_admin','content_admin'].includes(decoded.role)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        course.isLocked = !course.isLocked;
        await course.save();

        res.json({ success: true, isLocked: course.isLocked, message: `Course ${course.isLocked ? 'locked' : 'unlocked'}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Admin: get all courses (for course management tab) ────────────────────────
app.get('/api/admin/all-courses', async (req, res) => {
    try {
        const jwt    = require('jsonwebtoken');
        const Course = require('../server/models/Course');

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
        if (!['admin','super_admin','content_admin'].includes(decoded.role)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const courses = await Course.find({}).sort({ createdAt: -1 });
        res.json({ success: true, courses });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Admin: get enrolled students for a course ─────────────────────────────────
app.get('/api/admin/courses/:courseId/students', async (req, res) => {
    try {
        const jwt        = require('jsonwebtoken');
        const Enrollment = require('../server/models/Enrollment');

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
        if (!['admin','super_admin','content_admin','support_admin'].includes(decoded.role)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const enrollments = await Enrollment.find({ course: req.params.courseId })
            .populate('student', 'fullName email')
            .sort({ requestedAt: -1 });

        res.json({ success: true, enrollments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use('/api/', (req, res) => {
    res.status(404).json({ success: false, message: 'API route not found' });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// ── MongoDB Connection (cached for serverless) ────────────────────────────────
let isConnected = false;

async function connectDB() {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000
        });
        isConnected = true;
        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB error:', err.message);
        throw err;
    }
}

// ── Vercel serverless handler ─────────────────────────────────────────────────
module.exports = async (req, res) => {
    await connectDB();
    return app(req, res);
};
