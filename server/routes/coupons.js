const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/couponController');

router.get('/',         protect, authorize('admin'), ctrl.getCoupons);
router.post('/',        protect, authorize('admin'), ctrl.createCoupon);
router.put('/:id',      protect, authorize('admin'), ctrl.updateCoupon);
router.delete('/:id',   protect, authorize('admin'), ctrl.deleteCoupon);

module.exports = router;
