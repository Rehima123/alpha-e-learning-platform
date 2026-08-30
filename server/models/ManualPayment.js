const mongoose = require('mongoose');

// Accepts both MongoDB ObjectId AND Firebase UID strings
const studentField = {
    type: mongoose.Schema.Types.Mixed,  // Mixed = accepts ObjectId or string
    required: true,
    validate: {
        validator: (v) => v != null && String(v).length > 0,
        message: 'student ID is required'
    }
};

const manualPaymentSchema = new mongoose.Schema({
    student:  studentField,
    course: {
        type: mongoose.Schema.Types.Mixed,  // also Mixed to handle firebase user's course refs
        ref: 'Course',
        default: null
    },
    plan: {
        type: String,
        default: null
    },
    amount: {
        type: Number,
        required: true,
        default: 0
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
    // Student info snapshot (for Firebase users who may not be in User collection)
    studentName:  { type: String, default: '' },
    studentEmail: { type: String, default: '' },
    studentPhone: { type: String, default: '' },
    reviewedBy: {
        type: mongoose.Schema.Types.Mixed,
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

// Virtual to always return student as string for consistent comparisons
manualPaymentSchema.virtual('studentId').get(function () {
    return String(this.student);
});

module.exports = mongoose.model('ManualPayment', manualPaymentSchema);
