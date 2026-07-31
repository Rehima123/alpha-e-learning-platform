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
const authRoutes       = require('../server/routes/auth');
const courseRoutes     = require('../server/routes/courses');
const userRoutes       = require('../server/routes/users');
const enrollmentRoutes = require('../server/routes/enrollments');
const paymentRoutes    = require('../server/routes/payments');
const adminRoutes      = require('../server/routes/admin');
const couponRoutes     = require('../server/routes/coupons');
const aiRoutes         = require('../server/routes/ai');
const videoRoutes      = require('../server/routes/videos');

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
app.use('/api/payments',    paymentRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/coupons',     couponRoutes);
app.use('/api/ai',          aiRoutes);
app.use('/api/videos',      videoRoutes);

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
