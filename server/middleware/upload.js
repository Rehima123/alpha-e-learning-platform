const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Ensure base upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    file:  ['application/pdf', 'video/mp4', 'video/webm', 'application/zip']
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// ── Disk storage — swap engine to cloud adapter (e.g. multer-storage-cloudinary) for production
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sub = file.mimetype.startsWith('image/') ? 'images' : 'files';
        const dir = path.join(UPLOAD_DIR, sub);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, name);
    }
});

function makeFileFilter(allowedMimes) {
    return (req, file, cb) => {
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            const err = new Error('Unsupported file type');
            err.statusCode = 400;
            cb(err, false);
        }
    };
}

// ── Image uploader (JPEG / PNG / WebP / GIF) ─────────────────────────────────
exports.uploadImage = multer({
    storage,
    limits:     { fileSize: MAX_SIZE },
    fileFilter: makeFileFilter(ALLOWED_TYPES.image)
}).single('image');

// ── File uploader (PDF / MP4 / WebM / ZIP) ───────────────────────────────────
exports.uploadFile = multer({
    storage,
    limits:     { fileSize: MAX_SIZE },
    fileFilter: makeFileFilter(ALLOWED_TYPES.file)
}).single('file');
