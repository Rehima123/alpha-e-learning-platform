const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide course title'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Please provide course description'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    icon: {
        type: String,
        default: '📚'
    },
    category: {
        type: String,
        required: true,
        enum: ['semester1', 'semester2', 'natural', 'social']
    },
    level: {
        type: String,
        required: true,
        enum: ['Freshman', 'Beginner', 'Intermediate', 'Advanced'],
        default: 'Freshman'
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    instructorName: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    lessons: [{
        title:       { type: String, required: true },
        description: String,
        duration:    String,
        videoUrl:    String,
        notes:       String,   // rich study notes for this lesson
        chapterIndex: { type: Number, default: 0 },
        materials: [{
            title: String,
            url:   String,
            type:  String
        }],
        order: Number
    }],
    // Structured chapters (Department → Course → Chapter → Lesson)
    chapters: [{
        title:       { type: String, required: true },
        description: String,
        order:       Number,
        lessons: [{
            title:       { type: String, required: true },
            description: String,
            notes:       String,   // study notes shown in lesson view
            duration:    String,
            videoUrl:    String,
            order:       Number,
            materials: [{
                title: String,
                url:   String,
                type:  { type: String, enum: ['pdf','video','link','doc'] }
            }]
        }]
    }],
    department: {
        type: String,
        default: ''   // e.g. "Engineering", "Medicine", "Social Sciences"
    },
    totalLessons: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    enrolledStudents: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    isPremium: {
        type: Boolean,
        default: true   // premium by default; set false for free courses
    },
    isFreePreview: {
        type: Boolean,
        default: false  // first 2 lessons accessible on free trial
    },
    tags: [{
        type: String,
        trim: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Calculate average rating
courseSchema.methods.calculateAverageRating = function() {
    if (this.reviews.length === 0) {
        this.rating = 0;
        return;
    }
    
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.rating = (sum / this.reviews.length).toFixed(1);
};

// Update total lessons
courseSchema.pre('save', function(next) {
    this.totalLessons = this.lessons.length;
    next();
});

module.exports = mongoose.model('Course', courseSchema);
