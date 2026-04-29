const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin authorization
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/courses/pending
// @desc    Get pending courses
// @access  Private (Admin)
router.get('/courses/pending', adminController.getPendingCourses);

// @route   PUT /api/admin/courses/:id/approve
// @desc    Approve course
// @access  Private (Admin)
router.put('/courses/:id/approve', adminController.approveCourse);

// @route   PUT /api/admin/courses/:id/reject
// @desc    Reject course
// @access  Private (Admin)
router.put('/courses/:id/reject', adminController.rejectCourse);

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', adminController.getAllUsers);

// @route   PUT /api/admin/users/:id/deactivate
// @desc    Deactivate user
// @access  Private (Admin)
router.put('/users/:id/deactivate', adminController.deactivateUser);

// @route   PUT /api/admin/users/:id/activate
// @desc    Activate user
// @access  Private (Admin)
router.put('/users/:id/activate', adminController.activateUser);

// @route   GET /api/admin/stats
// @desc    Get platform statistics
// @access  Private (Admin)
router.get('/stats', adminController.getStats);

module.exports = router;
