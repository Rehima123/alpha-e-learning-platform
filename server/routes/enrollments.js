const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/enrollmentController');

// Student routes
router.post('/',                    protect, ctrl.requestEnrollment);
router.get('/my-enrollments',       protect, ctrl.getMyEnrollments);
router.put('/:enrollmentId/progress', protect, ctrl.updateProgress);

// Admin routes
router.get('/pending',              protect, authorize('admin'), ctrl.getPendingRequests);
router.get('/all',                  protect, authorize('admin'), ctrl.getAllEnrollments);
router.put('/:id/approve',          protect, authorize('admin'), ctrl.approveEnrollment);
router.put('/:id/reject',           protect, authorize('admin'), ctrl.rejectEnrollment);

module.exports = router;
