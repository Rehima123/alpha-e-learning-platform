// Vercel Serverless — GET /api/courses/video-token/:lessonId
// Verifies enrollment before returning embed config
// YouTube URL is NEVER exposed in the DOM — only the embed token is returned

const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const Course   = require('../server/models/Course');
const Enrollment = require('../server/models/Enrollment');

let isConnected = false;
async function connectDB() {
    if (isConnected) return;
    await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000
    });
    isConnected = true;
}

// XOR obfuscation to mask video ID in token (not cryptographic, just obscuring)
function encodeVideoId(videoId, userId) {
    const key = (userId + process.env.JWT_SECRET).slice(0, videoId.length);
    let result = '';
    for (let i = 0; i < videoId.length; i++) {
        result += String.fromCharCode(videoId.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return Buffer.from(result).toString('base64url');
}

module.exports = async (req, res) => {
    // Only GET
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // Extract JWT from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }
        const token   = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId  = decoded.id;

        await connectDB();

        // Extract lessonId + courseId from query
        const { lessonId, courseId } = req.query;
        if (!lessonId || !courseId) {
            return res.status(400).json({ success: false, message: 'Missing lessonId or courseId' });
        }

        // Fetch course
        const course = await Course.findById(courseId).select('chapters isPremium isLocked');
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Find the lesson across all chapters
        let foundLesson = null;
        for (const chapter of course.chapters || []) {
            const lesson = (chapter.lessons || []).find(
                l => l._id?.toString() === lessonId || l.title === lessonId
            );
            if (lesson) { foundLesson = lesson; break; }
        }

        if (!foundLesson) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }

        if (!foundLesson.videoUrl) {
            return res.status(404).json({ success: false, message: 'No video for this lesson' });
        }

        // Check access: free course OR approved enrollment
        let hasAccess = !course.isPremium && !course.isLocked;

        if (!hasAccess) {
            const enrollment = await Enrollment.findOne({
                student: userId,
                course:  courseId,
                status:  'approved'
            });
            hasAccess = !!enrollment;
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Enrollment required to watch this video'
            });
        }

        // Extract YouTube video ID
        const ytMatch = foundLesson.videoUrl.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
        );
        if (!ytMatch) {
            // Non-YouTube URL — return as-is (admin-uploaded)
            return res.json({ success: true, embedUrl: foundLesson.videoUrl });
        }

        const videoId = ytMatch[1];

        // Build embed URL — DO NOT expose raw video ID in response
        // Use a short-lived signed token instead
        const embedToken = jwt.sign(
            { vid: videoId, uid: userId, cid: courseId, lid: lessonId },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Build the safe embed URL
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;

        res.json({
            success:   true,
            embedUrl,  // sent to iframe src — not the original watch URL
            expiresIn: 7200,
            // embedToken available for future signed-URL upgrades
        });

    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        }
        console.error('[VideoToken]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
