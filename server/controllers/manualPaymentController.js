const ManualPayment = require('../models/ManualPayment');
const Enrollment    = require('../models/Enrollment');
const Course        = require('../models/Course');
const User          = require('../models/User');
const { sendEmail, notifyOwner } = require('../utils/sendEmail');

const CLIENT_URL = process.env.CLIENT_URL || 'https://alpha-freshman-tutorial.vercel.app';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'supportalphafreshman@gmail.com';

// ── POST /api/payments/manual-receipt ────────────────────────────────────────
exports.submitManualReceipt = async (req, res) => {
    try {
        const { courseId, plan, amount, receiptImage, receiptFileName } = req.body;

        if (!receiptImage) {
            return res.status(400).json({ success: false, message: 'Receipt image is required' });
        }
        if (!courseId && !plan) {
            return res.status(400).json({ success: false, message: 'courseId or plan is required' });
        }

        // Check for existing pending receipt for this student + course/plan
        const existingQuery = { student: req.user._id, status: 'pending_verification' };
        if (courseId) existingQuery.course = courseId;
        else existingQuery.plan = plan;

        const existing = await ManualPayment.findOne(existingQuery);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending receipt for this item. Please wait for admin review.'
            });
        }

        // Resolve course name for email
        let courseName = plan ? `${plan} Subscription` : 'Course';
        let courseDoc  = null;
        if (courseId) {
            courseDoc  = await Course.findById(courseId).select('title icon');
            courseName = courseDoc ? `${courseDoc.icon || '📚'} ${courseDoc.title}` : 'Course';
        }

        // Save receipt to DB
        const payment = await ManualPayment.create({
            student:         req.user._id,
            course:          courseId || null,
            plan:            plan || null,
            amount:          amount || 0,
            receiptImage,
            receiptFileName: receiptFileName || 'receipt.jpg',
            status:          'pending_verification'
        });

        // ── Send email to owner ───────────────────────────────────────────────
        try {
            const adminDashboardUrl = `${CLIENT_URL}/admin-dashboard.html?tab=manual-payments`;

            // Strip data URI prefix for attachment; keep raw base64
            let base64Data = receiptImage;
            let mimeType   = 'image/jpeg';
            const match = receiptImage.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                mimeType   = match[1];
                base64Data = match[2];
            }

            const isPDF = mimeType === 'application/pdf';

            const ownerHtml = `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f9f9f9">
              <div style="background:linear-gradient(135deg,#f39c12,#d35400);padding:28px;text-align:center">
                <h1 style="color:white;margin:0;font-size:1.4rem">💰 New Manual Payment Receipt</h1>
                <p style="color:rgba(255,255,255,0.85);margin:6px 0 0">Alpha Freshman Tutorial</p>
              </div>
              <div style="background:white;padding:28px">
                <h2 style="color:#f39c12;margin-top:0">Payment Details</h2>
                <table style="width:100%;border-collapse:collapse;font-size:0.95rem">
                  <tr style="background:#fef9f0">
                    <td style="padding:10px;color:#666;border-bottom:1px solid #eee;width:160px"><strong>Student Name</strong></td>
                    <td style="padding:10px;border-bottom:1px solid #eee">${req.user.fullName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Email</strong></td>
                    <td style="padding:10px;border-bottom:1px solid #eee">${req.user.email}</td>
                  </tr>
                  <tr style="background:#fef9f0">
                    <td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Course / Plan</strong></td>
                    <td style="padding:10px;border-bottom:1px solid #eee">${courseName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Amount</strong></td>
                    <td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold;color:#27ae60;font-size:1.1rem">
                      ${(amount || 0).toLocaleString()} ETB
                    </td>
                  </tr>
                  <tr style="background:#fef9f0">
                    <td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Submitted At</strong></td>
                    <td style="padding:10px;border-bottom:1px solid #eee">${new Date().toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px;color:#666"><strong>Receipt ID</strong></td>
                    <td style="padding:10px;font-family:monospace;font-size:0.85rem">${payment._id}</td>
                  </tr>
                </table>

                ${!isPDF ? `
                <div style="margin:24px 0">
                  <p style="font-weight:bold;color:#555;margin-bottom:8px">📎 Receipt Screenshot:</p>
                  <img src="${receiptImage}" style="max-width:500px;width:100%;border-radius:8px;
                    border:1px solid #ddd;box-shadow:0 2px 8px rgba(0,0,0,0.1)" />
                </div>` : `
                <div style="margin:24px 0;background:#fff3e0;border:1px solid #f39c12;border-radius:8px;padding:14px">
                  <p style="margin:0;color:#d35400">📄 PDF receipt attached — see attachment below.</p>
                </div>`}

                <div style="display:flex;gap:12px;margin-top:24px;text-align:center">
                  <a href="${adminDashboardUrl}"
                     style="flex:1;display:inline-block;background:linear-gradient(135deg,#27ae60,#1a7030);
                     color:white;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:1rem">
                    ✅ Go to Admin Dashboard → Approve/Reject
                  </a>
                </div>
                <p style="font-size:0.82rem;color:#999;margin-top:16px;text-align:center">
                  Receipt ID: ${payment._id} · ${new Date().toLocaleString()}
                </p>
              </div>
              <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:0.8rem;color:#888">
                © ${new Date().getFullYear()} Alpha Freshman Tutorial · Auto notification
              </div>
            </div>`;

            const mailOptions = {
                to:      OWNER_EMAIL,
                subject: `💰 New Payment Receipt — ${req.user.fullName} → ${courseName}`,
                html:    ownerHtml
            };

            // Attach PDF if needed, otherwise image is embedded in HTML
            if (isPDF) {
                mailOptions.attachments = [{
                    filename: receiptFileName || 'receipt.pdf',
                    content:  Buffer.from(base64Data, 'base64'),
                    contentType: 'application/pdf'
                }];
            } else {
                // Also attach image for email clients that block inline images
                mailOptions.attachments = [{
                    filename: receiptFileName || 'receipt.jpg',
                    content:  Buffer.from(base64Data, 'base64'),
                    contentType: mimeType
                }];
            }

            await sendEmail(mailOptions);
        } catch (emailErr) {
            console.error('[Manual payment email failed]', emailErr.message);
            // Don't fail the request if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Receipt submitted successfully. Admin will verify within 24 hours.',
            paymentId: payment._id
        });
    } catch (err) {
        console.error('[submitManualReceipt]', err);
        res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};

