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

// @desc    Save Google Drive video link to a course lesson
exports.saveDriveVideoLink = async (req, res, next) => {
    try {
        const { courseId, chapterIdx, lessonIdx, driveFileId, lessonTitle } = req.body;

        if (!courseId || !driveFileId) {
            return res.status(400).json({
                success: false,
                error: 'courseId እና driveFileId ያስፈልጋሉ።'
            });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, error: 'Course አልተገኘም።' });
        }

        // ── Case 1: chapters[chapterIdx].lessons[lessonIdx] ─────────────────
        if (chapterIdx !== undefined && lessonIdx !== undefined) {
            const ci = parseInt(chapterIdx);
            const li = parseInt(lessonIdx);

            if (!course.chapters[ci]) {
                return res.status(400).json({ success: false, error: 'Chapter index invalid.' });
            }
            if (!course.chapters[ci].lessons[li]) {
                // Create lesson placeholder
                course.chapters[ci].lessons.push({
                    title:    lessonTitle || `Lesson ${li + 1}`,
                    videoUrl: `https://drive.google.com/file/d/${driveFileId}/preview`,
                    order:    li
                });
            } else {
                course.chapters[ci].lessons[li].videoUrl =
                    `https://drive.google.com/file/d/${driveFileId}/preview`;
            }
        }
        // ── Case 2: push to videos[] array (simple flat list) ────────────────
        else {
            // Check if entry already exists for this driveFileId
            const existing = course.videos.find(v => v.youtubeId === driveFileId);
            if (existing) {
                existing.youtubeUrl = `https://drive.google.com/file/d/${driveFileId}/preview`;
            } else {
                course.videos.push({
                    title:      lessonTitle || 'Video',
                    youtubeUrl: `https://drive.google.com/file/d/${driveFileId}/preview`,
                    youtubeId:  driveFileId,   // re-using youtubeId field for driveFileId
                    chapter:    ''
                });
            }
        }

        await course.save();

        return res.status(200).json({
            success: true,
            message: 'ቪዲዮው በተሳካ ሁኔታ ተያይዟል!',
            driveFileId,
            courseId
        });
    } catch (error) {
        console.error('[saveDriveVideoLink]', error);
        next(error);
    }
};

// @desc    Get all video links for a course (for admin manager)
exports.getCourseVideoLinks = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.courseId)
            .select('title chapters videos icon');
        if (!course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }
        res.status(200).json({ success: true, course });
    } catch (error) {
        next(error);
    }
};


