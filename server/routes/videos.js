const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Course  = require('../models/Course');

// PUT /api/videos/lesson — admin sets YouTube URL for a lesson
router.put('/lesson', protect, authorize('admin'), async (req, res, next) => {
    try {
        const { courseId, chapterIdx, lessonIdx, videoUrl } = req.body;

        // Validate YouTube URL
        const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}/;
        if (videoUrl && !ytRegex.test(videoUrl)) {
            return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        // Update chapter lesson
        if (course.chapters?.[chapterIdx]?.lessons?.[lessonIdx]) {
            course.chapters[chapterIdx].lessons[lessonIdx].videoUrl = videoUrl || '';
            course.markModified('chapters');
        }
        // Also update flat lessons array if exists
        if (course.lessons?.[lessonIdx]) {
            course.lessons[lessonIdx].videoUrl = videoUrl || '';
            course.markModified('lessons');
        }

        await course.save();
        res.json({ success: true, message: 'Video URL updated' });
    } catch (error) { next(error); }
});

// GET /api/videos/course/:id — get all video URLs for a course (admin only)
router.get('/course/:id', protect, authorize('admin'), async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id).select('title chapters lessons');
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
        res.json({ success: true, course });
    } catch (error) { next(error); }
});

module.exports = router;
