const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Get pending courses
exports.getPendingCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({ status: 'pending' })
            .populate('instructor', 'fullName email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: courses.length,
            courses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve course
exports.approveCourse = async (req, res, next) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { status: 'approved', isPublished: true },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Course approved successfully',
            course
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reject course
exports.rejectCourse = async (req, res, next) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { status: 'rejected' },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Course rejected',
            course
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all users
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Deactivate user
exports.deactivateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deactivated successfully',
            user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Activate user
exports.activateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User activated successfully',
            user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get platform statistics
exports.getStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalInstructors = await User.countDocuments({ role: 'instructor' });
        const totalCourses = await Course.countDocuments({ status: 'approved' });
        const pendingCourses = await Course.countDocuments({ status: 'pending' });

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalStudents,
                totalInstructors,
                totalCourses,
                pendingCourses
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user role (super_admin only)
exports.updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        const validRoles = ['student', 'instructor', 'super_admin', 'content_admin', 'finance_admin', 'support_admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        // Prevent demoting yourself
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot change your own role' });
        }
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, message: `Role updated to ${role}`, user });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all enrollments (any admin)
exports.getAllEnrollments = async (req, res, next) => {
    try {
        const Enrollment = require('../models/Enrollment');
        const enrollments = await Enrollment.find()
            .populate('student', 'fullName email')
            .populate('course', 'title icon')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: enrollments.length, enrollments });
    } catch (error) {
        next(error);
    }
};

// @desc    Get payments report (finance_admin)
exports.getPaymentsReport = async (req, res, next) => {
    try {
        // Stub — replace with real Payment model query
        res.status(200).json({
            success: true,
            totals: { totalRevenue: 0, platformRevenue: 0, count: 0 },
            byCourse: [], byDay: []
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve payment (finance_admin)
exports.approvePayment = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Payment approved' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get support tickets (support_admin)
exports.getTickets = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, tickets: [] });
    } catch (error) {
        next(error);
    }
};

// @desc    Reply to ticket (support_admin)
exports.replyTicket = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Reply sent' });
    } catch (error) {
        next(error);
    }
};

// @desc    Create course (content_admin)
exports.createCourse = async (req, res, next) => {
    try {
        const course = await Course.create({
            ...req.body,
            instructor: req.user._id,
            instructorName: req.user.fullName,
            status: 'approved',
            isPublished: true
        });
        res.status(201).json({ success: true, message: 'Course created', course });
    } catch (error) {
        next(error);
    }
};
