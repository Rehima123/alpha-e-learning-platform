# Requirements Document

## Introduction

This spec audits the full functional state of the **Alpha Freshman Tutorial** e-learning platform — a full-stack app with a vanilla HTML/JS frontend, a React (Vite) frontend in `src/`, and a Node.js/Express + MongoDB backend.

The platform covers: user authentication (HTML + React paths), course browsing, enrollment, payment (Chapa), instructor dashboards, admin dashboards, subscription management, and AI study assistance.

The goal of this spec is to:
1. Document exactly what is working today.
2. Identify every broken or incomplete feature.
3. Produce prioritised, actionable requirements to bring the platform to full functionality.

---

## Glossary

- **HTML_Auth**: The authentication flow in `auth-login.html` / `auth-register.html` backed by `auth-login.js` / `auth-register.js`. Uses **email** as the identifier.
- **React_Auth**: The authentication flow in `src/pages/Login.jsx` / `src/pages/Register.jsx` using `src/components/AuthForm.jsx` and `src/context/AuthContext.jsx`. Currently uses **phone number** as the identifier.
- **Backend_Auth**: The Express controller at `server/controllers/authController.js`. Accepts only **email** for both login and register.
- **User_Model**: The Mongoose schema in `server/models/User.js`. Has `email` (required, unique) and NO `phoneNumber` field.
- **API_Service**: The unified `api.js` class (`APIService`) used by all HTML/JS pages.
- **AuthContext**: `src/context/AuthContext.jsx` — the React auth state provider.
- **AuthForm**: `src/components/AuthForm.jsx` — the unified React login/register UI component.
- **Enrollment_Controller**: `server/controllers/enrollmentController.js` — handles all enrollment operations.
- **Payment_Controller**: `server/controllers/paymentController.js` — Chapa integration with dev-mode fallback.
- **Subscription_Manager**: `subscription.js` — client-side subscription check and redirect logic.
- **Offline_Fallback**: The `_offlineFallback()` method in `api.js` that uses `localStorage` when the network is unavailable.

---

## Requirements

### Requirement 1: React Authentication — Phone Number / Backend Mismatch (CRITICAL BUG)

**User Story:** As a student using the React UI, I want to register and log in with my phone number, so that I can access the platform without needing an email address.

#### Acceptance Criteria

1. WHEN a student submits the React registration form with a `phoneNumber`, `fullName`, `educationLevel`, and `password`, THE Backend_Auth SHALL accept the request and create a new user.
2. WHEN a student submits the React login form with a `phoneNumber` and `password`, THE Backend_Auth SHALL authenticate the user and return a JWT token.
3. THE User_Model SHALL store `phoneNumber` as an optional, unique-when-present indexed field.
4. WHEN the `AuthContext` receives a non-email identifier (no `@` character), THE AuthContext SHALL send `{ phoneNumber, password }` to `POST /api/auth/login` and the Backend_Auth SHALL look up the user by `phoneNumber`.
5. IF a `phoneNumber` is already registered, THEN THE Backend_Auth SHALL return HTTP 400 with the message `"User already exists with this phone number"`.
6. WHEN the Backend_Auth registers a user by phone number, THE Backend_Auth SHALL not require an `email` field — `email` SHALL be optional when `phoneNumber` is provided.
7. THE Offline_Fallback SHALL match users by `phoneNumber` when `email` is absent.

---

### Requirement 2: HTML Authentication (Currently Working — Maintain)

**User Story:** As a student or instructor, I want to register and log in via the HTML forms using my email address, so that I can access the platform.

#### Acceptance Criteria

1. WHEN a user submits the HTML login form with a valid `email` and `password`, THE HTML_Auth SHALL call `api.login({ email, password })` and store the returned JWT token in `localStorage`.
2. WHEN a user submits the HTML registration form with `fullName`, `email`, `password`, and `role`, THE HTML_Auth SHALL call `api.register()` and, on success, redirect the user based on their role.
3. IF Firebase is configured (`window.FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY'`), THEN THE HTML_Auth SHALL attempt Firebase authentication first, then sync with Backend_Auth.
4. WHEN a Firebase-authenticated user's email is not verified, THE HTML_Auth SHALL block login and display a resend-verification option.
5. WHILE a user is logged in, THE API_Service SHALL attach the JWT token as `Authorization: Bearer <token>` on all requests.
6. IF the server returns HTTP 401 with `code: "SESSION_DISPLACED"`, THEN THE API_Service SHALL clear `localStorage` and redirect to `auth-login.html`.

