const Course = require('../models/Course');
const User = require('../models/User');
const { sendEmail, templates, ownerTemplates, notifyOwner } = require('../utils/sendEmail');

// @desc    Get pending courses
exports.getPendingCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({ status: 'pending' })
            .populate('instructor', 'fullName email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: courses.length,
            courses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve course
exports.approveCourse = async (req, res, next) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { status: 'approved', isPublished: true },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Course approved successfully',
            course
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reject course
exports.rejectCourse = async (req, res, next) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { status: 'rejected' },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Course rejected',
            course
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create user by admin (super_admin only)
exports.createUser = async (req, res, next) => {
    try {
        const { fullName, email, phoneNumber, password, role, educationLevel } = req.body;

        if (!fullName || !password) {
            return res.status(400).json({ success: false, message: 'Full name and password are required' });
        }
        if (!email && !phoneNumber) {
            return res.status(400).json({ success: false, message: 'Email or phone number is required' });
        }

        // Check duplicates
        if (email) {
            const exists = await User.findOne({ email });
            if (exists) return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }
        if (phoneNumber) {
            const exists = await User.findOne({ phoneNumber });
            if (exists) return res.status(400).json({ success: false, message: 'User already exists with this phone number' });
        }

        const user = await User.create({
            fullName,
            email: email || undefined,
            phoneNumber: phoneNumber || undefined,
            educationLevel: educationLevel || undefined,
            password,
            role: role || 'student'
        });

        // Send welcome/account-created email to the user (non-blocking)
        if (user.email) {
            const adminName = req.user?.fullName || 'Admin';
            sendEmail({
                to: user.email,
                subject: '🎓 Your Alpha Freshman Tutorial Account is Ready!',
                html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px;text-align:center">
                    <h1 style="color:white;margin:0;font-size:2rem">Account Created!</h1>
                    <p style="color:rgba(255,255,255,0.9);margin:10px 0 0">Alpha Freshman Tutorial</p>
                  </div>
                  <div style="background:white;padding:32px">
                    <h2>ሰላም ${user.fullName}! 👋</h2>
                    <p>አካውንትዎ በ <strong>${adminName}</strong> (Admin) ተፈጥሮልዎታል።</p>
                    <div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:20px 0">
                      <h3 style="margin:0 0 12px;color:#667eea">የመግቢያ መረጃዎ:</h3>
                      <table style="width:100%;border-collapse:collapse;font-size:0.95rem">
                        <tr><td style="padding:6px 0;color:#666;width:40%">ኢሜይል</td><td><strong>${user.email}</strong></td></tr>
                        <tr><td style="padding:6px 0;color:#666">ሚና (Role)</td><td><strong>${user.role}</strong></td></tr>
                      </table>
                      <p style="margin:12px 0 0;font-size:0.88rem;color:#e74c3c">
                        ⚠️ ለደህንነት፣ ወደ አካውንትዎ ከገቡ በኋላ ፓስዎርዱን ይቀይሩ።
                      </p>
                    </div>
                    <a href="${process.env.CLIENT_URL || 'https://alpha-freshman-tutorial.vercel.app'}/auth-login.html"
                       style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;
                       padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">
                      ወደ አካውንቴ ግባ →
                    </a>
                  </div>
                  <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:0.8rem;color:#888">
                    © ${new Date().getFullYear()} Alpha Freshman Tutorial · Way to Success
                  </div>
                </div>`
            }).catch(() => {});
        }

        // Notify owner that admin created a user (non-blocking)
        notifyOwner({
            subject: `👤 Admin Created Account — ${user.fullName} (${user.role})`,
            html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:linear-gradient(135deg,#3B82F6,#1d4ed8);padding:24px;text-align:center">
                <h2 style="color:white;margin:0">Admin Created New Account</h2>
              </div>
              <div style="background:white;padding:24px">
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:8px 0;color:#666">Name</td><td><strong>${user.fullName}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#666">Email</td><td>${user.email || '—'}</td></tr>
                  <tr><td style="padding:8px 0;color:#666">Phone</td><td>${user.phoneNumber || '—'}</td></tr>
                  <tr><td style="padding:8px 0;color:#666">Role</td><td>${user.role}</td></tr>
                  <tr><td style="padding:8px 0;color:#666">Created by</td><td>${req.user?.fullName || 'Admin'}</td></tr>
                  <tr><td style="padding:8px 0;color:#666">Date</td><td>${new Date().toLocaleString()}</td></tr>
                </table>
              </div>
            </div>`
        }).catch(() => {});

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all users
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Deactivate user
exports.deactivateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deactivated successfully',
            user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Activate user
exports.activateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User activated successfully',
            user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get platform statistics
exports.getStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalInstructors = await User.countDocuments({ role: 'instructor' });
        const totalCourses = await Course.countDocuments({ status: 'approved' });
        const pendingCourses = await Course.countDocuments({ status: 'pending' });

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalStudents,
                totalInstructors,
                totalCourses,
                pendingCourses
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user role (super_admin only)
exports.updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        const validRoles = ['student', 'instructor', 'super_admin', 'content_admin', 'finance_admin', 'support_admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        // Prevent demoting yourself
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot change your own role' });
        }
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, message: `Role updated to ${role}`, user });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all enrollments (any admin)
exports.getAllEnrollments = async (req, res, next) => {
    try {
        const Enrollment = require('../models/Enrollment');
        const enrollments = await Enrollment.find()
            .populate('student', 'fullName email')
            .populate('course', 'title icon')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: enrollments.length, enrollments });
    } catch (error) {
        next(error);
    }
};

// @desc    Get payments report (finance_admin)
exports.getPaymentsReport = async (req, res, next) => {
    try {
        const Payment = require('../models/Payment');
        const { period = '30' } = req.query;
        const since = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

        const [totals, byCourse, byDay] = await Promise.all([
            Payment.aggregate([
                { $match: { status: 'success', paidAt: { $gte: since } } },
                { $group: {
                    _id: null,
                    totalRevenue:    { $sum: '$total' },
                    platformRevenue: { $sum: '$platformShare' },
                    instructorPaid:  { $sum: '$instructorShare' },
                    totalTax:        { $sum: '$tax' },
                    totalDiscount:   { $sum: '$discount' },
                    count:           { $sum: 1 }
                }}
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
                { $match: { status: 'success', paidAt: { $gte: since } } },
                { $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
                    revenue: { $sum: '$total' },
                    count:   { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ])
        ]);

        res.status(200).json({
            success: true,
            period: parseInt(period),
            totals: totals[0] || { totalRevenue: 0, platformRevenue: 0, instructorPaid: 0, totalTax: 0, totalDiscount: 0, count: 0 },
            byCourse,
            byDay
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve payment (finance_admin)
exports.approvePayment = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Payment approved' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get support tickets (support_admin)
exports.getTickets = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, tickets: [] });
    } catch (error) {
        next(error);
    }
};

// @desc    Reply to ticket (support_admin)
exports.replyTicket = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Reply sent' });
    } catch (error) {
        next(error);
    }
};

// @desc    Create course (content_admin)
exports.createCourse = async (req, res, next) => {
    try {
        const course = await Course.create({
            ...req.body,
            instructor: req.user._id,
            instructorName: req.user.fullName,
            status: 'approved',
            isPublished: true
        });
        res.status(201).json({ success: true, message: 'Course created', course });
    } catch (error) {
        next(error);
    }
};
