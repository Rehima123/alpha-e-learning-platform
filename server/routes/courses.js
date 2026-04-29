const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const courseController = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/courses
// @desc    Get all approved courses
// @access  Public
router.get('/', courseController.getCourses);

// @route   GET /api/courses/instructor/my-courses  ← MUST be before /:id
// @desc    Get instructor's courses
// @access  Private (Instructor)
router.get('/instructor/my-courses', protect, authorize('instructor', 'admin'), courseController.getInstructorCourses);

// @route   GET /api/courses/:id
// @desc    Get single course
// @access  Public
router.get('/:id', courseController.getCourse);

// @route   POST /api/courses
// @desc    Create new course
// @access  Private (Instructor only)
router.post('/', protect, authorize('instructor', 'admin'), [
    body('title').trim().notEmpty().withMessage('Course title is required'),
    body('description').trim().notEmpty().withMessage('Course description is required'),
    body('category').isIn(['semester1', 'semester2', 'natural', 'social']).withMessage('Invalid category'),
    body('price').isNumeric().withMessage('Price must be a number')
], courseController.createCourse);

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (Instructor/Admin)
router.put('/:id', protect, authorize('instructor', 'admin'), courseController.updateCourse);

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (Instructor/Admin)
router.delete('/:id', protect, authorize('instructor', 'admin'), courseController.deleteCourse);

// @route   POST /api/courses/:id/review
// @desc    Add course review
// @access  Private
router.post('/:id/review', protect, [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().trim()
], courseController.addReview);

module.exports = router;
