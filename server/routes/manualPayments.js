const express = require('express');
const router  = express.Router();
const { protect, isAnyAdmin } = require('../middleware/auth');
const {
    submitManualReceipt,
    getPendingReceipts,
    approveReceipt,
    rejectReceipt
} = require('../controllers/manualPaymentController');

// Student: submit a receipt
router.post('/manual-receipt', protect, submitManualReceipt);

// Admin: list receipts (all or by status)
router.get('/manual-pending', protect, isAnyAdmin, getPendingReceipts);

// Admin: approve a receipt
router.put('/manual-receipt/:id/approve', protect, isAnyAdmin, approveReceipt);

// Admin: reject a receipt
router.put('/manual-receipt/:id/reject', protect, isAnyAdmin, rejectReceipt);

module.exports = router;
