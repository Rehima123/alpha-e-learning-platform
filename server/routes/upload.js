const express          = require('express');
const router           = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadImage, uploadFile } = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');

// ── Wrap multer to convert its errors into proper Express error responses ─────
function multerWrap(multerMiddleware) {
    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (!err) return next();
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ success: false, message: 'File too large (max 10 MB)' });
            }
            // Unsupported MIME type or other multer error
            err.statusCode = err.statusCode || 400;
            return res.status(err.statusCode).json({ success: false, message: err.message || 'Upload error' });
        });
    };
}

// POST /api/upload/image — instructor / admin only
router.post(
    '/image',
    protect,
    authorize('instructor', 'admin', 'super_admin', 'content_admin'),
    multerWrap(uploadImage),
    uploadController.uploadImage
);

// POST /api/upload/file — instructor / admin only
router.post(
    '/file',
    protect,
    authorize('instructor', 'admin', 'super_admin', 'content_admin'),
    multerWrap(uploadFile),
    uploadController.uploadFile
);

module.exports = router;
