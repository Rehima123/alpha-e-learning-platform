const express    = require('express');
const router     = express.Router();
const { protect, isInstructor } = require('../middleware/auth');
const ctrl = require('../controllers/instructorController');

// All routes require auth + instructor role
router.use(protect, isInstructor);

// Overview
router.get('/overview',  ctrl.getOverview);

// Courses
router.get('/courses',           ctrl.getMyCourses);
router.post('/courses',          ctrl.createCourse);
router.put('/courses/:id',       ctrl.updateCourse);
router.delete('/courses/:id',    ctrl.deleteCourse);

// Lessons
router.post('/courses/:id/lessons',                 ctrl.addLesson);
router.put('/courses/:id/lessons/:lessonId',        ctrl.updateLesson);
router.delete('/courses/:id/lessons/:lessonId',     ctrl.deleteLesson);

// Payments
router.get('/payments',                    ctrl.getPayments);
router.put('/payments/:id/approve',        ctrl.approvePayment);
router.put('/payments/:id/reject',         ctrl.rejectPayment);

// Students
router.get('/students',                              ctrl.getStudents);
router.put('/students/:enrollmentId/access',         ctrl.toggleAccess);

module.exports = router;
