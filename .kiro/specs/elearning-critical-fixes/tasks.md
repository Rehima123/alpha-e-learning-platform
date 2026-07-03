# Implementation Tasks

## Phase 1: Core API Integration

- [x] 1. Create API Service Layer Foundation
  - [x] 1.1 api.js — centralized fetch wrapper with JWT interceptor and offline fallback
  - [x] 1.2 Auth methods: login, register, logout, getMe
  - [x] 1.3 Error handling and offline localStorage fallback

- [x] 2. Update Frontend Authentication - Login
  - [x] 2.1 auth-login.js calls api.login()
  - [x] 2.2 Stores only JWT token in localStorage
  - [x] 2.3 Loading states and error messages
  - [x] 2.4 Role-based redirects (admin/instructor/student)

- [x] 3. Update Frontend Authentication - Registration
  - [x] 3.1 auth-register.js calls api.register()
  - [x] 3.2 No plaintext password storage
  - [x] 3.3 Frontend validation
  - [x] 3.4 Success/error handling

- [x] 4. Update React Auth Context
  - [x] 4.1 src/context/AuthContext.jsx uses real API (fetch)
  - [x] 4.2 Token stored in localStorage, user restored on mount
  - [x] 4.3 Logout clears token and calls API
  - [x] 4.4 No localStorage password handling

## Phase 2: Course Data Integration

- [x] 5. API Service — Course methods
  - [x] 5.1 getCourses, getCourse, createCourse, updateCourse, deleteCourse
  - [x] 5.2 getInstructorCourses, addReview

- [x] 6. Update Courses Listing Page
  - [x] 6.1 courses.js fetches from API
  - [x] 6.2 No hardcoded courses array
  - [x] 6.3 Loading spinner
  - [x] 6.4 Error handling
  - [x] 6.5 Filter functionality maintained

- [x] 7. Update Dashboard Page
  - [x] 7.1 dashboard.js fetches enrollments from API
  - [x] 7.2 No hardcoded data
  - [x] 7.3 Progress from database
  - [x] 7.4 Loading states and offline fallback

- [x] 8. Update Course Detail Page
  - [x] 8.1 course-detail.js fetches course from API
  - [x] 8.2 No hardcoded data
  - [x] 8.3 ID from URL parameter
  - [x] 8.4 Error handling and offline fallback

## Phase 3: Backend Implementations

- [x] 9. Enrollment Controller — server/controllers/enrollmentController.js
  - [x] 9.1 requestEnrollment
  - [x] 9.2 getMyEnrollments
  - [x] 9.3 updateProgress
  - [x] 9.4 getPendingRequests, getAllEnrollments
  - [x] 9.5 approveEnrollment, rejectEnrollment

- [x] 10. Enrollment Routes — server/routes/enrollments.js
  - [x] 10.1 POST /api/enrollments
  - [x] 10.2 GET /api/enrollments/my-enrollments
  - [x] 10.3 PUT /api/enrollments/:enrollmentId/progress
  - [x] 10.4 Admin routes (pending, all, approve, reject)
  - [x] 10.5 Registered in server.js

- [x] 11. Payment Controller — server/controllers/paymentController.js
  - [x] 11.1 validateCoupon
  - [x] 11.2 initiateChapaPayment (with dev mode fallback)
  - [x] 11.3 chapaWebhook, verifyPayment, devVerifyPayment
  - [x] 11.4 getMyPayments, getInvoice
  - [x] 11.5 getRevenueReport, getAllTransactions (admin)

- [x] 12. Payment Routes — server/routes/payments.js
  - [x] 12.1 POST /api/payments/initiate
  - [x] 12.2 GET /api/payments/my-payments
  - [x] 12.3 GET /api/payments/verify
  - [x] 12.4 POST /api/payments/dev-verify
  - [x] 12.5 Registered in server.js

- [x] 13. Email Utility — server/utils/sendEmail.js
  - [x] 13.1 nodemailer configured
  - [x] 13.2 sendEmail function
  - [x] 13.3 Templates: enrollmentApproved, enrollmentRejected, paymentReceipt, welcome
  - [x] 13.4 Graceful skip when SMTP not configured

## Phase 4: Frontend Integration

- [x] 14. Enrollment API methods in api.js
  - [x] 14.1 requestEnrollment
  - [x] 14.2 getMyEnrollments
  - [x] 14.3 updateProgress
  - [x] 14.4 approveEnrollment, rejectEnrollment

- [x] 15. Enrollment Flow — course-detail.js
  - [x] 15.1 enrollCourse() calls api.requestEnrollment()
  - [x] 15.2 No localStorage enrollment tracking
  - [x] 15.3 API response handling
  - [x] 15.4 UI status updates (pending/approved/rejected)

- [x] 16. Payment API methods in api.js
  - [x] 16.1 createPaymentIntent → /payments/initiate
  - [x] 16.2 confirmPayment

- [x] 17. Payment Flow — payment.js
  - [x] 17.1 Calls /payments/initiate via api.request()
  - [x] 17.2 No localStorage payment storage
  - [x] 17.3 Dev mode simulation supported
  - [x] 17.4 Redirects to payment-success.html
  - [x] 17.5 course-payment.js/html redirects to payment.html

## Phase 5: Dashboard Updates

- [x] 18. Admin Dashboard — admin-dashboard.js
  - [x] 18.1 API calls for stats, users, courses
  - [x] 18.2 No localStorage operations
  - [x] 18.3 Course approval/rejection via API
  - [x] 18.4 User management via API

- [x] 19. Instructor Dashboard — instructor-dashboard.js
  - [x] 19.1 API calls for instructor courses
  - [x] 19.2 No localStorage management
  - [x] 19.3 Course creation via API
  - [x] 19.4 Course editing via API

## Phase 6: React Components

- [x] 20. React Auth Integration
  - [x] 20.1 src/context/AuthContext.jsx — real API calls, JWT storage
  - [x] 20.2 src/pages/Login.jsx — async login, loading state, role redirect
  - [x] 20.3 src/pages/Register.jsx — async register, loading state
  - [x] 20.4 No localStorage password storage in React

## Phase 7: Bug Fixes

- [x] 21. api.js duplicate class definition removed
  - [x] 21.1 Single APIService class with all methods
  - [x] 21.2 updateProgress method restored
  - [x] 21.3 Single `const api = new APIService()` instance

## Phase 8: Testing

- [ ] 22. Manual Testing
  - [ ] 22.1 Test login flow (HTML + React)
  - [ ] 22.2 Test registration flow
  - [ ] 22.3 Test JWT token handling
  - [ ] 22.4 Test course listing
  - [ ] 22.5 Test enrollment request
  - [ ] 22.6 Test payment (dev mode)
  - [ ] 22.7 Test admin operations
  - [ ] 22.8 Test instructor operations
  - [ ] 22.9 Verify no password in localStorage
  - [ ] 22.10 Verify JWT in all API calls
