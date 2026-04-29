const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['student', 'instructor']).withMessage('Invalid role')
], authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
], authController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, authController.getMe);

// @route   PUT /api/auth/update-profile
// @desc    Update user profile
// @access  Private
router.put('/update-profile', protect, authController.updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', protect, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], authController.changePassword);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Please provide a valid email')
], authController.forgotPassword);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post('/reset-password/:token', [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authController.resetPassword);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, authController.logout);

module.exports = router;
