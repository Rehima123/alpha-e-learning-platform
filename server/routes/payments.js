const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

// Student
router.post('/validate-coupon',  protect, ctrl.validateCoupon);
router.post('/initiate',         protect, ctrl.initiateChapaPayment);
router.get('/verify',            ctrl.verifyPayment);           // Chapa return_url
router.post('/chapa-webhook',    ctrl.chapaWebhook);            // Chapa webhook
router.post('/dev-verify',       protect, ctrl.devVerifyPayment); // Dev simulation
router.get('/my-payments',       protect, ctrl.getMyPayments);
router.get('/invoice/:id',       protect, ctrl.getInvoice);

// Admin
router.get('/report',            protect, authorize('admin'), ctrl.getRevenueReport);
router.get('/transactions',      protect, authorize('admin'), ctrl.getAllTransactions);

module.exports = router;
