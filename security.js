const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, sanitizeBody } = require('express-validator');

// Apply security headers
exports.applySecurityHeaders = (app) => {
    app.use(helmet());
    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "cdn.jsdelivr.net"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            connectSrc: ["'self'", "api.openai.com"],
            frameSrc: ["'self'"]
        }
    }));
    app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
};

// Rate limiting for API routes
exports.apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

// Rate limiting for auth routes
exports.authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many login attempts from this IP, please try again later'
});

// Input sanitization middleware
exports.sanitizeInput = [
    body('*').escape(),
    sanitizeBody('*').trim(),
    body('email').normalizeEmail()
];