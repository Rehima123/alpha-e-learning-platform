const mongoose = require('mongoose');

const manualPaymentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    plan: {
        type: String,
        default: null
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'ETB'
    },
    receiptImage: {
        type: String   // base64 data URI or URL
    },
    receiptFileName: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending_verification', 'approved', 'rejected'],
        default: 'pending_verification'
    },
    adminNote: {
        type: String
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewedAt: {
        type: Date
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('ManualPayment', manualPaymentSchema);
