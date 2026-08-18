const path = require('path');

const BASE_URL = process.env.SERVER_URL || 'http://localhost:5000';

// @desc    POST /api/upload/image — upload a course thumbnail or avatar image
// @access  Private (instructor, admin roles)
exports.uploadImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    // Build a portable public URL
    const relativePath = req.file.path
        .replace(/\\/g, '/')
        .split('/uploads/')[1];

    const url = `${BASE_URL}/uploads/${relativePath}`;

    res.status(201).json({
        success:  true,
        url,
        filename: req.file.filename,
        size:     req.file.size,
        mimetype: req.file.mimetype
    });
};

// @desc    POST /api/upload/file — upload a PDF, video, or zip attachment
// @access  Private (instructor, admin roles)
exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const relativePath = req.file.path
        .replace(/\\/g, '/')
        .split('/uploads/')[1];

    const url = `${BASE_URL}/uploads/${relativePath}`;

    res.status(201).json({
        success:  true,
        url,
        filename: req.file.filename,
        size:     req.file.size,
        mimetype: req.file.mimetype
    });
};
