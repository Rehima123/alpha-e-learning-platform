const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please provide your full name'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    role: {
        type: String,
        enum: ['student', 'instructor', 'admin'],
        default: 'student'
    },
    avatar: {
        type: String,
        default: null
    },
    enrolledCourses: [{
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        enrolledAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date
        },
        progress: {
            type: Number,
            default: 0
        },
        completedLessons: [{
            type: String
        }]
    }],
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'monthly', 'annual'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['active', 'expired', 'cancelled'],
            default: 'active'
        },
        startDate: Date,
        endDate: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Token
userSchema.methods.generateAuthToken = function() {
    return jwt.sign(
        { id: this._id, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Generate Password Reset Token
userSchema.methods.generateResetToken = function() {
    const resetToken = jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    
    this.resetPasswordToken = resetToken;
    this.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    
    return resetToken;
};

module.exports = mongoose.model('User', userSchema);
