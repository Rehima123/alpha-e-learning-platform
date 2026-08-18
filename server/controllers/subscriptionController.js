const User    = require('../models/User');
const Payment = require('../models/Payment');
const axios   = require('axios');

// ── Plan pricing in ETB ───────────────────────────────────────────────────────
const PLAN_PRICES = { monthly: 1650, annual: 11300 };

// @desc    GET /api/subscriptions/me — current subscription status
exports.getMySubscription = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('subscription fullName email phoneNumber');
        const sub  = user.subscription || {};
        const now  = new Date();
        const isActive =
            (sub.plan === 'monthly' || sub.plan === 'annual') &&
            sub.status === 'active' &&
            sub.endDate &&
            new Date(sub.endDate) > now;

        res.json({
            success: true,
            subscription: {
                plan:      sub.plan      || 'free',
                status:    sub.status    || 'active',
                startDate: sub.startDate || null,
                endDate:   sub.endDate   || null,
                isActive:  !!isActive
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    PUT /api/subscriptions/cancel — cancel active subscription
exports.cancelSubscription = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { 'subscription.status': 'cancelled' },
            { new: true }
        );
        res.json({
            success: true,
            message: 'Subscription cancelled successfully',
            subscription: user.subscription
        });
    } catch (error) {
        next(error);
    }
};

// @desc    PUT /api/subscriptions/renew — re-initiate payment for current plan
exports.renewSubscription = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('subscription fullName email phoneNumber');
        const plan = user.subscription?.plan;

        if (!plan || plan === 'free') {
            return res.status(400).json({
                success: false,
                message: 'No plan to renew. Please subscribe first.'
            });
        }

        const subtotal = PLAN_PRICES[plan];
        const tax      = Math.round(subtotal * 0.15);
        const total    = subtotal + tax;
        const txRef    = `AFT-RENEW-${Date.now()}-${req.user.id.toString().slice(-6)}`;

        // Create payment record
        const payment = await Payment.create({
            student:        req.user.id,
            type:           'subscription',
            plan,
            subtotal,
            discount:       0,
            tax,
            total,
            currency:       'ETB',
            provider:       'chapa',
            txRef,
            instructorShare: 0,
            platformShare:  Math.round(total * 0.30)
        });

        // Dev mode — no Chapa key
        const chapaKey = process.env.CHAPA_SECRET_KEY;
        if (!chapaKey) {
            return res.json({
                success: true,
                devMode:   true,
                message:   'Dev mode: renewal simulated',
                txRef,
                paymentId: payment._id,
                total
            });
        }

        // Live Chapa payment
        const chapaRes = await axios.post(
            'https://api.chapa.co/v1/transaction/initialize',
            {
                amount:      total,
                currency:    'ETB',
                email:       user.email || `${user.phoneNumber}@placeholder.com`,
                first_name:  user.fullName.split(' ')[0],
                last_name:   user.fullName.split(' ').slice(1).join(' ') || 'User',
                tx_ref:      txRef,
                callback_url:`${process.env.SERVER_URL}/api/payments/chapa-webhook`,
                return_url:  `${process.env.CLIENT_URL}/payment-success.html?tx_ref=${txRef}`,
                customization: {
                    title:       'Alpha Freshman Tutorial',
                    description: `${plan} Subscription Renewal`
                }
            },
            { headers: { Authorization: `Bearer ${chapaKey}` } }
        );

        res.json({
            success:     true,
            checkoutUrl: chapaRes.data.data.checkout_url,
            txRef,
            paymentId:   payment._id,
            total
        });
    } catch (error) {
        next(error);
    }
};
