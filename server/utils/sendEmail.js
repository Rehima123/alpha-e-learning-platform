const nodemailer = require('nodemailer');

// ── Transporter: supports Gmail, Resend, or any SMTP ─────────────────────────
function createTransporter() {
    // Resend (recommended) — set RESEND_API_KEY in .env
    if (process.env.RESEND_API_KEY) {
        return nodemailer.createTransport({
            host: 'smtp.resend.com',
            port: 465,
            secure: true,
            auth: { user: 'resend', pass: process.env.RESEND_API_KEY }
        });
    }
    // Gmail SMTP
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER || process.env.EMAIL_USER,
            pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
        }
    });
}

const transporter = createTransporter();
const FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@alpha-freshman-tutorial.com';

// ── Login notification (ተማሪው login ሲያደርግ) ──────────────────────────────────
function sendLoginNotification(studentEmail, studentName) {
    if (!process.env.SMTP_USER && !process.env.RESEND_API_KEY) return;
    const mailOptions = {
        from: `"Alpha Freshman Tutorial" <${FROM}>`,
        to: studentEmail,
        subject: 'አዲስ የመግባት (Login) ማሳወቂያ - Alpha Tutorial',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;
            border:1px solid #e0e0e0;padding:20px;border-radius:10px">
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;
                text-align:center;border-radius:8px;margin-bottom:20px">
                <h2 style="color:white;margin:0">Alpha Freshman Tutorial</h2>
                <p style="color:rgba(255,255,255,0.85);margin:6px 0 0">Way to Success</p>
            </div>
            <h2 style="color:#1e3a8a;text-align:center">እንኳን ደህና መጡ!</h2>
            <p>ሰላም <strong>${studentName}</strong>,</p>
            <p>በአልፋ ፍሬሽማን ቲውቶሪያል ድረ-ገጽ ላይ ወደ አካውንትሽ/ህ በተሳካ ሁኔታ ገብተሻል/ሃል።</p>
            <p style="background-color:#f3f4f6;padding:10px;border-radius:5px;
                font-size:14px;color:#555">
                ⚠️ ይህ መግቢያ አንቺ/ህ ካልሆንሽ/ህ፣ እባክሽ/ህ የአካውንትሽ/ህን ደህንነት በፍጥነት አረጋግጪ/ጥ።
            </p>
            <div style="text-align:center;margin:20px 0">
                <a href="${process.env.CLIENT_URL || 'https://alpha-freshman-tutorial.vercel.app'}/courses.html"
                    style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;
                    padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">
                    Courses ይመልከቱ →
                </a>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="font-size:12px;color:#888;text-align:center">
                © 2026 Alpha Freshman Tutorial. መብቱ በህግ የተጠበቀ ነው።
            </p>
        </div>`
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log('ኢሜይል መላክ አልተሳካም:', error.message);
        else        console.log('ኢሜይል በተሳካ ሁኔታ ተልኳል:', info.response);
    });
}

const templates = {
    enrollmentApproved: (student, course) => ({
        subject: `✅ Enrollment Approved — ${course.title}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:0">
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px;text-align:center">
            <h1 style="color:white;margin:0;font-size:1.6rem">Alpha Freshman Tutorial</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">Way to Success</p>
          </div>
          <div style="background:white;padding:32px">
            <h2 style="color:#27ae60">🎉 Enrollment Approved!</h2>
            <p>Dear <strong>${student.fullName}</strong>,</p>
            <p>Your enrollment request for <strong>${course.title}</strong> has been <span style="color:#27ae60;font-weight:bold">approved</span>!</p>
            <div style="background:#f0fff4;border:1px solid #27ae60;border-radius:8px;padding:16px;margin:20px 0">
              <p style="margin:0"><strong>Course:</strong> ${course.icon || '📚'} ${course.title}</p>
              <p style="margin:8px 0 0"><strong>Category:</strong> ${course.category}</p>
            </div>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/course-detail.html?id=${course._id}"
               style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">
              Start Learning →
            </a>
          </div>
          <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:0.8rem;color:#888">
            © ${new Date().getFullYear()} Alpha Freshman Tutorial · Way to Success
          </div>
        </div>`
    }),

    enrollmentRejected: (student, course, reason) => ({
        subject: `❌ Enrollment Update — ${course.title}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px;text-align:center">
            <h1 style="color:white;margin:0">Alpha Freshman Tutorial</h1>
          </div>
          <div style="background:white;padding:32px">
            <h2 style="color:#e74c3c">Enrollment Not Approved</h2>
            <p>Dear <strong>${student.fullName}</strong>,</p>
            <p>Your enrollment request for <strong>${course.title}</strong> was not approved at this time.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>You can still access this course by subscribing to our Premium plan.</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/subscription.html"
               style="display:inline-block;background:#667eea;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">
              View Plans →
            </a>
          </div>
        </div>`
    }),

    paymentReceipt: (student, payment, course) => ({
        subject: `🧾 Receipt #${payment.invoiceNumber} — Alpha Freshman Tutorial`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px;text-align:center">
            <h1 style="color:white;margin:0">Alpha Freshman Tutorial</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">Payment Receipt</p>
          </div>
          <div style="background:white;padding:32px">
            <h2 style="color:#27ae60">✅ Payment Successful</h2>
            <p>Dear <strong>${student.fullName}</strong>, thank you for your payment!</p>
            <div style="border:1px solid #eee;border-radius:8px;overflow:hidden;margin:20px 0">
              <div style="background:#f8f9fa;padding:12px 16px;border-bottom:1px solid #eee">
                <strong>Invoice #${payment.invoiceNumber}</strong>
              </div>
              <div style="padding:16px">
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:6px 0;color:#666">Date</td><td style="text-align:right">${new Date(payment.paidAt).toLocaleDateString()}</td></tr>
                  <tr><td style="padding:6px 0;color:#666">Item</td><td style="text-align:right">${course ? course.title : payment.plan + ' Subscription'}</td></tr>
                  <tr><td style="padding:6px 0;color:#666">Subtotal</td><td style="text-align:right">${payment.subtotal.toLocaleString()} ETB</td></tr>
                  ${payment.discount > 0 ? `<tr><td style="padding:6px 0;color:#27ae60">Discount</td><td style="text-align:right;color:#27ae60">-${payment.discount.toLocaleString()} ETB</td></tr>` : ''}
                  <tr><td style="padding:6px 0;color:#666">Tax (15%)</td><td style="text-align:right">${payment.tax.toLocaleString()} ETB</td></tr>
                  <tr style="border-top:2px solid #eee"><td style="padding:10px 0;font-weight:bold">Total Paid</td><td style="text-align:right;font-weight:bold;color:#667eea;font-size:1.1rem">${payment.total.toLocaleString()} ETB</td></tr>
                </table>
              </div>
            </div>
            <p style="font-size:0.85rem;color:#888">Payment processed via ${payment.provider === 'chapa' ? 'Chapa' : 'Stripe'}</p>
          </div>
        </div>`
    }),

    welcome: (user) => ({
        subject: '🎓 Welcome to Alpha Freshman Tutorial!',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px;text-align:center">
            <h1 style="color:white;margin:0;font-size:2rem">Welcome!</h1>
            <p style="color:rgba(255,255,255,0.9);font-size:1.1rem;margin:10px 0 0">Alpha Freshman Tutorial</p>
          </div>
          <div style="background:white;padding:32px">
            <h2>Hi ${user.fullName}! 👋</h2>
            <p>Your account has been created successfully. You're now part of the Alpha Freshman Tutorial community!</p>
            <div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:20px 0">
              <h3 style="margin:0 0 12px;color:#667eea">Get Started:</h3>
              <ul style="margin:0;padding-left:20px;color:#555;line-height:2">
                <li>Browse 22 Ethiopian Freshman courses</li>
                <li>Request enrollment in your desired courses</li>
                <li>Track your progress on the dashboard</li>
                <li>Earn certificates upon completion</li>
              </ul>
            </div>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/courses.html"
               style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">
              Browse Courses →
            </a>
          </div>
        </div>`
    })
};