exports.sendBulkSMS = async (req, res, next) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, error: 'እባክዎን የመልእክት ይዘት ያስገቡ።' });
        }

        // ── API Key check ─────────────────────────────────────────────────────
        const AFROMESSAGE_API_KEY   = process.env.AFROMESSAGE_API_KEY   || '';
        const AFROMESSAGE_SENDER_ID = process.env.AFROMESSAGE_SENDER_ID || 'AlphaFT';
        const AFROMESSAGE_IDENTIFIER = process.env.AFROMESSAGE_IDENTIFIER || ''; // identifier code if required

        if (!AFROMESSAGE_API_KEY) {
            return res.status(500).json({
                success: false,
                error: '⚙️ AFROMESSAGE_API_KEY Vercel environment variable ላይ አልተቀናጀም። Vercel Dashboard → Settings → Environment Variables ውስጥ ያስቀምጡ።',
                hint: 'Add AFROMESSAGE_API_KEY to your Vercel project environment variables.'
            });
        }

        // ── Get students with valid phone numbers ─────────────────────────────
        const students = await User.find(
            {
                role: { $in: ['student', 'instructor'] },
                phoneNumber: { $exists: true, $ne: null }
            },
            'phoneNumber fullName'
        );

        // ── Normalize phone numbers to +251XXXXXXXXX format ──────────────────
        const normalizePhone = (phone) => {
            if (!phone) return null;
            phone = phone.toString().trim().replace(/\s+/g, '').replace(/-/g, '');

            // Already in international format
            if (phone.startsWith('+251') && phone.length === 13) return phone;
            if (phone.startsWith('251')  && phone.length === 12)  return '+' + phone;

            // Local format: 09XXXXXXXX or 07XXXXXXXX (10 digits)
            if (/^0[79]\d{8}$/.test(phone)) return '+251' + phone.slice(1);

            // 9-digit without leading 0
            if (/^[79]\d{8}$/.test(phone)) return '+251' + phone;

            // Unrecognized — skip
            return null;
        };

        const validNumbers = students
            .map(s => normalizePhone(s.phoneNumber))
            .filter(Boolean);

        if (validNumbers.length === 0) {
            return res.status(404).json({
                success: false,
                error: `ምንም ትክክለኛ ስልክ ቁጥር አልተገኘም። ከ ${students.length} ተጠቃሚዎች ውስጥ ምንም valid +251 number የለም።`
            });
        }

        console.log(`[BulkSMS] Sending to ${validNumbers.length} recipients...`);

        const axios = require('axios');

        // ── AfroMessage API call (v1 format) ──────────────────────────────────
        // AfroMessage supports sending to multiple numbers via the /send endpoint
        // by iterating or using their bulk endpoint
        const sendResults = { sent: 0, failed: 0, errors: [] };

        // Send in batches of 50 to avoid timeouts
        const BATCH_SIZE = 50;
        for (let i = 0; i < validNumbers.length; i += BATCH_SIZE) {
            const batch = validNumbers.slice(i, i + BATCH_SIZE);

            for (const to of batch) {
                try {
                    const payload = {
                        from:    AFROMESSAGE_SENDER_ID,
                        to:      to,
                        message: message.trim()
                    };
                    if (AFROMESSAGE_IDENTIFIER) payload.identifier = AFROMESSAGE_IDENTIFIER;

                    const afroRes = await axios.post(
                        'https://api.afromessage.com/api/send',
                        payload,
                        {
                            headers: {
                                'Authorization': `Bearer ${AFROMESSAGE_API_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 10000
                        }
                    );

                    if (afroRes.data?.acknowledge === 'success') {
                        sendResults.sent++;
                    } else {
                        sendResults.failed++;
                        const errMsg = afroRes.data?.response?.errors?.[0] || afroRes.data?.message || 'Unknown error';
                        sendResults.errors.push(`${to}: ${errMsg}`);
                    }
                } catch (batchErr) {
                    sendResults.failed++;
                    const errCode = batchErr.response?.data?.response?.errors?.[0] || batchErr.message;
                    sendResults.errors.push(`${to}: ${errCode}`);
                }
            }
        }

        if (sendResults.sent === 0 && sendResults.failed > 0) {
            // Detect specific AfroMessage error types
            const firstError = sendResults.errors[0] || '';
            let friendlyError = `ሁሉም ${sendResults.failed} SMS ሊላኩ አልቻሉም።`;

            if (firstError.toLowerCase().includes('invalid') && firstError.toLowerCase().includes('token')) {
                friendlyError = '🔑 Invalid API Key — AfroMessage API key ትክክል አይደለም። Vercel env var ን ያረጋግጡ።';
            } else if (firstError.toLowerCase().includes('balance') || firstError.toLowerCase().includes('credit')) {
                friendlyError = '💳 Insufficient SMS balance — AfroMessage account ላይ ቀሪ ሂሳብ የለም። ሂሳብ ይሞሉ።';
            } else if (firstError.toLowerCase().includes('sender')) {
                friendlyError = '📛 Invalid Sender ID — AFROMESSAGE_SENDER_ID ን ያረጋግጡ።';
            } else if (firstError.toLowerCase().includes('identifier')) {
                friendlyError = '🆔 Invalid Identifier — AFROMESSAGE_IDENTIFIER env var ን ያረጋግጡ።';
            } else {
                friendlyError += ` ስህተት: ${firstError}`;
            }

            return res.status(500).json({
                success: false,
                error: friendlyError,
                details: sendResults.errors.slice(0, 5)
            });
        }

        return res.status(200).json({
            success: true,
            totalRecipients: validNumbers.length,
            sent:   sendResults.sent,
            failed: sendResults.failed,
            message: sendResults.failed > 0
                ? `${sendResults.sent} SMS ተላኩ, ${sendResults.failed} ሳይደርሱ ቀሩ።`
                : `✅ ${sendResults.sent} ለሚሆኑ ተማሪዎች SMS በስኬት ተላኩ!`,
            errors: sendResults.errors.slice(0, 10)
        });

    } catch (error) {
        console.error('[sendBulkSMS] Unexpected error:', error.response?.data || error.message);

        // Surface specific AfroMessage API errors
        const afroError = error.response?.data;
        if (afroError) {
            const errMsg = afroError.response?.errors?.[0]
                || afroError.message
                || JSON.stringify(afroError);

            if (errMsg.toLowerCase().includes('invalid') && errMsg.toLowerCase().includes('token')) {
                return res.status(401).json({ success: false, error: '🔑 Invalid AfroMessage API Key — Vercel env var AFROMESSAGE_API_KEY ን ያረጋግጡ።' });
            }
            if (errMsg.toLowerCase().includes('balance') || errMsg.toLowerCase().includes('credit')) {
                return res.status(402).json({ success: false, error: '💳 Insufficient SMS balance — AfroMessage account ሂሳብ ይሞሉ።' });
            }
            return res.status(500).json({ success: false, error: `AfroMessage ስህተት: ${errMsg}` });
        }

        return res.status(500).json({
            success: false,
            error: error.message || 'SMS ሲላክ ያልተጠበቀ ስህተት ተፈጥሯል።'
        });
    }
};

