const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.authenticate = async (req, res, next) => {
    try {
        // Get token from header or cookie
        let token = req.header('Authorization') || req.cookies.token;
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Remove 'Bearer ' if present
        if (token.startsWith('Bearer ')) {
            token = token.slice(7);
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findByPk(decoded.userId, {
            attributes: { exclude: ['password_hash', 'verification_token', 'reset_token'] }
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (err) {
        console.error('Authentication error:', err);
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        
        res.status(401).json({ message: 'Invalid token' });
    }
};

exports.checkVerified = (req, res, next) => {
    if (!req.user.is_verified) {
        return res.status(403).json({ 
            message: 'Please verify your email address to access this feature',
            code: 'EMAIL_NOT_VERIFIED'
        });
    }
    next();
};

exports.checkRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        next();
    };
};