const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const {
    protect,
    isSuperAdmin,
    isAnyAdmin,
    isContentAdmin,
    isFinanceAdmin,
    isSupportAdmin
} = require('../middleware/auth');

// All admin routes require login
router.use(protect);

// ── Stats (all admins can view) ───────────────────────────────────────────────
router.get('/stats', isAnyAdmin, adminController.getStats);

// ── Course management (super_admin + content_admin) ───────────────────────────
router.get('/courses/pending',       isContentAdmin, adminController.getPendingCourses);
router.put('/courses/:id/approve',   isContentAdmin, adminController.approveCourse);
router.put('/courses/:id/reject',    isContentAdmin, adminController.rejectCourse);
router.post('/courses',              isContentAdmin, adminController.createCourse);

// ── User management (super_admin only) ───────────────────────────────────────
router.get('/users',                 isAnyAdmin,     adminController.getAllUsers);
router.put('/users/:id/deactivate',  isSuperAdmin,   adminController.deactivateUser);
router.put('/users/:id/activate',    isSuperAdmin,   adminController.activateUser);
router.put('/users/:id/role',        isSuperAdmin,   adminController.updateUserRole);

// ── Finance (super_admin + finance_admin) ─────────────────────────────────────
router.get('/payments/report',       isFinanceAdmin, adminController.getPaymentsReport);
router.put('/payments/:id/approve',  isFinanceAdmin, adminController.approvePayment);

// ── Support (super_admin + support_admin) ─────────────────────────────────────
router.get('/tickets',               isSupportAdmin, adminController.getTickets);
router.put('/tickets/:id/reply',     isSupportAdmin, adminController.replyTicket);

// ── Enrollment management (super_admin + support_admin) ──────────────────────
router.get('/enrollments',           isAnyAdmin,     adminController.getAllEnrollments);

module.exports = router;
