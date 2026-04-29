const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    status: {
        type: String,
        enum: ['pending_payment', 'receipt_submitted', 'approved', 'rejected'],
        default: 'pending_payment'
    },
    // Payment receipt
    receipt: {
        imageUrl:      { type: String },           // uploaded file path
        transactionId: { type: String },           // e.g. Telebirr TxID
        paymentMethod: { type: String },           // Telebirr, CBE, Awash, etc.
        amountPaid:    { type: Number },           // ETB amount
        paidAt:        { type: Date },
        submittedAt:   { type: Date }
    },
    requestedAt:  { type: Date, default: Date.now },
    reviewedAt:   { type: Date },
    reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectReason: { type: String },
    progress:     { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: [{ type: String }]
}, { timestamps: true });

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
