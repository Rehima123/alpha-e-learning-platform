const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    type: {
        type: String,
        enum: ['course', 'subscription'],
        required: true
    },
    plan: { type: String, enum: ['monthly', 'annual', 'course'], default: 'course' },

    // Amounts
    subtotal:    { type: Number, required: true },
    discount:    { type: Number, default: 0 },
    tax:         { type: Number, default: 0 },
    total:       { type: Number, required: true },
    currency:    { type: String, default: 'ETB' },

    // Chapa / Stripe
    provider:    { type: String, enum: ['chapa', 'stripe', 'manual'], default: 'chapa' },
    txRef:       { type: String, unique: true },   // Chapa tx_ref
    providerRef: { type: String },                 // Chapa/Stripe charge id
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'refunded'],
        default: 'pending'
    },

    // Discount code used
    couponCode:  { type: String },
    couponId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },

    // Instructor revenue share
    instructorShare: { type: Number, default: 0 },
    platformShare:   { type: Number, default: 0 },

    invoiceNumber: { type: String, unique: true, sparse: true },
    paidAt:        { type: Date },
    refundedAt:    { type: Date },
    refundReason:  { type: String },

    metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Auto-generate invoice number
paymentSchema.pre('save', async function(next) {
    if (!this.invoiceNumber && this.status === 'success') {
        const count = await mongoose.model('Payment').countDocuments({ status: 'success' });
        this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
        this.paidAt = new Date();
    }
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);
