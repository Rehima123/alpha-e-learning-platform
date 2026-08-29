// ─── Instructor Controller ───────────────────────────────────────────────────
const Course        = require('../models/Course');
const Enrollment    = require('../models/Enrollment');
const ManualPayment = require('../models/ManualPayment');
const User          = require('../models/User');
const { sendEmail, templates } = require('../utils/sendEmail');

// ── GET /api/instructor/overview ─────────────────────────────────────────────
exports.getOverview = async (req, res) => {
    try {
        const instructorId = req.user._id;

        // Instructor's courses
        const courses = await Course.find({ instructor: instructorId });
        const courseIds = courses.map(c => c._id);

        // Enrollments for instructor's courses
        const enrollments = await Enrollment.find({ course: { $in: courseIds } })
            .populate('student', 'fullName email')
            .populate('course', 'title icon')
            .sort({ requestedAt: -1 });

        // Manual payments for instructor's courses
        const payments = await ManualPayment.find({ course: { $in: courseIds } })
            .populate('student', 'fullName email')
            .populate('course', 'title icon')
            .sort({ submittedAt: -1 });

        const approvedPayments = payments.filter(p => p.status === 'approved');
        const totalRevenue     = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const pendingPayments  = payments.filter(p => p.status === 'pending_verification');
        const totalStudents    = enrollments.filter(e => e.status === 'approved').length;
        const activeCourses    = courses.filter(c => c.status === 'approved' && c.isPublished).length;

        // Recent activity — last 5 payment receipts
        const recentActivity = payments.slice(0, 5).map(p => ({
            _id:         p._id,
            studentName: p.student?.fullName || 'Unknown',
            email:       p.student?.email    || '',
            courseTitle: p.course?.title     || p.plan || 'Unknown',
            courseIcon:  p.course?.icon      || '📚',
            amount:      p.amount,
            status:      p.status,
            submittedAt: p.submittedAt
        }));

        res.json({
            success: true,
            overview: {
                totalRevenue,
                totalStudents,
                activeCourses,
                pendingPayments: pendingPayments.length,
                totalCourses:    courses.length,
                recentActivity
            }
        });
    } catch (err) {
        console.error('[getOverview]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /api/instructor/courses ───────────────────────────────────────────────
exports.getMyCourses = async (req, res) => {
    try {
        const courses = await Course.find({ instructor: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, courses });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── POST /api/instructor/courses ──────────────────────────────────────────────
exports.createCourse = async (req, res) => {
    try {
        const { title, description, price, category, level, duration, icon, thumbnail, isPublished } = req.body;

        const course = await Course.create({
            title,
            description,
            price:          parseFloat(price) || 0,
            category:       category || 'semester1',
            level:          level    || 'Freshman',
            duration:       duration || '8 weeks',
            icon:           icon     || '📚',
            thumbnail:      thumbnail || '',
            isPublished:    isPublished || false,
            instructor:     req.user._id,
            instructorName: req.user.fullName,
            status:         'pending'
        });

        res.status(201).json({ success: true, message: 'Course created and submitted for approval', course });
    } catch (err) {
        console.error('[createCourse]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── PUT /api/instructor/courses/:id ──────────────────────────────────────────
exports.updateCourse = async (req, res) => {
    try {
        const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        const allowed = ['title','description','price','category','level','duration','icon','thumbnail','isPublished'];
        allowed.forEach(field => {
            if (req.body[field] !== undefined) course[field] = req.body[field];
        });

        await course.save();
        res.json({ success: true, message: 'Course updated', course });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── DELETE /api/instructor/courses/:id ───────────────────────────────────────
exports.deleteCourse = async (req, res) => {
    try {
        const course = await Course.findOneAndDelete({ _id: req.params.id, instructor: req.user._id });
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
        res.json({ success: true, message: 'Course deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── POST /api/instructor/courses/:id/lessons ─────────────────────────────────
exports.addLesson = async (req, res) => {
    try {
        const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        const { title, videoUrl, duration, order, isFree, description } = req.body;
        if (!title) return res.status(400).json({ success: false, message: 'Lesson title is required' });

        course.lessons.push({
            title,
            videoUrl:    videoUrl    || '',
            duration:    duration    || '',
            order:       order       || course.lessons.length + 1,
            isFree:      isFree      || false,
            description: description || ''
        });

        course.totalLessons = course.lessons.length;
        await course.save();

        const lesson = course.lessons[course.lessons.length - 1];
        res.status(201).json({ success: true, message: 'Lesson added', lesson, totalLessons: course.totalLessons });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── PUT /api/instructor/courses/:id/lessons/:lessonId ────────────────────────
exports.updateLesson = async (req, res) => {
    try {
        const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        const lesson = course.lessons.id(req.params.lessonId);
        if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

        const allowed = ['title','videoUrl','duration','order','isFree','description'];
        allowed.forEach(f => { if (req.body[f] !== undefined) lesson[f] = req.body[f]; });

        course.totalLessons = course.lessons.length;
        await course.save();
        res.json({ success: true, message: 'Lesson updated', lesson });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── DELETE /api/instructor/courses/:id/lessons/:lessonId ─────────────────────
exports.deleteLesson = async (req, res) => {
    try {
        const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        course.lessons = course.lessons.filter(l => l._id.toString() !== req.params.lessonId);
        course.totalLessons = course.lessons.length;
        await course.save();
        res.json({ success: true, message: 'Lesson deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /api/instructor/payments ──────────────────────────────────────────────
exports.getPayments = async (req, res) => {
    try {
        const courses   = await Course.find({ instructor: req.user._id }).select('_id');
        const courseIds = courses.map(c => c._id);

        const { status = 'all' } = req.query;
        const query = { course: { $in: courseIds } };
        if (status !== 'all') query.status = status;

        const payments = await ManualPayment.find(query)
            .populate('student', 'fullName email')
            .populate('course',  'title icon category')
            .sort({ submittedAt: -1 });

        res.json({ success: true, payments, count: payments.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── PUT /api/instructor/payments/:id/approve ─────────────────────────────────
exports.approvePayment = async (req, res) => {
    try {
        // Verify instructor owns the course
        const payment = await ManualPayment.findById(req.params.id)
            .populate('student', 'fullName email')
            .populate('course',  'title icon category _id instructor');

        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

        if (payment.course?.instructor?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized — not your course' });
        }
        if (payment.status !== 'pending_verification') {
            return res.status(400).json({ success: false, message: `Payment already ${payment.status}` });
        }

        payment.status     = 'approved';
        payment.reviewedBy = req.user._id;
        payment.reviewedAt = new Date();
        await payment.save();

        // Create/update enrollment
        if (payment.course) {
            const existing = await Enrollment.findOne({ student: payment.student._id, course: payment.course._id });
            if (existing) {
                existing.status     = 'approved';
                existing.reviewedAt = new Date();
                existing.reviewedBy = req.user._id;
                await existing.save();
            } else {
                await Enrollment.create({
                    student:    payment.student._id,
                    course:     payment.course._id,
                    status:     'approved',
                    reviewedAt: new Date(),
                    reviewedBy: req.user._id
                });
            }
            await Course.findByIdAndUpdate(payment.course._id, { $inc: { enrolledStudents: 1 } });
        }

        // Email student
        try {
            const courseName = `${payment.course?.icon || '📚'} ${payment.course?.title || 'your course'}`;
            await sendEmail({
                to:      payment.student.email,
                subject: `✅ Payment Approved — ${payment.course?.title || ''}`,
                html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:linear-gradient(135deg,#27ae60,#1a7030);padding:32px;text-align:center">
                    <h1 style="color:white;margin:0">Alpha Freshman Tutorial</h1>
                  </div>
                  <div style="background:white;padding:32px">
                    <h2 style="color:#27ae60">🎉 Payment Approved!</h2>
                    <p>Dear <strong>${payment.student.fullName}</strong>,</p>
                    <p>Your payment for <strong>${courseName}</strong> has been approved. You can now access the course!</p>
                    <div style="text-align:center;margin:24px 0">
                      <a href="${process.env.CLIENT_URL || 'https://alpha-freshman-tutorial.vercel.app'}/course-detail.html?id=${payment.course?._id}"
                         style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">
                        Start Learning →
                      </a>
                    </div>
                  </div>
                </div>`
            });
        } catch (e) { console.error('Email failed:', e.message); }

        res.json({ success: true, message: 'Payment approved', payment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── PUT /api/instructor/payments/:id/reject ──────────────────────────────────
exports.rejectPayment = async (req, res) => {
    try {
        const { reason } = req.body;
        const payment = await ManualPayment.findById(req.params.id)
            .populate('student', 'fullName email')
            .populate('course',  'title icon instructor');

        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
        if (payment.course?.instructor?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (payment.status !== 'pending_verification') {
            return res.status(400).json({ success: false, message: `Already ${payment.status}` });
        }

        payment.status     = 'rejected';
        payment.adminNote  = reason || '';
        payment.reviewedBy = req.user._id;
        payment.reviewedAt = new Date();
        await payment.save();

        // Email student
        try {
            await sendEmail({
                to:      payment.student.email,
                subject: `❌ Payment Not Verified — ${payment.course?.title || ''}`,
                html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px;text-align:center">
                    <h1 style="color:white;margin:0">Alpha Freshman Tutorial</h1>
                  </div>
                  <div style="background:white;padding:32px">
                    <h2 style="color:#e74c3c">Payment Not Verified</h2>
                    <p>Dear <strong>${payment.student.fullName}</strong>,</p>
                    <p>Your receipt for <strong>${payment.course?.title || ''}</strong> could not be verified.</p>
                    ${reason ? `<div style="background:#fff5f5;border:1px solid #e74c3c;border-radius:8px;padding:16px;margin:20px 0"><strong>Reason:</strong> ${reason}</div>` : ''}
                    <p>Please resubmit a clear receipt showing the transaction ID and amount.</p>
                    <div style="text-align:center;margin:24px 0">
                      <a href="${process.env.CLIENT_URL || 'https://alpha-freshman-tutorial.vercel.app'}/payment.html"
                         style="background:#667eea;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">
                        Resubmit Receipt →
                      </a>
                    </div>
                  </div>
                </div>`
            });
        } catch (e) { console.error('Email failed:', e.message); }

        res.json({ success: true, message: 'Payment rejected', payment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /api/instructor/students ─────────────────────────────────────────────
exports.getStudents = async (req, res) => {
    try {
        const courses   = await Course.find({ instructor: req.user._id }).select('_id title icon totalLessons');
        const courseIds = courses.map(c => c._id);
        const courseMap = Object.fromEntries(courses.map(c => [c._id.toString(), c]));

        const { search } = req.query;

        const enrollments = await Enrollment.find({ course: { $in: courseIds }, status: 'approved' })
            .populate('student', 'fullName email createdAt')
            .populate('course',  'title icon totalLessons')
            .sort({ requestedAt: -1 });

        let results = enrollments.map(e => {
            const totalLessons    = e.course?.totalLessons || 1;
            const completedCount  = e.completedLessons?.length || 0;
            const progress        = Math.min(100, Math.round((completedCount / totalLessons) * 100));
            return {
                enrollmentId: e._id,
                studentId:    e.student?._id,
                studentName:  e.student?.fullName  || 'Unknown',
                email:        e.student?.email     || '',
                courseTitle:  e.course?.title      || '',
                courseIcon:   e.course?.icon       || '📚',
                courseId:     e.course?._id,
                progress,
                completedLessons: completedCount,
                totalLessons,
                enrolledAt:   e.requestedAt,
                status:       e.status
            };
        });

        // Search filter
        if (search) {
            const q = search.toLowerCase();
            results = results.filter(r =>
                r.studentName.toLowerCase().includes(q) ||
                r.email.toLowerCase().includes(q)
            );
        }

        res.json({ success: true, students: results, count: results.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── PUT /api/instructor/students/:enrollmentId/access ─────────────────────────
exports.toggleAccess = async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.enrollmentId)
            .populate('course', 'instructor');

        if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
        if (enrollment.course?.instructor?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { action } = req.body; // 'grant' | 'revoke'
        enrollment.status = action === 'grant' ? 'approved' : 'rejected';
        await enrollment.save();

        res.json({ success: true, message: `Access ${action === 'grant' ? 'granted' : 'revoked'}`, enrollment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
