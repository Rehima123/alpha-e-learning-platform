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

        // ── Resolve student ID — works for both MongoDB ObjectId and Firebase UID ──
        const studentId = String(req.user._id || req.user.id || req.user.firebaseUid || '');
        if (!studentId) {
            return res.status(401).json({ success: false, message: 'User ID not found' });
        }

        // Resolve student name/email from token payload or DB
        let studentName  = req.user.fullName  || req.user.displayName || '';
        let studentEmail = req.user.email     || '';
        let studentPhone = req.user.phoneNumber || '';

        // Try to fetch from User model if it's a real MongoDB ID
        if (!studentName && req.user._id && String(req.user._id).match(/^[a-f\d]{24}$/i)) {
            try {
                const dbUser = await User.findById(req.user._id).select('fullName email phoneNumber');
                if (dbUser) {
                    studentName  = dbUser.fullName;
                    studentEmail = dbUser.email;
                    studentPhone = dbUser.phoneNumber;
                }
            } catch (_) {}
        }

        // Check for existing pending receipt for this student + course/plan
        const existingQuery = { student: studentId, status: 'pending_verification' };
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
            try {
                courseDoc  = await Course.findById(courseId).select('title icon');
            } catch (_) {} // courseId might not be valid ObjectId for firebase users
            courseName = courseDoc ? `${courseDoc.icon || '📚'} ${courseDoc.title}` : 'Course';
        }

        // Save receipt to DB
        const payment = await ManualPayment.create({
            student:         studentId,
            course:          courseId || null,
            plan:            plan     || null,
            amount:          amount   || 0,
            receiptImage,
            receiptFileName: receiptFileName || 'receipt.jpg',
            studentName,
            studentEmail,
            studentPhone,
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
                    <td style="padding:10px;border-bottom:1px solid #eee">${studentName || studentId}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Email</strong></td>
                    <td style="padding:10px;border-bottom:1px solid #eee">${studentEmail || '—'}</td>
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
                subject: `💰 New Payment Receipt — ${studentName || studentId} → ${courseName}`,
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

        // Don't populate student — it may be a Firebase UID string, not an ObjectId
        const payments = await ManualPayment.find(query)
            .populate({ path: 'course', select: 'title icon category', strictPopulate: false })
            .sort({ submittedAt: -1 })
            .lean();

        // Enrich with student info: try DB lookup for ObjectId students, fall back to snapshot
        const mongoose = require('mongoose');
        const enriched = await Promise.all(payments.map(async (p) => {
            let studentInfo = {
                _id:         p.student,
                fullName:    p.studentName  || '',
                email:       p.studentEmail || '',
                phoneNumber: p.studentPhone || ''
            };
            // If it looks like a Mongo ObjectId, try to fetch from DB
            const studentStr = String(p.student || '');
            if (/^[a-f\d]{24}$/i.test(studentStr)) {
                try {
                    const u = await User.findById(studentStr).select('fullName email phoneNumber').lean();
                    if (u) studentInfo = { _id: u._id, fullName: u.fullName, email: u.email, phoneNumber: u.phoneNumber };
                } catch (_) {}
            }
            return { ...p, student: studentInfo };
        }));

        res.json({ success: true, payments: enriched, count: enriched.length });
    } catch (err) {
        console.error('[getPendingReceipts]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── PUT /api/payments/manual-receipt/:id/approve  (admin) ─────────────────────
exports.approveReceipt = async (req, res) => {
    try {
        const payment = await ManualPayment.findById(req.params.id)
            .populate({ path: 'course', select: 'title icon category _id', strictPopulate: false })
            .lean();

        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
        if (payment.status !== 'pending_verification') {
            return res.status(400).json({ success: false, message: `Payment already ${payment.status}` });
        }

        // Resolve student info (Mixed field — could be ObjectId or Firebase UID)
        const studentId  = String(payment.student || '');
        let studentName  = payment.studentName  || '';
        let studentEmail = payment.studentEmail || '';

        if (!studentName && /^[a-f\d]{24}$/i.test(studentId)) {
            try {
                const u = await User.findById(studentId).select('fullName email');
                if (u) { studentName = u.fullName; studentEmail = u.email; }
            } catch (_) {}
        }

        // Update status
        await ManualPayment.findByIdAndUpdate(req.params.id, {
            status:     'approved',
            reviewedBy: req.user._id || req.user.id,
            reviewedAt: new Date()
        });

        // Create or update enrollment (only if course is a valid ObjectId)
        if (payment.course?._id) {
            const courseId = payment.course._id;
            const existingEnroll = await Enrollment.findOne({
                student: studentId,
                course:  courseId
            });

            if (existingEnroll) {
                existingEnroll.status     = 'approved';
                existingEnroll.reviewedAt = new Date();
                existingEnroll.reviewedBy = req.user._id || req.user.id;
                await existingEnroll.save();
            } else {
                await Enrollment.create({
                    student:     studentId,
                    course:      courseId,
                    status:      'approved',
                    reviewedAt:  new Date(),
                    reviewedBy:  req.user._id || req.user.id,
                    requestedAt: payment.submittedAt
                });
            }
            await Course.findByIdAndUpdate(courseId, { $inc: { enrolledStudents: 1 } });
        }

        // Email student
        const courseName = payment.course
            ? `${payment.course.icon || '📚'} ${payment.course.title}`
            : `${payment.plan || ''} Subscription`;
        const courseLink = payment.course?._id
            ? `${CLIENT_URL}/course-detail.html?id=${payment.course._id}`
            : `${CLIENT_URL}/dashboard.html`;

        if (studentEmail) {
            try {
                await sendEmail({
                    to:      studentEmail,
                    subject: `✅ Payment Approved — ${payment.course?.title || payment.plan || ''}`,
                    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                      <div style="background:linear-gradient(135deg,#27ae60,#1a7030);padding:32px;text-align:center">
                        <h1 style="color:white;margin:0">Alpha Freshman Tutorial</h1>
                      </div>
                      <div style="background:white;padding:32px">
                        <h2 style="color:#27ae60">🎉 Payment Approved!</h2>
                        <p>Dear <strong>${studentName || 'Student'}</strong>,</p>
                        <p>Your payment for <strong>${courseName}</strong> has been <strong style="color:#27ae60">verified and approved</strong>!</p>
                        <div style="background:#f0fff4;border:1px solid #27ae60;border-radius:8px;padding:16px;margin:20px 0">
                          <p style="margin:0"><strong>Amount:</strong> ${(payment.amount || 0).toLocaleString()} ETB</p>
                          <p style="margin:8px 0 0"><strong>Status:</strong> ✅ Approved</p>
                        </div>
                        <div style="text-align:center;margin:24px 0">
                          <a href="${courseLink}" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Start Learning →</a>
                        </div>
                      </div>
                    </div>`
                });
            } catch (e) { console.error('[Approval email failed]', e.message); }
        }

        res.json({ success: true, message: `Payment approved for ${studentName || studentId}` });
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
            .populate({ path: 'course', select: 'title icon', strictPopulate: false })
            .lean();

        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
        if (payment.status !== 'pending_verification') {
            return res.status(400).json({ success: false, message: `Payment already ${payment.status}` });
        }

        const studentId    = String(payment.student || '');
        let   studentEmail = payment.studentEmail || '';
        let   studentName  = payment.studentName  || 'Student';

        if (!studentEmail && /^[a-f\d]{24}$/i.test(studentId)) {
            try {
                const u = await User.findById(studentId).select('fullName email');
                if (u) { studentName = u.fullName; studentEmail = u.email; }
            } catch (_) {}
        }

        await ManualPayment.findByIdAndUpdate(req.params.id, {
            status:     'rejected',
            adminNote:  reason || '',
            reviewedBy: req.user._id || req.user.id,
            reviewedAt: new Date()
        });

        const courseName = payment.course
            ? `${payment.course.icon || '📚'} ${payment.course.title}`
            : `${payment.plan || ''} Subscription`;

        if (studentEmail) {
            try {
                await sendEmail({
                    to:      studentEmail,
                    subject: `❌ Payment Receipt Not Verified — ${payment.course?.title || payment.plan || ''}`,
                    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                      <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px;text-align:center">
                        <h1 style="color:white;margin:0">Alpha Freshman Tutorial</h1>
                      </div>
                      <div style="background:white;padding:32px">
                        <h2 style="color:#e74c3c">Payment Not Verified</h2>
                        <p>Dear <strong>${studentName}</strong>,</p>
                        <p>Your receipt for <strong>${courseName}</strong> could not be verified.</p>
                        ${reason ? `<div style="background:#fff5f5;border:1px solid #e74c3c;border-radius:8px;padding:16px;margin:20px 0"><strong>Reason:</strong> ${reason}</div>` : ''}
                        <p>Please resubmit a clear receipt showing the transaction ID and amount.</p>
                        <div style="text-align:center;margin:24px 0">
                          <a href="${CLIENT_URL}/payment.html" style="background:#667eea;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Resubmit Receipt →</a>
                        </div>
                      </div>
                    </div>`
                });
            } catch (e) { console.error('[Rejection email failed]', e.message); }
        }

        res.json({ success: true, message: 'Receipt rejected' });
    } catch (err) {
        console.error('[rejectReceipt]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
