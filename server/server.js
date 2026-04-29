const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const userRoutes = require('./routes/users');
const enrollmentRoutes = require('./routes/enrollments');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const couponRoutes = require('./routes/coupons');
const aiRoutes    = require('./routes/ai');
const videoRoutes = require('./routes/videos');

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
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl) or matching origins
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

// Static Files
app.use('/uploads', express.static('uploads'));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/videos', videoRoutes);

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
.then(() => {
    console.log('✅ MongoDB Connected Successfully');
    
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
