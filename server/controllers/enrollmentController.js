const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const { sendEmail, templates } = require('../utils/sendEmail');

// ── Student: request enrollment ───────────────────────────────────────────────
exports.requestEnrollment = async (req, res, next) => {
    try {
        const { courseId } = req.body;

        const course = await Course.findById(courseId);
        if (!course || !course.isPublished) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const existing = await Enrollment.findOne({ student: req.user._id, course: courseId });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.status === 'approved'
                    ? 'Already enrolled'
                    : `Enrollment request is ${existing.status}`
            });
        }

        const enrollment = await Enrollment.create({ student: req.user._id, course: courseId });

        res.status(201).json({
            success: true,
            message: 'Enrollment request submitted. Waiting for admin approval.',
            enrollment
        });
    } catch (error) {
        next(error);
    }
};

// ── Student: get my enrollments ───────────────────────────────────────────────
exports.getMyEnrollments = async (req, res, next) => {
    try {
        const enrollments = await Enrollment.find({ student: req.user._id })
            .populate('course', 'title description icon category level duration price rating enrolledStudents instructorName isPremium isFreePreview totalLessons lessons')
            .sort({ requestedAt: -1 });

        res.status(200).json({ success: true, enrollments });
    } catch (error) {
        next(error);
    }
};

// ── Student: update progress ──────────────────────────────────────────────────
exports.updateProgress = async (req, res, next) => {
    try {
        const enrollment = await Enrollment.findOne({
            _id: req.params.enrollmentId,
            student: req.user._id,
            status: 'approved'
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        const { progress, completedLessons } = req.body;
        if (progress !== undefined) enrollment.progress = progress;
        if (completedLessons)       enrollment.completedLessons = completedLessons;
        await enrollment.save();

        res.status(200).json({ success: true, enrollment });
    } catch (error) {
        next(error);
    }
};

// ── Admin: get all pending requests ──────────────────────────────────────────
exports.getPendingRequests = async (req, res, next) => {
    try {
        const requests = await Enrollment.find({ status: 'pending' })
            .populate('student', 'fullName email')
            .populate('course', 'title icon category')
            .sort({ requestedAt: -1 });

        res.status(200).json({ success: true, count: requests.length, requests });
    } catch (error) {
        next(error);
    }
};

// ── Admin: get all enrollments ────────────────────────────────────────────────
exports.getAllEnrollments = async (req, res, next) => {
    try {
        const enrollments = await Enrollment.find()
            .populate('student', 'fullName email')
            .populate('course', 'title icon category')
            .sort({ requestedAt: -1 });

        res.status(200).json({ success: true, count: enrollments.length, enrollments });
    } catch (error) {
        next(error);
    }
};

// ── Admin: approve enrollment ─────────────────────────────────────────────────
exports.approveEnrollment = async (req, res, next) => {
    try {
        const enrollment = await Enrollment.findByIdAndUpdate(
            req.params.id,
            { status: 'approved', reviewedAt: new Date(), reviewedBy: req.user._id },
            { new: true }
        ).populate('student', 'fullName email').populate('course', 'title icon category');

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        // Increment course enrolled count
        await Course.findByIdAndUpdate(enrollment.course._id, { $inc: { enrolledStudents: 1 } });

        // Send approval email
        try {
            const emailData = templates.enrollmentApproved(enrollment.student, enrollment.course);
            await sendEmail({ to: enrollment.student.email, ...emailData });
        } catch (e) { console.error('Email failed:', e.message); }

        res.status(200).json({ success: true, message: 'Enrollment approved', enrollment });
    } catch (error) {
        next(error);
    }
};

// ── Admin: reject enrollment ──────────────────────────────────────────────────
exports.rejectEnrollment = async (req, res, next) => {
    try {
        const enrollment = await Enrollment.findByIdAndUpdate(
            req.params.id,
            {
                status: 'rejected',
                reviewedAt: new Date(),
                reviewedBy: req.user._id,
                rejectReason: req.body.reason || 'Not specified'
            },
            { new: true }
        ).populate('student', 'fullName email').populate('course', 'title icon category');

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        // Send rejection email
        try {
            const emailData = templates.enrollmentRejected(enrollment.student, enrollment.course, enrollment.rejectReason);
            await sendEmail({ to: enrollment.student.email, ...emailData });
        } catch (e) { console.error('Email failed:', e.message); }

        res.status(200).json({ success: true, message: 'Enrollment rejected', enrollment });
    } catch (error) {
        next(error);
    }
};
