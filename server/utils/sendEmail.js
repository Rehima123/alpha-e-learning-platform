const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

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
    if (!process.env.SMTP_USER) {
        console.log(`[Email skipped — no SMTP config] To: ${to} | Subject: ${subject}`);
        return;
    }
    await transporter.sendMail({
        from: `"Alpha Freshman Tutorial" <${process.env.SMTP_USER}>`,
        to, subject, html
    });
}

module.exports = { sendEmail, templates };