// ── GET /api/payments/manual-pending  (admin) ─────────────────────────────────
exports.getPendingReceipts = async (req, res) => {
    try {
        const { status = 'all' } = req.query;

        const query = {};
        if (status !== 'all') query.status = status;

        const payments = await ManualPayment.find(query)
            .populate('student', 'fullName email')
            .populate('course',  'title icon category')
            .populate('reviewedBy', 'fullName')
            .sort({ submittedAt: -1 });

        res.json({ success: true, payments, count: payments.length });
    } catch (err) {
        console.error('[getPendingReceipts]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── PUT /api/payments/manual-receipt/:id/approve  (admin) ─────────────────────
exports.approveReceipt = async (req, res) => {
    try {
        const payment = await ManualPayment.findById(req.params.id)
            .populate('student', 'fullName email')
            .populate('course',  'title icon category _id');

        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
        if (payment.status !== 'pending_verification') {
            return res.status(400).json({ success: false, message: `Payment already ${payment.status}` });
        }

        // Update status
        payment.status     = 'approved';
        payment.reviewedBy = req.user._id;
        payment.reviewedAt = new Date();
        await payment.save();

        // Create or update enrollment
        if (payment.course) {
            const existingEnroll = await Enrollment.findOne({
                student: payment.student._id,
                course:  payment.course._id
            });

            if (existingEnroll) {
                existingEnroll.status    = 'approved';
                existingEnroll.reviewedAt = new Date();
                existingEnroll.reviewedBy = req.user._id;
                existingEnroll.receipt   = {
                    amountPaid:    payment.amount,
                    paymentMethod: 'Manual Transfer',
                    submittedAt:   payment.submittedAt,
                    paidAt:        new Date()
                };
                await existingEnroll.save();
            } else {
                await Enrollment.create({
                    student:     payment.student._id,
                    course:      payment.course._id,
                    status:      'approved',
                    reviewedAt:  new Date(),
                    reviewedBy:  req.user._id,
                    requestedAt: payment.submittedAt,
                    receipt: {
                        amountPaid:    payment.amount,
                        paymentMethod: 'Manual Transfer',
                        submittedAt:   payment.submittedAt,
                        paidAt:        new Date()
                    }
                });
            }

            // Increment enrolled students
            await Course.findByIdAndUpdate(payment.course._id, { $inc: { enrolledStudents: 1 } });
        }

        // ── Email student ─────────────────────────────────────────────────────
        const courseName = payment.course
            ? `${payment.course.icon || '📚'} ${payment.course.title}`
            : `${payment.plan} Subscription`;

        const courseLink = payment.course
            ? `${CLIENT_URL}/course-detail.html?id=${payment.course._id}`
            : `${CLIENT_URL}/dashboard.html`;

        try {
            await sendEmail({
                to:      payment.student.email,
                subject: `✅ Payment Approved — ${payment.course?.title || payment.plan}`,
                html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:linear-gradient(135deg,#27ae60,#1a7030);padding:32px;text-align:center">
                    <h1 style="color:white;margin:0">Alpha Freshman Tutorial</h1>
                    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">Way to Success</p>
                  </div>
                  <div style="background:white;padding:32px">
                    <h2 style="color:#27ae60">🎉 Payment Approved!</h2>
                    <p>Dear <strong>${payment.student.fullName}</strong>,</p>
                    <p>Your manual payment receipt has been <strong style="color:#27ae60">verified and approved</strong>!</p>
                    <div style="background:#f0fff4;border:1px solid #27ae60;border-radius:8px;padding:16px;margin:20px 0">
                      <p style="margin:0"><strong>Item:</strong> ${courseName}</p>
                      <p style="margin:8px 0 0"><strong>Amount:</strong> ${payment.amount.toLocaleString()} ETB</p>
                      <p style="margin:8px 0 0"><strong>Status:</strong> <span style="color:#27ae60">✅ Approved</span></p>
                    </div>
                    <p>Your course is now unlocked. Start learning today! 🚀</p>
                    <div style="text-align:center;margin:24px 0">
                      <a href="${courseLink}"
                         style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;
                         padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:1rem">
                        Start Learning →
                      </a>
                    </div>
                    ${req.body.adminNote ? `<p style="background:#f8f9fa;border-radius:6px;padding:12px;font-size:0.88rem;color:#555"><strong>Admin Note:</strong> ${req.body.adminNote}</p>` : ''}
                  </div>
                  <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:0.8rem;color:#888">
                    © ${new Date().getFullYear()} Alpha Freshman Tutorial
                  </div>
                </div>`
            });
        } catch (emailErr) {
            console.error('[Approval email failed]', emailErr.message);
        }

        res.json({ success: true, message: `Payment approved and course unlocked for ${payment.student.fullName}`, payment });
    } catch (err) {
        console.error('[approveReceipt]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── PUT /api/payments/manual-receipt/:id/reject  (admin) ──────────────────────
exports.rejectReceipt = async (req, res) => {
    try {
        const { reason } = req.body;

        const payment = await ManualPayment.findById(req.params.id)
            .populate('student', 'fullName email')
            .populate('course',  'title icon');

        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
        if (payment.status !== 'pending_verification') {
            return res.status(400).json({ success: false, message: `Payment already ${payment.status}` });
        }

        payment.status     = 'rejected';
        payment.adminNote  = reason || '';
        payment.reviewedBy = req.user._id;
        payment.reviewedAt = new Date();
        await payment.save();

        const courseName = payment.course
            ? `${payment.course.icon || '📚'} ${payment.course.title}`
            : `${payment.plan} Subscription`;

        // ── Email student ─────────────────────────────────────────────────────
        try {
            await sendEmail({
                to:      payment.student.email,
                subject: `❌ Payment Receipt Not Verified — ${payment.course?.title || payment.plan}`,
                html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px;text-align:center">
                    <h1 style="color:white;margin:0">Alpha Freshman Tutorial</h1>
                  </div>
                  <div style="background:white;padding:32px">
                    <h2 style="color:#e74c3c">Payment Not Verified</h2>
                    <p>Dear <strong>${payment.student.fullName}</strong>,</p>
                    <p>Unfortunately, your payment receipt for <strong>${courseName}</strong> could not be verified.</p>
                    ${reason ? `
                    <div style="background:#fff5f5;border:1px solid #e74c3c;border-radius:8px;padding:16px;margin:20px 0">
                      <p style="margin:0"><strong>Reason:</strong> ${reason}</p>
                    </div>` : ''}
                    <p>Please ensure:</p>
                    <ul style="color:#555;line-height:2">
                      <li>The receipt clearly shows the transaction ID and amount</li>
                      <li>Payment was sent to the correct account</li>
                      <li>The image/PDF is clear and readable</li>
                    </ul>
                    <p>You can resubmit a new receipt on the payment page.</p>
                    <div style="text-align:center;margin:24px 0">
                      <a href="${CLIENT_URL}/payment.html"
                         style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;
                         padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">
                        Resubmit Receipt →
                      </a>
                    </div>
                  </div>
                  <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:0.8rem;color:#888">
                    © ${new Date().getFullYear()} Alpha Freshman Tutorial
                  </div>
                </div>`
            });
        } catch (emailErr) {
            console.error('[Rejection email failed]', emailErr.message);
        }

        res.json({ success: true, message: 'Receipt rejected', payment });
    } catch (err) {
        console.error('[rejectReceipt]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
