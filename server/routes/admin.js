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

// ── User management (super_admin only) ───────────────────────────────────────
router.post('/users',                isSuperAdmin,   adminController.createUser);
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

// ── Package assignment (assign enrolled package to a student) ─────────────────
router.put('/users/:id/package',     isAnyAdmin,     async (req, res, next) => {
    try {
        const User = require('../models/User');
        const { enrolledPackage } = req.body;
        const validPackages = ['None', '1st Semester Natural', '1st Semester Social',
                               '2nd Semester Natural', '2nd Semester Social'];
        if (!validPackages.includes(enrolledPackage)) {
            return res.status(400).json({ success: false, message: 'Invalid package' });
        }
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { enrolledPackage },
            { new: true }
        ).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: `Package set to "${enrolledPackage}"`, user });
    } catch (err) { next(err); }
});

// ── Reset device binding (admin only — allows user to login from a new device) ─
router.put('/users/:id/reset-device', isSuperAdmin, async (req, res, next) => {
    try {
        const User = require('../models/User');
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { registeredDeviceId: null },
            { new: true }
        ).select('fullName email phoneNumber registeredDeviceId');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({
            success: true,
            message: `Device binding reset for ${user.fullName}. User can now login from any device once.`,
            user
        });
    } catch (err) { next(err); }
});

// ── Bulk SMS (all admins) ─────────────────────────────────────────────────────
router.post('/send-bulk-sms',        isAnyAdmin,     adminController.sendBulkSMS);

// ── Google Drive Video Links ──────────────────────────────────────────────────
router.post('/videos/link',          isContentAdmin, adminController.saveDriveVideoLink);
router.get('/videos/:courseId',      isContentAdmin, adminController.getCourseVideoLinks);

module.exports = router;
