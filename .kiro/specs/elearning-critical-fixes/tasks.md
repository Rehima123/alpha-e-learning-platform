# Implementation Tasks

## Phase 1: Core API Integration

- [ ] 1. Create API Service Layer Foundation
  - [ ] 1.1 Create api/apiClient.js with fetch wrapper and JWT interceptor
  - [ ] 1.2 Create api/authService.js with login/register methods
  - [ ] 1.3 Add error handling utilities

- [ ] 2. Update Frontend Authentication - Login
  - [ ] 2.1 Update auth-login.js to call authService.login()
  - [ ] 2.2 Store only JWT token in localStorage
  - [ ] 2.3 Add loading states and error messages
  - [ ] 2.4 Handle role-based redirects

- [ ] 3. Update Frontend Authentication - Registration
  - [ ] 3.1 Update auth-register.js to call authService.register()
  - [ ] 3.2 Remove plaintext password storage
  - [ ] 3.3 Add frontend validation
  - [ ] 3.4 Handle success/error responses

- [ ] 4. Update React Auth Context
  - [ ] 4.1 Update src/context/AuthContext.jsx to decode JWT
  - [ ] 4.2 Add token expiration checking
  - [ ] 4.3 Implement auto-logout on expiry
  - [ ] 4.4 Remove localStorage password handling

## Phase 2: Course Data Integration

- [ ] 5. Create Course API Service
  - [ ] 5.1 Create api/courseService.js
  - [ ] 5.2 Add getCourses, getCourse methods
  - [ ] 5.3 Implement error handling

- [ ] 6. Update Courses Listing Page
  - [ ] 6.1 Update courses.js to fetch from API
  - [ ] 6.2 Remove hardcoded courses array
  - [ ] 6.3 Add loading spinner
  - [ ] 6.4 Add error handling
  - [ ] 6.5 Maintain filter functionality

- [ ] 7. Update Dashboard Page
  - [ ] 7.1 Update dashboard.js to fetch from API
  - [ ] 7.2 Remove hardcoded data
  - [ ] 7.3 Display progress from database
  - [ ] 7.4 Add loading states

- [ ] 8. Update Course Detail Page
  - [ ] 8.1 Update course-detail.js to fetch from API
  - [ ] 8.2 Remove hardcoded data
  - [ ] 8.3 Get ID from URL parameter
  - [ ] 8.4 Add error handling

## Phase 3: Backend Implementations

- [ ] 9. Create Enrollment Controller
  - [ ] 9.1 Create server/controllers/enrollmentController.js
  - [ ] 9.2 Implement enrollInCourse method
  - [ ] 9.3 Implement getMyEnrollments method
  - [ ] 9.4 Implement updateProgress method
  - [ ] 9.5 Add validation

- [ ] 10. Create Enrollment Routes
  - [ ] 10.1 Create server/routes/enrollments.js
  - [ ] 10.2 Add POST /api/enrollments route
  - [ ] 10.3 Add GET /api/enrollments/my-courses route
  - [ ] 10.4 Add PUT /api/enrollments/:id/progress route
  - [ ] 10.5 Register routes in server.js

- [ ] 11. Create Payment Controller
  - [ ] 11.1 Create server/controllers/paymentController.js
  - [ ] 11.2 Implement processPayment method
  - [ ] 11.3 Implement getPaymentHistory method
  - [ ] 11.4 Implement verifyPayment method
  - [ ] 11.5 Add validation logic

- [ ] 12. Create Payment Routes
  - [ ] 12.1 Create server/routes/payments.js
  - [ ] 12.2 Add POST /api/payments route
  - [ ] 12.3 Add GET /api/payments/history route
  - [ ] 12.4 Add GET /api/payments/:id/verify route
  - [ ] 12.5 Register routes in server.js

- [ ] 13. Create Email Utility
  - [ ] 13.1 Create server/utils/sendEmail.js
  - [ ] 13.2 Configure nodemailer
  - [ ] 13.3 Implement sendEmail function
  - [ ] 13.4 Add email templates
  - [ ] 13.5 Test email sending

## Phase 4: Frontend Integration

- [ ] 14. Create Enrollment Service
  - [ ] 14.1 Create api/enrollmentService.js
  - [ ] 14.2 Implement enrollInCourse
  - [ ] 14.3 Implement getMyEnrollments
  - [ ] 14.4 Implement updateProgress

- [ ] 15. Update Enrollment Flow
  - [ ] 15.1 Update course-detail.js enrollment
  - [ ] 15.2 Remove localStorage tracking
  - [ ] 15.3 Handle API responses
  - [ ] 15.4 Update UI status

- [ ] 16. Create Payment Service
  - [ ] 16.1 Create api/paymentService.js
  - [ ] 16.2 Implement processPayment
  - [ ] 16.3 Implement getPaymentHistory
  - [ ] 16.4 Add validation

- [ ] 17. Update Payment Flow
  - [ ] 17.1 Update payment.js to use API
  - [ ] 17.2 Remove localStorage storage
  - [ ] 17.3 Handle responses
  - [ ] 17.4 Update redirects
  - [ ] 17.5 Update course-payment.js

## Phase 5: Dashboard Updates

- [ ] 18. Update Admin Dashboard
  - [ ] 18.1 Update admin-dashboard.js API calls
  - [ ] 18.2 Remove localStorage operations
  - [ ] 18.3 Implement course approval
  - [ ] 18.4 Implement user management

- [ ] 19. Update Instructor Dashboard
  - [ ] 19.1 Update instructor-dashboard.js API calls
  - [ ] 19.2 Remove localStorage management
  - [ ] 19.3 Implement course creation
  - [ ] 19.4 Implement course editing

## Phase 6: Testing

- [ ] 20. Manual Testing
  - [ ] 20.1 Test login flow
  - [ ] 20.2 Test registration flow
  - [ ] 20.3 Test JWT token handling
  - [ ] 20.4 Test course listing
  - [ ] 20.5 Test enrollment
  - [ ] 20.6 Test payment
  - [ ] 20.7 Test admin operations
  - [ ] 20.8 Test instructor operations
  - [ ] 20.9 Verify no password in localStorage
  - [ ] 20.10 Verify JWT in all API calls
