const Payment = require('../models/Payment');
const Course  = require('../models/Course');
const Coupon  = require('../models/Coupon');
const User    = require('../models/User');
const Enrollment = require('../models/Enrollment');
const { sendEmail, templates } = require('../utils/sendEmail');
const axios = require('axios');

const ETB_RATE = parseFloat(process.env.ETB_RATE || '56'); // 1 USD = 56 ETB approx
const TAX_RATE = 0.15;
const INSTRUCTOR_SHARE = 0.70; // 70% to instructor
const PLATFORM_SHARE   = 0.30;

// ── Validate coupon ───────────────────────────────────────────────────────────
exports.validateCoupon = async (req, res, next) => {
    try {
        const { code, amount } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });

        const check = coupon.isValid(req.user._id, amount);
        if (!check.valid) return res.status(400).json({ success: false, message: check.reason });

        const discount = coupon.calculateDiscount(amount);
        res.json({ success: true, coupon: { code: coupon.code, type: coupon.type, value: coupon.value, discount } });
    } catch (error) { next(error); }
};

// ── Initiate Chapa payment ────────────────────────────────────────────────────
exports.initiateChapaPayment = async (req, res, next) => {
    try {
        const { courseId, plan, couponCode, currency = 'ETB' } = req.body;
        const student = await User.findById(req.user._id);

        let subtotal, type, course;

        if (courseId) {
            course = await Course.findById(courseId);
            if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
            subtotal = Math.round(course.price * ETB_RATE);
            type = 'course';
        } else {
            const plans = { monthly: 1650, annual: 11300 }; // ETB
            subtotal = plans[plan];
            if (!subtotal) return res.status(400).json({ success: false, message: 'Invalid plan' });
            type = 'subscription';
        }

        // Apply coupon
        let discount = 0, couponDoc = null;
        if (couponCode) {
            couponDoc = await Coupon.findOne({ code: couponCode.toUpperCase() });
            if (couponDoc) {
                const check = couponDoc.isValid(req.user._id, subtotal);
                if (check.valid) discount = couponDoc.calculateDiscount(subtotal);
            }
        }

        const afterDiscount = subtotal - discount;
        const tax   = Math.round(afterDiscount * TAX_RATE);
        const total = afterDiscount + tax;

        const txRef = `AFT-${Date.now()}-${req.user._id.toString().slice(-6)}`;

        // Create pending payment record
        const payment = await Payment.create({
            student: req.user._id,
            course:  courseId || undefined,
            type, plan: plan || 'course',
            subtotal, discount, tax, total,
            currency: 'ETB',
            provider: 'chapa',
            txRef,
            couponCode: couponCode || undefined,
            couponId: couponDoc?._id,
            instructorShare: course ? Math.round(total * INSTRUCTOR_SHARE) : 0,
            platformShare:   Math.round(total * PLATFORM_SHARE)
        });

        // Call Chapa API
        const chapaKey = process.env.CHAPA_SECRET_KEY;
        if (!chapaKey) {
            // Dev mode: simulate success
            return res.json({
                success: true,
                devMode: true,
                message: 'Dev mode: Chapa key not set. Use /payments/verify-dev to simulate success.',
                txRef,
                paymentId: payment._id,
                total,
                currency: 'ETB'
            });
        }

        const chapaRes = await axios.post('https://api.chapa.co/v1/transaction/initialize', {
            amount: total,
            currency: 'ETB',
            email: student.email,
            first_name: student.fullName.split(' ')[0],
            last_name:  student.fullName.split(' ').slice(1).join(' ') || 'User',
            tx_ref: txRef,
            callback_url: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/payments/chapa-webhook`,
            return_url:   `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment-success.html?tx_ref=${txRef}`,
            customization: { title: 'Alpha Freshman Tutorial', description: course?.title || `${plan} Subscription` }
        }, { headers: { Authorization: `Bearer ${chapaKey}` } });

        res.json({
            success: true,
            checkoutUrl: chapaRes.data.data.checkout_url,
            txRef,
            paymentId: payment._id,
            total,
            currency: 'ETB'
        });
    } catch (error) { next(error); }
};

// ── Chapa webhook ─────────────────────────────────────────────────────────────
exports.chapaWebhook = async (req, res, next) => {
    try {
        const { tx_ref } = req.body;
        await processSuccessfulPayment(tx_ref);
        res.json({ success: true });
    } catch (error) { next(error); }
};

// ── Dev: simulate payment success ─────────────────────────────────────────────
exports.devVerifyPayment = async (req, res, next) => {
    try {
        const { txRef } = req.body;
        const result = await processSuccessfulPayment(txRef);
        res.json({ success: true, message: 'Payment simulated successfully', ...result });
    } catch (error) { next(error); }
};

// ── Verify Chapa payment (return_url callback) ────────────────────────────────
exports.verifyPayment = async (req, res, next) => {
    try {
        const { tx_ref } = req.query;
        const chapaKey = process.env.CHAPA_SECRET_KEY;

        if (chapaKey) {
            const verify = await axios.get(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
                { headers: { Authorization: `Bearer ${chapaKey}` } });
            if (verify.data.data.status !== 'success') {
                return res.json({ success: false, message: 'Payment not confirmed' });
            }
        }

        const result = await processSuccessfulPayment(tx_ref);
        res.json({ success: true, ...result });
    } catch (error) { next(error); }
};

// ── Shared: process a successful payment ──────────────────────────────────────
async function processSuccessfulPayment(txRef) {
    const payment = await Payment.findOne({ txRef }).populate('student').populate('course');
    if (!payment) throw new Error('Payment not found');
    if (payment.status === 'success') return { payment, alreadyProcessed: true };

    payment.status = 'success';
    await payment.save(); // triggers invoiceNumber generation

    const student = payment.student;
    const course  = payment.course;

    if (payment.type === 'course' && course) {
        // Auto-approve enrollment
        await Enrollment.findOneAndUpdate(
            { student: student._id, course: course._id },
            { status: 'approved', reviewedAt: new Date() },
            { upsert: true, new: true }
        );
        await Course.findByIdAndUpdate(course._id, { $inc: { enrolledStudents: 1 } });

        // Instructor revenue share
        if (course.instructor) {
            await User.findByIdAndUpdate(course.instructor, {
                $inc: { 'revenueBalance': payment.instructorShare }
            });
        }
    } else if (payment.type === 'subscription') {
        const endDate = new Date();
        if (payment.plan === 'annual') endDate.setFullYear(endDate.getFullYear() + 1);
        else endDate.setMonth(endDate.getMonth() + 1);

        await User.findByIdAndUpdate(student._id, {
            subscription: { plan: payment.plan, status: 'active', startDate: new Date(), endDate }
        });
    }

    // Mark coupon as used
    if (payment.couponId) {
        await Coupon.findByIdAndUpdate(payment.couponId, {
            $inc: { usedCount: 1 },
            $push: { usedBy: student._id }
        });
    }

    // Send receipt email
    try {
        const emailData = templates.paymentReceipt(student, payment, course);
        await sendEmail({ to: student.email, ...emailData });
    } catch (e) { console.error('Receipt email failed:', e.message); }

    return { payment, invoiceNumber: payment.invoiceNumber };
}

// ── Get my payment history ────────────────────────────────────────────────────
exports.getMyPayments = async (req, res, next) => {
    try {
        const payments = await Payment.find({ student: req.user._id, status: 'success' })
            .populate('course', 'title icon')
            .sort({ paidAt: -1 });
        res.json({ success: true, payments });
    } catch (error) { next(error); }
};

// ── Get invoice ───────────────────────────────────────────────────────────────
exports.getInvoice = async (req, res, next) => {
    try {
        const payment = await Payment.findOne({
            _id: req.params.id,
            student: req.user._id,
            status: 'success'
        }).populate('student', 'fullName email').populate('course', 'title icon category');

        if (!payment) return res.status(404).json({ success: false, message: 'Invoice not found' });
        res.json({ success: true, payment });
    } catch (error) { next(error); }
};

// ── Admin: revenue report ─────────────────────────────────────────────────────
exports.getRevenueReport = async (req, res, next) => {
    try {
        const { period = '30' } = req.query;
        const since = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

        const [totals, byDay, byCourse, byPlan] = await Promise.all([
            Payment.aggregate([
                { $match: { status: 'success', paidAt: { $gte: since } } },
                { $group: {
                    _id: null,
                    totalRevenue:   { $sum: '$total' },
                    platformRevenue:{ $sum: '$platformShare' },
                    instructorPaid: { $sum: '$instructorShare' },
                    totalTax:       { $sum: '$tax' },
                    totalDiscount:  { $sum: '$discount' },
                    count:          { $sum: 1 }
                }}
            ]),
            Payment.aggregate([
                { $match: { status: 'success', paidAt: { $gte: since } } },
                { $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
                    revenue: { $sum: '$total' },
                    count:   { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ]),
            Payment.aggregate([
                { $match: { status: 'success', type: 'course', paidAt: { $gte: since } } },
                { $group: { _id: '$course', revenue: { $sum: '$total' }, count: { $sum: 1 } } },
                { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
                { $unwind: '$course' },
                { $project: { title: '$course.title', icon: '$course.icon', revenue: 1, count: 1 } },
                { $sort: { revenue: -1 } },
                { $limit: 10 }
            ]),
            Payment.aggregate([
                { $match: { status: 'success', type: 'subscription', paidAt: { $gte: since } } },
                { $group: { _id: '$plan', revenue: { $sum: '$total' }, count: { $sum: 1 } } }
            ])
        ]);

        res.json({
            success: true,
            period: parseInt(period),
            totals: totals[0] || { totalRevenue: 0, platformRevenue: 0, instructorPaid: 0, totalTax: 0, totalDiscount: 0, count: 0 },
            byDay, byCourse, byPlan
        });
    } catch (error) { next(error); }
};

// ── Admin: all transactions ───────────────────────────────────────────────────
exports.getAllTransactions = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const filter = status ? { status } : {};
        const payments = await Payment.find(filter)
            .populate('student', 'fullName email')
            .populate('course', 'title icon')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await Payment.countDocuments(filter);
        res.json({ success: true, payments, total, pages: Math.ceil(total / limit) });
    } catch (error) { next(error); }
};