---

### Requirement 3: Role-Based Access Control

**User Story:** As a platform operator, I want users to be redirected to their correct dashboard after login, so that each role (student, instructor, admin) sees the right interface.

#### Acceptance Criteria

1. WHEN a user with role `student` successfully logs in, THE HTML_Auth SHALL redirect to `courses.html` and THE React_Auth SHALL navigate to `/courses`.
2. WHEN a user with role `instructor` successfully logs in, THE HTML_Auth SHALL redirect to `instructor-dashboard.html` and THE React_Auth SHALL navigate to `/instructor`.
3. WHEN a user with role `admin`, `super_admin`, `content_admin`, `finance_admin`, or `support_admin` successfully logs in, THE HTML_Auth SHALL redirect to `admin-dashboard.html` and THE React_Auth SHALL navigate to `/admin`.
4. WHILE a protected page is loading, THE auth_guard SHALL verify the JWT token is present; IF the token is absent, THEN THE auth_guard SHALL redirect to `auth-login.html`.

---

### Requirement 4: Course Listing and Detail Pages

**User Story:** As a student, I want to browse available courses and view their details, so that I can choose what to enroll in.

#### Acceptance Criteria

1. WHEN the courses page loads, THE API_Service SHALL call `GET /api/courses` and render all approved, published courses.
2. WHEN a student applies a category or search filter, THE API_Service SHALL call `GET /api/courses?category=<value>&search=<value>` and THE courses page SHALL re-render with filtered results.
3. WHEN the course detail page loads with a `courseId` URL parameter, THE API_Service SHALL call `GET /api/courses/:id` and render the full course details.
4. IF the API call fails and the device is offline, THEN THE Offline_Fallback SHALL display cached course data from `localStorage`.
5. WHILE data is loading, THE courses page and course-detail page SHALL display a loading spinner.

---

### Requirement 5: Enrollment Flow

**User Story:** As a student, I want to request enrollment in a course and track my enrollment status, so that I can access course content when approved.

#### Acceptance Criteria

1. WHEN a logged-in student clicks "Enroll" on a course detail page, THE API_Service SHALL call `POST /api/enrollments` with the `courseId`.
2. WHEN THE Enrollment_Controller receives a valid enrollment request, THE Enrollment_Controller SHALL create an enrollment record with status `"pending"` and return HTTP 201.
3. WHEN an admin approves an enrollment, THE Enrollment_Controller SHALL update the enrollment status to `"approved"` and send an approval notification email (non-blocking).
4. WHEN an admin rejects an enrollment, THE Enrollment_Controller SHALL update the enrollment status to `"rejected"` and send a rejection notification email (non-blocking).
5. WHEN a logged-in student views their dashboard, THE API_Service SHALL call `GET /api/enrollments/my-enrollments` and display all enrollment statuses.
6. WHEN a student completes a lesson, THE API_Service SHALL call `PUT /api/enrollments/:id/progress` with the progress data.
7. IF a student attempts to enroll in a course they are already enrolled in, THEN THE Enrollment_Controller SHALL return HTTP 400 with the message `"Already enrolled in this course"`.

---

### Requirement 6: Payment Flow (Chapa + Dev Mode)

**User Story:** As a student, I want to pay for a course using Chapa or a dev-mode simulation, so that my enrollment is confirmed.

#### Acceptance Criteria

1. WHEN a student initiates payment, THE API_Service SHALL call `POST /api/payments/initiate` with the `courseId` and optional `couponCode`.
2. WHEN the `CHAPA_SECRET_KEY` environment variable is set, THE Payment_Controller SHALL initiate a real Chapa payment and return a checkout URL.
3. WHEN the `CHAPA_SECRET_KEY` is not set or `DEV_MODE=true`, THE Payment_Controller SHALL simulate a payment and return a `devPaymentId`.
4. WHEN Chapa calls the webhook at `POST /api/payments/chapa-webhook`, THE Payment_Controller SHALL verify the payment signature and update the payment status to `"completed"`.
5. WHEN a payment is confirmed as `"completed"`, THE Payment_Controller SHALL automatically approve the student's enrollment for the paid course.
6. WHEN a student accesses `GET /api/payments/invoice/:id`, THE Payment_Controller SHALL return invoice data including course name, amount, discount, tax, and transaction reference.
7. IF a coupon code is invalid or expired, THEN THE Payment_Controller SHALL return HTTP 400 with the message `"Invalid or expired coupon"`.

