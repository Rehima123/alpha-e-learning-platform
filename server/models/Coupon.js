const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    type:        { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    value:       { type: Number, required: true },   // % or fixed ETB amount
    minAmount:   { type: Number, default: 0 },
    maxUses:     { type: Number, default: null },     // null = unlimited
    usedCount:   { type: Number, default: 0 },
    usedBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    applicableTo: {
        type: String,
        enum: ['all', 'subscription', 'course'],
        default: 'all'
    },
    courses:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    isActive:    { type: Boolean, default: true },
    expiresAt:   { type: Date }
}, { timestamps: true });

couponSchema.methods.isValid = function(userId, amount) {
    if (!this.isActive) return { valid: false, reason: 'Coupon is inactive' };
    if (this.expiresAt && new Date() > this.expiresAt) return { valid: false, reason: 'Coupon has expired' };
    if (this.maxUses && this.usedCount >= this.maxUses) return { valid: false, reason: 'Coupon usage limit reached' };
    if (this.usedBy.includes(userId)) return { valid: false, reason: 'You have already used this coupon' };
    if (amount < this.minAmount) return { valid: false, reason: `Minimum order amount is ${this.minAmount} ETB` };
    return { valid: true };
};

couponSchema.methods.calculateDiscount = function(amount) {
    if (this.type === 'percent') return Math.round(amount * this.value / 100);
    return Math.min(this.value, amount);
};

module.exports = mongoose.model('Coupon', couponSchema);
