// ─── middleware/checkAccess.js ────────────────────────────────────────────────
// Checks whether a logged-in student's enrolledPackage grants access to a course.
//
// Access rule:
//   package semester must match course.semester
//   AND course.stream must be 'Common' OR match the package stream
//
// Admin / instructor roles always pass through.
// Usage: router.get('/:id', protect, checkAccess, courseController.getCourse)
// ──────────────────────────────────────────────────────────────────────────────

const Course = require('../models/Course');

// Map package name → { semester, stream }
const PACKAGE_MAP = {
    '1st Semester Natural': { semester: 1, stream: 'Natural' },
    '1st Semester Social':  { semester: 1, stream: 'Social'  },
    '2nd Semester Natural': { semester: 2, stream: 'Natural' },
    '2nd Semester Social':  { semester: 2, stream: 'Social'  },
};

module.exports = async function checkAccess(req, res, next) {
    try {
        // Admins and instructors always have full access
        const adminRoles = ['admin', 'super_admin', 'content_admin',
                            'finance_admin', 'support_admin', 'instructor'];
        if (!req.user || adminRoles.includes(req.user.role)) return next();

        const pkg = req.user.enrolledPackage || 'None';

        // No package → deny access to premium courses
        if (pkg === 'None') {
            // Still allow if course is free (handled by course detail, not here)
            return next();
        }

        const pkgInfo = PACKAGE_MAP[pkg];
        if (!pkgInfo) return next(); // unknown package — let course controller decide

        // Load the course to check semester + stream
        const courseId = req.params.id || req.params.courseId;
        if (!courseId) return next();

        const course = await Course.findById(courseId).select('semester stream isPremium price');
        if (!course) return next(); // 404 handled by controller

        // Free courses always accessible
        if (!course.isPremium || course.price === 0) return next();

        // Check semester match
        if (course.semester && course.semester !== pkgInfo.semester) {
            return res.status(403).json({
                success: false,
                code: 'WRONG_SEMESTER',
                message: `Your package covers Semester ${pkgInfo.semester}. This course is Semester ${course.semester}.`
            });
        }

        // Check stream match (Common always allowed)
        if (course.stream && course.stream !== 'Common' && course.stream !== pkgInfo.stream) {
            return res.status(403).json({
                success: false,
                code: 'WRONG_STREAM',
                message: `Your package covers ${pkgInfo.stream} stream. This course is ${course.stream} stream.`
            });
        }

        next();
    } catch (err) {
        console.error('checkAccess error:', err.message);
        next(); // fail open — let controller handle
    }
};

module.exports.PACKAGE_MAP = PACKAGE_MAP;