---

### Requirement 7: Admin Dashboard

**User Story:** As an admin, I want to manage users, courses, and enrollments from a dashboard, so that I can keep the platform running.

#### Acceptance Criteria

1. WHEN the admin dashboard loads, THE API_Service SHALL call `GET /api/admin/stats` and display total users, total courses, pending courses, and pending enrollments.
2. WHEN the admin views pending courses, THE API_Service SHALL call `GET /api/admin/courses/pending` and list all courses with status `"pending"`.
3. WHEN the admin approves a course, THE API_Service SHALL call `PUT /api/admin/courses/:id/approve` and THE course's status SHALL change to `"approved"` and `isPublished` to `true`.
4. WHEN the admin rejects a course, THE API_Service SHALL call `PUT /api/admin/courses/:id/reject` and THE course's status SHALL change to `"rejected"`.
5. WHEN the admin views the user list, THE API_Service SHALL call `GET /api/admin/users` and display all users with name, email, role, and active status.
6. WHEN the admin deactivates a user, THE API_Service SHALL call `PUT /api/admin/users/:id/deactivate` and THE user's `isActive` field SHALL be set to `false`.
7. WHEN the admin views pending enrollments, THE API_Service SHALL call `GET /api/enrollments/pending` and list all pending enrollment requests.

---

### Requirement 8: Instructor Dashboard

**User Story:** As an instructor, I want to create, edit, and submit courses for approval, so that students can enroll in my content.

#### Acceptance Criteria

1. WHEN the instructor dashboard loads, THE API_Service SHALL call `GET /api/courses/instructor/my-courses` and display all courses belonging to the authenticated instructor.
2. WHEN an instructor submits a new course, THE API_Service SHALL call `POST /api/courses` with the course data and THE Instructor_Dashboard SHALL display the course with status `"pending"`.
3. WHEN an instructor edits an existing course, THE API_Service SHALL call `PUT /api/courses/:id` and THE updated course data SHALL be persisted.
4. WHEN an instructor deletes a course, THE API_Service SHALL call `DELETE /api/courses/:id` and THE course SHALL be removed from the instructor's course list.
5. WHILE a course is in `"approved"` status, THE Instructor_Dashboard SHALL display it as published and show enrolled student count.

---

### Requirement 9: Subscription Management (Currently Stub — Needs Completion)

**User Story:** As a student, I want to subscribe to a monthly or annual plan, so that I get full platform access without paying per course.

#### Acceptance Criteria

1. WHEN a student selects a subscription plan on `subscription.html`, THE Subscription_Manager SHALL redirect to `payment.html?plan=<monthly|annual>` with the plan parameter.
2. WHEN `payment.html` detects a `plan` query parameter, THE Payment_Controller SHALL create a subscription payment intent instead of a course payment.
3. WHEN a subscription payment is confirmed, THE Payment_Controller SHALL update the user's `subscription.plan`, `subscription.status`, `subscription.startDate`, and `subscription.endDate` fields.
4. WHEN a subscription expires (current date > `subscription.endDate`), THE Subscription_Manager SHALL show the subscription page instead of redirecting to `courses.html`.
5. THE Subscription_Manager SHALL expose a `cancelSubscription()` function that calls `PUT /api/subscriptions/:id/cancel` and sets `subscription.status` to `"cancelled"`.
6. THE Subscription_Manager SHALL expose a `renewSubscription()` function that re-initiates payment for the same plan.
7. WHEN checking access, THE Subscription_Manager SHALL call `GET /api/auth/me` to get the live subscription status rather than relying solely on `localStorage` cache.

---

### Requirement 10: Offline Fallback Consistency

**User Story:** As a user in a low-connectivity environment, I want the platform to degrade gracefully, so that I can still see my data when offline.

