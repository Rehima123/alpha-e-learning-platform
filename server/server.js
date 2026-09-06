const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const path = require('path');

// Import routes
const authRoutes         = require('./routes/auth');
const courseRoutes       = require('./routes/courses');
const userRoutes         = require('./routes/users');
const enrollmentRoutes   = require('./routes/enrollments');
const paymentRoutes      = require('./routes/payments');
const adminRoutes        = require('./routes/admin');
const couponRoutes       = require('./routes/coupons');
const aiRoutes           = require('./routes/ai');
const videoRoutes        = require('./routes/videos');
const subscriptionRoutes    = require('./routes/subscriptions');
const uploadRoutes          = require('./routes/upload');
const instructorRoutes      = require('./routes/instructor');
const manualPaymentRoutes   = require('./routes/manualPayments');

const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc:  ["'self'", "'unsafe-inline'"],  // needed for inline scripts
            styleSrc:   ["'self'", "'unsafe-inline'"],
            imgSrc:     ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.chapa.co"],
            fontSrc:    ["'self'", "https:"],
            objectSrc:  ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false  // needed for fonts/images
}));

// CORS Configuration — lock down for production
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://alpha-freshman-tutorial.vercel.app',
    ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(o => o.trim()) : [])
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('CORS: origin not allowed'));
        }
    },
    credentials: true
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Rate Limiting — general
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { success: false, message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 10,                    // max 10 login attempts per 15 min
    message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Static Files — serve uploaded files publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// ── Test email endpoint (remove after confirming SMTP works) ──────────────────
app.get('/api/test-email', async (req, res) => {
    const secret = req.query.secret;
    if (secret !== (process.env.SEED_SECRET || 'alpha-seed-2024')) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { sendEmail } = require('./utils/sendEmail');
    const to = req.query.to || process.env.OWNER_EMAIL || process.env.SMTP_USER;
    if (!to) return res.status(400).json({ success: false, message: 'No recipient — set OWNER_EMAIL env var' });

    const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS) || !!process.env.RESEND_API_KEY;

    try {
        await sendEmail({
            to,
            subject: '✅ Alpha Freshman Tutorial — Email Test',
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
                <h2 style="color:#667eea">✅ SMTP is working!</h2>
                <p>This is a test email from Alpha Freshman Tutorial backend.</p>
                <p><strong>SMTP_USER:</strong> ${process.env.SMTP_USER || 'NOT SET'}</p>
                <p><strong>SMTP configured:</strong> ${smtpConfigured ? 'YES ✅' : 'NO ❌'}</p>
                <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            </div>`
        });
        res.json({ success: true, message: `Test email sent to ${to}`, smtpConfigured });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: `Email failed: ${err.message}`,
            smtpConfigured,
            hint: 'Check SMTP_USER and SMTP_PASS in Vercel environment variables'
        });
    }
});

// API Routes
app.use('/api/auth',          authRoutes);
app.use('/api/courses',       courseRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/enrollments',   enrollmentRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/coupons',       couponRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/videos',        videoRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/upload',        uploadRoutes);
app.use('/api/payments',      manualPaymentRoutes);
app.use('/api/instructor',    instructorRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('✅ MongoDB Connected Successfully');

    // ── Fix: drop the old non-sparse phoneNumber index if it exists ──────────
    // The old index included empty strings "" which caused E11000 duplicate key
    // errors when multiple users registered without a phone number.
    // The User model now defines phoneNumber as sparse:true (no default:'')
    // so we just need to make sure the old bad index is gone.
    try {
        const db = mongoose.connection.db;
        const indexes = await db.collection('users').indexes();
        const badIdx = indexes.find(i =>
            i.name === 'phoneNumber_1' && !i.sparse
        );
        if (badIdx) {
            await db.collection('users').dropIndex('phoneNumber_1');
            console.log('✅ Dropped old non-sparse phoneNumber_1 index');
        }
    } catch (idxErr) {
        // Index may not exist yet — that's fine
        console.log('[startup] phoneNumber index check:', idxErr.message);
    }

    // Start Server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
})
.catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
});

// Handle Unhandled Promise Rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err.message);
    process.exit(1);
});

module.exports = app;
