const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

// GET  /api/subscriptions/me      — current user's subscription status
router.get('/me',     protect, subscriptionController.getMySubscription);

// PUT  /api/subscriptions/cancel  — cancel active subscription
router.put('/cancel', protect, subscriptionController.cancelSubscription);

// PUT  /api/subscriptions/renew   — re-initiate payment for current plan
router.put('/renew',  protect, subscriptionController.renewSubscription);

module.exports = router;