#### Acceptance Criteria

1. WHEN the network is unavailable (`!navigator.onLine` or a `TypeError` fetch error), THE API_Service SHALL set `offlineMode = true` and route to `_offlineFallback()`.
2. WHEN THE Offline_Fallback handles `POST /auth/login`, THE Offline_Fallback SHALL match by `phoneNumber` if `email` is absent.
3. WHEN THE Offline_Fallback handles `POST /auth/register`, THE Offline_Fallback SHALL store the new user with `phoneNumber` if `email` is absent.
4. WHILE in offline mode, THE API_Service SHALL display a visible offline indicator to the user.
5. WHEN the network becomes available again, THE API_Service SHALL set `offlineMode = false` on the next successful request.

---

### Requirement 11: File Upload for Course Content (Currently Missing)

**User Story:** As an instructor, I want to upload course thumbnails, PDF materials, and video files, so that students can access rich course content.

#### Acceptance Criteria

1. WHEN an instructor submits a course with a thumbnail image, THE API_Service SHALL call `POST /api/courses` with `multipart/form-data` and THE backend SHALL store the file and return a URL.
2. WHEN an instructor uploads a PDF material, THE API_Service SHALL call `POST /api/videos` (or a dedicated upload endpoint) with `multipart/form-data`.
3. WHERE file storage is configured (e.g., Cloudinary or local `uploads/` directory), THE backend SHALL validate file type (image/pdf/video) and reject unsupported types with HTTP 400.
4. IF a file exceeds the 10 MB body limit, THEN THE backend SHALL return HTTP 413 with the message `"File too large"`.
5. WHEN a file upload succeeds, THE backend SHALL return the publicly accessible URL for the uploaded file.

---

### Requirement 12: AI Study Assistant

**User Story:** As a student, I want an AI assistant to help me study, so that I can get explanations and practice questions for my courses.

#### Acceptance Criteria

1. WHEN a student sends a message in `ai-assistant.html`, THE API_Service SHALL call `POST /api/ai/chat` with the message payload.
2. WHEN the AI controller receives a request, THE AI_Controller SHALL respond within a reasonable time with a relevant answer.
3. IF the AI service is unavailable, THEN THE AI_Controller SHALL return HTTP 503 with the message `"AI service temporarily unavailable"` and the frontend SHALL display a user-friendly fallback message.
4. WHILE the AI response is loading, THE ai-assistant page SHALL display a typing indicator.

---

### Requirement 13: Single-Device Session Enforcement

**User Story:** As a platform operator, I want each user account to be limited to one active session, so that account sharing is prevented.

#### Acceptance Criteria

1. WHEN a user logs in from a new device, THE Backend_Auth SHALL generate a new `sessionId`, store it as `currentSessionToken` on the User, and invalidate the previous session.
2. WHEN a request arrives with a JWT whose `sid` does not match `currentSessionToken` in the database, THE auth middleware SHALL return HTTP 401 with `{ code: "SESSION_DISPLACED" }`.
3. WHEN THE API_Service receives HTTP 401 with `code: "SESSION_DISPLACED"`, THE API_Service SHALL clear `localStorage` and redirect to `auth-login.html` with a warning message.
4. WHEN a user explicitly logs out, THE Backend_Auth SHALL clear `currentSessionToken` from the User document.

---

### Requirement 14: Password Reset Flow

**User Story:** As a user who forgot their password, I want to reset it via email, so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN a user submits their email to `POST /api/auth/forgot-password`, THE Backend_Auth SHALL look up the user, generate a `resetPasswordToken`, save it with a 1-hour expiry, and send a reset email.
2. IF no user exists with the provided email, THEN THE Backend_Auth SHALL return HTTP 404 with the message `"No user found with this email"`.
3. WHEN a user submits a new password to `POST /api/auth/reset-password/:token`, THE Backend_Auth SHALL verify the token has not expired and update the user's password.
4. IF the reset token is invalid or expired, THEN THE Backend_Auth SHALL return HTTP 400 with the message `"Invalid or expired reset token"`.
5. WHEN a password reset is successful, THE Backend_Auth SHALL clear `resetPasswordToken` and `resetPasswordExpire` from the User document.
