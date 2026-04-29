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