async function sendEmail({ to, subject, html }) {
    const hasConfig = process.env.RESEND_API_KEY || process.env.SMTP_USER;
    if (!hasConfig) {
        console.log(`[Email skipped — no SMTP/Resend config] To: ${to} | Subject: ${subject}`);
        return;
    }
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@alpha-freshman-tutorial.com';
    await transporter.sendMail({
        from: `"Alpha Freshman Tutorial" <${fromAddress}>`,
        to, subject, html
    });
    console.log(`[Email sent] To: ${to} | Subject: ${subject}`);
}

// ── Owner notification (payment or enrollment event) ─────────────────────────
async function notifyOwner({ subject, html }) {
    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
        console.log(`[Owner notify skipped — OWNER_EMAIL not set] Subject: ${subject}`);
        return;
    }
    try {
        await sendEmail({ to: ownerEmail, subject, html });
        console.log(`[Owner notified] Subject: ${subject}`);
    } catch (e) {
        console.error('[Owner notify failed]', e.message);
    }
}

const ownerTemplates = {
    // Payment received
    paymentReceived: (student, payment, course) => ({
        subject: `💰 New Payment — ${payment.total?.toLocaleString()} ETB from ${student.fullName}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9">
          <div style="background:linear-gradient(135deg,#27ae60,#1a7030);padding:28px;text-align:center">
            <h1 style="color:white;margin:0;font-size:1.4rem">💰 New Payment Received</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0">Alpha Freshman Tutorial</p>
          </div>
          <div style="background:white;padding:28px">
            <h2 style="color:#27ae60;margin-top:0">Payment Details</h2>
            <table style="width:100%;border-collapse:collapse;font-size:0.95rem">
              <tr style="background:#f8f9fa"><td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Student</strong></td><td style="padding:10px;border-bottom:1px solid #eee">${student.fullName}</td></tr>
              <tr><td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Email</strong></td><td style="padding:10px;border-bottom:1px solid #eee">${student.email}</td></tr>
              <tr style="background:#f8f9fa"><td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Course</strong></td><td style="padding:10px;border-bottom:1px solid #eee">${course ? course.title : (payment.plan + ' Subscription')}</td></tr>
              <tr><td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Amount</strong></td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold;color:#27ae60;font-size:1.1rem">${payment.total?.toLocaleString()} ETB</td></tr>
              <tr style="background:#f8f9fa"><td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Invoice #</strong></td><td style="padding:10px;border-bottom:1px solid #eee">${payment.invoiceNumber || payment.txRef}</td></tr>
              <tr><td style="padding:10px;color:#666"><strong>Date</strong></td><td style="padding:10px">${new Date().toLocaleString()}</td></tr>
            </table>
            <div style="background:#f0fff4;border:1px solid #27ae60;border-radius:8px;padding:14px;margin-top:20px;text-align:center">
              <p style="margin:0;color:#27ae60;font-weight:bold">Platform Share: ${payment.platformShare?.toLocaleString() || 0} ETB</p>
            </div>
          </div>
          <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:0.8rem;color:#888">
            © ${new Date().getFullYear()} Alpha Freshman Tutorial · Auto notification
          </div>
        </div>`
    }),

    // Enrollment request
    enrollmentRequest: (student, course) => ({
        subject: `📋 New Enrollment Request — ${student.fullName} → ${course.title}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9">
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:28px;text-align:center">
            <h1 style="color:white;margin:0;font-size:1.4rem">📋 New Enrollment Request</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0">Alpha Freshman Tutorial</p>
          </div>
          <div style="background:white;padding:28px">
            <h2 style="color:#667eea;margin-top:0">Enrollment Details</h2>
            <table style="width:100%;border-collapse:collapse;font-size:0.95rem">
              <tr style="background:#f8f9fa"><td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Student Name</strong></td><td style="padding:10px;border-bottom:1px solid #eee">${student.fullName}</td></tr>
              <tr><td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Email</strong></td><td style="padding:10px;border-bottom:1px solid #eee">${student.email}</td></tr>
              <tr style="background:#f8f9fa"><td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Course</strong></td><td style="padding:10px;border-bottom:1px solid #eee">${course.icon || '📚'} ${course.title}</td></tr>
              <tr><td style="padding:10px;color:#666"><strong>Date</strong></td><td style="padding:10px">${new Date().toLocaleString()}</td></tr>
            </table>
            <div style="text-align:center;margin-top:20px">
              <a href="${process.env.CLIENT_URL || 'https://alpha-freshman-tutorial.vercel.app'}/admin-dashboard.html"
                 style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:12px 28px;
                 border-radius:8px;text-decoration:none;font-weight:bold">
                Admin Dashboard → Approve/Reject
              </a>
            </div>
          </div>
          <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:0.8rem;color:#888">
            © ${new Date().getFullYear()} Alpha Freshman Tutorial · Auto notification
          </div>
        </div>`
    }),

    // New user registration
    newUserRegistered: (user) => ({
        subject: `👤 New User Registered — ${user.fullName}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9">
          <div style="background:linear-gradient(135deg,#3B82F6,#1d4ed8);padding:28px;text-align:center">
            <h1 style="color:white;margin:0;font-size:1.4rem">👤 New User Registered</h1>
          </div>
          <div style="background:white;padding:28px">
            <table style="width:100%;border-collapse:collapse;font-size:0.95rem">
              <tr style="background:#f8f9fa"><td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Name</strong></td><td style="padding:10px;border-bottom:1px solid #eee">${user.fullName}</td></tr>
              <tr><td style="padding:10px;color:#666;border-bottom:1px solid #eee"><strong>Email</strong></td><td style="padding:10px;border-bottom:1px solid #eee">${user.email}</td></tr>
              <tr style="background:#f8f9fa"><td style="padding:10px;color:#666"><strong>Date</strong></td><td style="padding:10px">${new Date().toLocaleString()}</td></tr>
            </table>
          </div>
        </div>`
    })
};

module.exports = { sendEmail, templates, ownerTemplates, notifyOwner, sendLoginNotification };
