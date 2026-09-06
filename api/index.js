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
const instructorRoutes    = require('../server/routes/instructor');

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

// ── Seed Admin endpoint ───────────────────────────────────────────────────────
app.get('/api/seed-admin', async (req, res) => {
    const secret = req.query.secret;
    if (secret !== (process.env.SEED_SECRET || 'alpha-seed-2024')) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    try {
        const User     = require('../server/models/User');
        const bcrypt   = require('bcryptjs');
        const email    = req.query.email    || 'supportalphafreshman@gmail.com';
        const name     = req.query.name     || null;
        const newPass  = req.query.password || null;

        const updateFields = { role: 'admin', isActive: true };
        if (name)    updateFields.fullName = name;

        // If a new password is provided, hash it and update
        if (newPass) {
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(newPass, salt);
        }

        const user = await User.findOneAndUpdate(
            { email },
            updateFields,
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ success: false, message: `User not found: ${email}. Register first at /auth-register.html` });
        }
        res.json({
            success: true,
            message: `✅ ${user.fullName} is now ADMIN${newPass ? ' with new password' : ''}`,
            user: { id: user._id, email: user.email, role: user.role, fullName: user.fullName }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Seed Courses endpoint ─────────────────────────────────────────────────────
app.get('/api/seed-courses', async (req, res) => {
    const secret = req.query.secret;
    if (secret !== (process.env.SEED_SECRET || 'alpha-seed-2024')) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    try {
        const Course = require('../server/models/Course');
        const User   = require('../server/models/User');

        const COURSES = [
          // ── SEMESTER 1 — COMMON
          { courseCode:'FLEN1011', title:'Communicative English Language Skills I',   stream:'Common',  semester:1, icon:'📖', category:'semester1', level:'Beginner',     duration:'16 weeks', description:'Develop foundational English communication skills for academic and everyday contexts. Covers reading, writing, listening, and speaking at the freshman level.' },
          { courseCode:'LOCT1011', title:'Logic and Critical Thinking',               stream:'Common',  semester:1, icon:'🧠', category:'semester1', level:'Beginner',     duration:'12 weeks', description:'Master logical reasoning, argument analysis, and problem-solving techniques essential for all academic disciplines in Ethiopian universities.' },
          { courseCode:'HPED1011', title:'Physical Fitness and Health Education',     stream:'Common',  semester:1, icon:'🏃', category:'semester1', level:'Beginner',     duration:'8 weeks',  description:'Physical education, nutrition, mental health, and wellness strategies for academic success and lifelong fitness.' },
          { courseCode:'GEEHO1011',title:'Geography of Ethiopia and the Horn',        stream:'Common',  semester:1, icon:'🌍', category:'semester1', level:'Beginner',     duration:'14 weeks', description:'Physical and human geography of Ethiopia and the Horn of Africa. Covers climate, landforms, ecosystems, population, and socioeconomic development.' },
          // ── SEMESTER 1 — NATURAL
          { courseCode:'MATH1011', title:'Mathematics for Natural Science',           stream:'Natural', semester:1, icon:'📐', category:'semester1', level:'Intermediate', duration:'16 weeks', description:'Covers functions, limits, differentiation, integration, and analytical geometry. Foundation for engineering, medicine, and natural science students.' },
          { courseCode:'PHYS1011', title:'General Physics',                           stream:'Natural', semester:1, icon:'⚛️', category:'semester1', level:'Intermediate', duration:'16 weeks', description:'Mechanics, thermodynamics, waves, and optics. Core physics course for Natural Science stream freshmen.' },
          { courseCode:'CHEM1011', title:'General Chemistry',                         stream:'Natural', semester:1, icon:'⚗️', category:'semester1', level:'Intermediate', duration:'16 weeks', description:'Atomic structure, chemical bonding, reactions, stoichiometry, and thermochemistry for Natural Science stream students.' },
          { courseCode:'PSYC1011', title:'General Psychology and Life Skills',        stream:'Natural', semester:1, icon:'🧩', category:'semester1', level:'Beginner',     duration:'14 weeks', description:'Introduction to psychological principles covering behavior, cognition, emotion, personality, human development, and practical life skills.' },
          // ── SEMESTER 1 — SOCIAL
          { courseCode:'MATH1012', title:'Mathematics for Social Science',            stream:'Social',  semester:1, icon:'📊', category:'semester1', level:'Beginner',     duration:'16 weeks', description:'Sets, functions, linear algebra, matrices, and basic calculus tailored for Social Science stream freshmen.' },
          { courseCode:'ECON1011', title:'Introduction to Economics',                 stream:'Social',  semester:1, icon:'💹', category:'semester1', level:'Beginner',     duration:'14 weeks', description:'Microeconomics and macroeconomics fundamentals. Supply, demand, markets, GDP, inflation, and monetary policy for Social Science freshmen.' },
          { courseCode:'INCL1011', title:'Inclusiveness',                             stream:'Social',  semester:1, icon:'🤝', category:'semester1', level:'Beginner',     duration:'10 weeks', description:'Explore gender, disability, ethnicity, and social inclusion in Ethiopian and global contexts to foster equitable development.' },
          { courseCode:'ANTH1011', title:'Social Anthropology',                       stream:'Social',  semester:1, icon:'🏛️', category:'semester1', level:'Beginner',     duration:'12 weeks', description:"Study human societies, cultures, and social structures. Understand Ethiopia's diverse cultural heritage and anthropological research methods." },
          // ── SEMESTER 2 — COMMON
          { courseCode:'FLEN1012', title:'Communicative English Language Skills II',  stream:'Common',  semester:2, icon:'✍️', category:'semester2', level:'Intermediate', duration:'16 weeks', description:'Advanced academic writing, research skills, and presentation techniques. Builds on Communicative English I.' },
          { courseCode:'MGMT1012', title:'Entrepreneurship',                          stream:'Common',  semester:2, icon:'💡', category:'semester2', level:'Beginner',     duration:'10 weeks', description:'Learn to identify business opportunities, develop ideas, and build an entrepreneurial mindset for the modern Ethiopian and global economy.' },
          { courseCode:'MCED1012', title:'Moral and Civic Education',                 stream:'Common',  semester:2, icon:'⚖️', category:'semester2', level:'Beginner',     duration:'12 weeks', description:"Rights and responsibilities of citizens, democratic governance, constitutional law, and Ethiopia's political system." },
          { courseCode:'GLTR1012', title:'Global Trends',                             stream:'Common',  semester:2, icon:'🌐', category:'semester2', level:'Beginner',     duration:'12 weeks', description:"International organizations, foreign policy, global challenges, sustainable development, and Ethiopia's role in the African Union and world affairs." },
          // ── SEMESTER 2 — NATURAL
          { courseCode:'MATH1021', title:'Applied Mathematics / Calculus',            stream:'Natural', semester:2, icon:'📏', category:'semester2', level:'Advanced',     duration:'16 weeks', description:'Integral calculus, differential equations, linear algebra, and vector calculus for engineering and science majors. Builds on Math 1011.' },
          { courseCode:'BIOL1012', title:'General Biology',                           stream:'Natural', semester:2, icon:'🔬', category:'semester2', level:'Intermediate', duration:'16 weeks', description:'Cell biology, genetics, evolution, ecology, and physiology. Foundation course for Medicine and Natural Science students.' },
          { courseCode:'EMTE1012', title:'Introduction to Emerging Technologies',     stream:'Natural', semester:2, icon:'💻', category:'semester2', level:'Beginner',     duration:'12 weeks', description:'Practical introduction to Artificial Intelligence, Machine Learning, Cloud Computing, Cybersecurity, and the Internet of Things for Natural Science freshmen.' },
          // ── SEMESTER 2 — SOCIAL
          { courseCode:'STAT1012', title:'Basic Statistics',                          stream:'Social',  semester:2, icon:'📈', category:'semester2', level:'Beginner',     duration:'14 weeks', description:'Descriptive and inferential statistics, data collection, probability, frequency distributions, hypothesis testing, and statistical software for Social Science students.' },
        ];

        const admin = await User.findOne({ role: 'admin' });
        if (!admin) return res.status(404).json({ success: false, message: 'No admin found. Create admin first via /api/seed-admin' });

        // Delete previously seeded courses only
        await Course.deleteMany({ courseCode: { $exists: true, $ne: null } });

        let count = 0;
        for (const c of COURSES) {
            const isPremium = true;
            await Course.create({
                ...c,
                price:          1000,
                isPremium,
                isLocked:       true,
                isFreePreview:  true,
                isPublished:    true,
                status:         'approved',
                instructor:     admin._id,
                instructorName: admin.fullName || 'Alpha Freshman Tutorial',
                department:     c.stream === 'Common'  ? `Semester ${c.semester} – Common` :
                                c.stream === 'Natural' ? `Semester ${c.semester} – Natural Science` :
                                                        `Semester ${c.semester} – Social Science`,
                videos:    [],
                chapters:  [],
                totalLessons: 0
            });
            count++;
        }

        res.json({
            success: true,
            message: `✅ Seeded ${count} courses successfully!`,
            breakdown: {
                semester1: COURSES.filter(c => c.semester === 1).length,
                semester2: COURSES.filter(c => c.semester === 2).length,
                common:    COURSES.filter(c => c.stream === 'Common').length,
                natural:   COURSES.filter(c => c.stream === 'Natural').length,
                social:    COURSES.filter(c => c.stream === 'Social').length,
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
app.get('/api/test-email', async (req, res) => {
    const secret = req.query.secret;
    if (secret !== (process.env.SEED_SECRET || 'alpha-seed-2024')) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { sendEmail } = require('../server/utils/sendEmail');
    const to = req.query.to || process.env.OWNER_EMAIL || process.env.SMTP_USER;
    if (!to) return res.status(400).json({ success: false, message: 'No recipient. Set OWNER_EMAIL env var.' });

    const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS) || !!process.env.RESEND_API_KEY;

    try {
        await sendEmail({
            to,
            subject: '✅ Alpha Freshman Tutorial — SMTP Test',
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
                <h2 style="color:#667eea">✅ SMTP is working!</h2>
                <p>This is a test email from Alpha Freshman Tutorial.</p>
                <p><strong>SMTP_USER:</strong> ${process.env.SMTP_USER || 'NOT SET ❌'}</p>
                <p><strong>SMTP configured:</strong> ${smtpConfigured ? 'YES ✅' : 'NO ❌'}</p>
                <p><strong>NODE_ENV:</strong> ${process.env.NODE_ENV || 'not set'}</p>
                <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            </div>`
        });
        res.json({ success: true, message: `Test email sent to ${to}`, smtpConfigured });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: `Email failed: ${err.message}`,
            smtpConfigured,
            smtpUser: process.env.SMTP_USER ? '✅ set' : '❌ NOT SET',
            smtpPass: process.env.SMTP_PASS ? '✅ set' : '❌ NOT SET',
            hint: 'Check SMTP_USER and SMTP_PASS in Vercel env vars, then Redeploy'
        });
    }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);

// ── INLINE routes that must come BEFORE course router (specific before general) ─
// Feature 3: Secure video token
const videoTokenHandler = require('./video-token');
app.get('/api/courses/video-token/:lessonId', videoTokenHandler);

// Per-user course access check (must be before /api/courses router)
app.get('/api/courses/:courseId/access', async (req, res) => {
    try {
        const Course      = require('../server/models/Course');
        const Enrollment  = require('../server/models/Enrollment');
        const User        = require('../server/models/User');
        const jwt         = require('jsonwebtoken');

        const { courseId } = req.params;

        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
                userId = decoded.id;
            } catch (_) {}
        }

        const course = await Course.findById(courseId).select('isPremium isLocked price');
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        // Free course — always accessible
        if (!course.isPremium || course.price === 0 || course.isLocked === false) {
            return res.json({ success: true, hasAccess: true, reason: 'free' });
        }

        if (!userId) return res.json({ success: true, hasAccess: false, reason: 'login_required' });

        // Check approved enrollment
        const enrollment = await Enrollment.findOne({ student: userId, course: courseId });
        if (enrollment && enrollment.status === 'approved') {
            return res.json({ success: true, hasAccess: true, reason: 'enrolled' });
        }

        // Check active subscription
        const user = await User.findById(userId).select('subscription');
        if (user && ['monthly', 'annual'].includes(user.subscription?.plan) && user.subscription?.status === 'active') {
            return res.json({ success: true, hasAccess: true, reason: 'subscription' });
        }

        return res.json({ success: true, hasAccess: false, reason: enrollment ? enrollment.status : 'not_enrolled' });
    } catch (err) {
        console.error('Access check error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to check access' });
    }
});

app.use('/api/courses',     courseRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/payments',    manualPaymentRoutes);  // manual receipt routes first
app.use('/api/payments',    paymentRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/coupons',     couponRoutes);
app.use('/api/ai',          aiRoutes);
app.use('/api/videos',      videoRoutes);
app.use('/api/instructor',  instructorRoutes);

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
    if (isConnected && mongoose.connection.readyState === 1) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false,
            maxPoolSize: 5,          // low pool for serverless
            minPoolSize: 1,
            socketTimeoutMS: 8000,
            serverSelectionTimeoutMS: 5000,
            heartbeatFrequencyMS: 30000
        });
        isConnected = true;
        console.log('✅ MongoDB connected');
    } catch (err) {
        isConnected = false;
        console.error('❌ MongoDB error:', err.message);
        throw err;
    }
}

// ── Vercel serverless handler ─────────────────────────────────────────────────
module.exports = async (req, res) => {
    await connectDB();
    return app(req, res);
};
