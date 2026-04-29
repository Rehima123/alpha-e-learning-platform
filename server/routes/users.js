const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// @route   GET /api/users/leaderboard
// @desc    Get top students by progress
// @access  Public
router.get('/leaderboard', async (req, res, next) => {
    try {
        const users = await User.find({ role: 'student', isActive: true })
            .select('fullName enrolledCourses')
            .lean();

        const ranked = users.map(u => ({
            fullName: u.fullName,
            completedCourses: (u.enrolledCourses || []).filter(e => e.progress >= 100).length,
            points: (u.enrolledCourses || []).reduce((sum, e) => sum + Math.round((e.progress || 0) * 10), 0)
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);

        res.status(200).json({ success: true, users: ranked });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/users/subscription
// @desc    Update user subscription
// @access  Private
router.put('/subscription', protect, async (req, res, next) => {
    try {
        const { plan, trial } = req.body;
        const endDate = new Date();
        
        if (trial) {
            endDate.setDate(endDate.getDate() + 7);
        } else if (plan === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else if (plan === 'annual') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                subscription: {
                    plan: plan || 'free',
                    status: 'active',
                    startDate: new Date(),
                    endDate
                }
            },
            { new: true }
        ).select('-password');

        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
