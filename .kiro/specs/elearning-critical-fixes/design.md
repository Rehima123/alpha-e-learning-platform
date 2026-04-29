# Design Document: E-Learning Platform Frontend-Backend Integration Fix

## Overview

This design addresses the critical architectural disconnect between the frontend and backend by implementing proper REST API communication, JWT authentication, and completing missing backend implementations.

## Architecture Changes

### 1. API Service Layer (Frontend)

**File: `api/apiClient.js`**
- Centralized HTTP client using fetch or axios
- Request/response interceptors for JWT token injection
- Error handling and response formatting
- Base URL configuration

**File: `api/authService.js`**
- Login API call: POST /api/auth/login
- Register API call: POST /api/auth/register
- Token storage in localStorage (JWT only, not passwords)
- Token refresh logic

**File: `api/courseService.js`**
- Fetch courses: GET /api/courses
- Fetch single course: GET /api/courses/:id
- Create course: POST /api/courses (instructor)
- Update course: PUT /api/courses/:id (instructor)

**File: `api/enrollmentService.js`**
- Enroll in course: POST /api/enrollments
- Get user enrollments: GET /api/enrollments/my-courses
- Update progress: PUT /api/enrollments/:id/progress

**File: `api/paymentService.js`**
- Process payment: POST /api/payments
- Get payment history: GET /api/payments/history

### 2. Backend Controllers (Missing Implementations)

**File: `server/controllers/enrollmentController.js`**
```javascript
// Enroll user in course
exports.enrollInCourse = async (req, res, next)
// Get user's enrolled courses
exports.getMyEnrollments = async (req, res, next)
// Update course progress
exports.updateProgress = async (req, res, next)
```

**File: `server/controllers/paymentController.js`**
```javascript
// Process payment (Stripe integration)
exports.processPayment = async (req, res, next)
// Get payment history
exports.getPaymentHistory = async (req, res, next)
// Verify payment status
exports.verifyPayment = async (req, res, next)
```

**File: `server/utils/sendEmail.js`**
```javascript
// Send email using nodemailer
exports.sendEmail = async (options)
```

### 3. Frontend Authentication Updates

**File: `auth-login.js`** - Replace localStorage auth with API calls
- Call authService.login()
- Store JWT token only
- Redirect based on user role from API response

**File: `auth-register.js`** - Replace localStorage registration
- Call authService.register()
- Store JWT token only
- Redirect to appropriate page

**File: `src/context/AuthContext.jsx`** - JWT-based auth context
- Decode JWT to get user info
- Validate token expiration
- Auto-logout on token expiry
- Send token in all API requests

### 4. Frontend Data Fetching Updates

**File: `courses.js`** - Remove hardcoded courses
- Fetch from courseService.getCourses()
- Handle loading states
- Handle errors with user feedback

**File: `dashboard.js`** - Fetch user enrollments
- Call enrollmentService.getMyEnrollments()
- Display courses from API
- Show progress from database

**File: `course-detail.js`** - Fetch single course
- Call courseService.getCourse(id)
- Handle enrollment via enrollmentService
- Remove hardcoded course data

**File: `payment.js`** - Real payment processing
- Call paymentService.processPayment()
- Handle payment success/failure
- Update enrollment status

### 5. Backend Routes (New)

**File: `server/routes/enrollments.js`**
```javascript
POST   /api/enrollments          - Enroll in course
GET    /api/enrollments/my-courses - Get user enrollments
PUT    /api/enrollments/:id/progress - Update progress
```

**File: `server/routes/payments.js`**
```javascript
POST   /api/payments              - Process payment
GET    /api/payments/history      - Get payment history
GET    /api/payments/:id/verify   - Verify payment
```

## Data Flow

### Authentication Flow
```
1. User submits login form
2. auth-login.js → authService.login() → POST /api/auth/login
3. Backend validates credentials, returns JWT token
4. Frontend stores token in localStorage
5. AuthContext decodes token for user info
6. All subsequent API calls include token in Authorization header
```

### Course Data Flow
```
1. User visits courses page
2. courses.js → courseService.getCourses() → GET /api/courses
3. Backend queries MongoDB, returns course array
4. Frontend renders courses from API response
5. No hardcoded data used
```

### Enrollment Flow
```
1. User clicks "Enroll" on course
2. course-detail.js → enrollmentService.enrollInCourse() → POST /api/enrollments
3. Backend creates enrollment record in database
4. Frontend receives confirmation
5. User redirected to enrolled course
```

### Payment Flow
```
1. User submits payment form
2. payment.js → paymentService.processPayment() → POST /api/payments
3. Backend processes via Stripe (or mock for now)
4. Backend creates payment record
5. Backend updates user enrollment
6. Frontend receives success response
7. User redirected to courses
```

## Security Improvements

1. **No Plaintext Passwords**: Passwords only sent over HTTPS to backend, hashed with bcrypt
2. **JWT Token Storage**: Only tokens stored in localStorage, not credentials
3. **Token Expiration**: Tokens expire after configured time (e.g., 7 days)
4. **Authorization Headers**: All protected routes require Bearer token
5. **Input Validation**: Frontend validates before submission, backend validates again
6. **CORS Configuration**: Backend only accepts requests from configured origins

## Implementation Priority

### Phase 1: Core API Integration (Critical)
1. Create API service layer (apiClient.js, authService.js)
2. Update auth-login.js to use API
3. Update auth-register.js to use API
4. Update AuthContext.jsx for JWT handling

### Phase 2: Course Data Integration (High)
5. Create courseService.js
6. Update courses.js to fetch from API
7. Update dashboard.js to fetch from API
8. Update course-detail.js to fetch from API

### Phase 3: Missing Backend Implementations (High)
9. Create enrollmentController.js
10. Create enrollment routes
11. Create paymentController.js
12. Create payment routes
13. Create sendEmail.js utility

### Phase 4: Frontend Integration (Medium)
14. Create enrollmentService.js
15. Update course enrollment flow
16. Create paymentService.js
17. Update payment processing flow

## Testing Strategy

### Manual Testing
1. Test login with valid/invalid credentials
2. Test registration with new user
3. Verify JWT token in localStorage
4. Test course listing loads from API
5. Test enrollment creates database record
6. Test payment processing (mock)

### Verification Checklist
- [ ] No localStorage used for passwords
- [ ] All auth operations call /api/auth/*
- [ ] All course data from /api/courses
- [ ] JWT tokens sent in Authorization headers
- [ ] Enrollment controller exists and works
- [ ] Payment controller exists and works
- [ ] sendEmail utility exists
- [ ] No hardcoded course arrays in frontend

## Rollback Plan

If issues occur:
1. Keep original files as .backup
2. Restore from backup if API integration fails
3. Ensure database migrations are reversible
4. Test in development before production deployment
