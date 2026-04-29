const Course = require('../models/Course');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get all approved courses
exports.getCourses = async (req, res, next) => {
    try {
        const { category, search, sort } = req.query;

        // Build query
        let query = { status: 'approved', isPublished: true };

        if (category && category !== 'all') {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Execute query
        let courses = Course.find(query).populate('instructor', 'fullName email');

        // Sort
        if (sort === 'rating') {
            courses = courses.sort({ rating: -1 });
        } else if (sort === 'students') {
            courses = courses.sort({ enrolledStudents: -1 });
        } else {
            courses = courses.sort({ createdAt: -1 });
        }

        const result = await courses;

        res.status(200).json({
            success: true,
            count: result.length,
            courses: result
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single course
exports.getCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'fullName email avatar')
            .populate('reviews.user', 'fullName avatar');

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.status(200).json({
            success: true,
            course
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create course
exports.createCourse = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const courseData = {
            ...req.body,
            instructor: req.user.id,
            instructorName: req.user.fullName
        };

        const course = await Course.create(courseData);

        res.status(201).json({
            success: true,
            message: 'Course created successfully and submitted for approval',
            course
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update course
exports.updateCourse = async (req, res, next) => {
    try {
        let course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check ownership
        if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this course'
            });
        }

        course = await Course.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            course
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete course
exports.deleteCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check ownership
        if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this course'
            });
        }

        await course.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add review
exports.addReview = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { rating, comment } = req.body;

        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user already reviewed
        const existingReview = course.reviews.find(
            review => review.user.toString() === req.user.id
        );

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this course'
            });
        }

        // Add review
        course.reviews.push({
            user: req.user.id,
            rating,
            comment
        });

        // Calculate new average rating
        course.calculateAverageRating();

        await course.save();

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            course
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get instructor courses
exports.getInstructorCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({ instructor: req.user.id })
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
