# Implementation Plan: Full Functionality Audit

## Overview

Fix four broken or missing subsystems in priority order: P1 (React Auth phone number bug — blocks all React logins), P2 (Subscription lifecycle — missing API surface), P3 (File upload — no multipart endpoint), P4 (Offline indicator — silent failure). Each group of tasks builds on the previous and ends with everything wired together.

## Tasks

- [x] 1. P1 — Fix User model to support phone number
  - In `server/models/User.js`, change `email.required` from `[true, '...']` to `false`
  - Add `phoneNumber` field with `sparse: true` unique index after the email field
  - Add `educationLevel` String field (optional) if not already present
  - Add a `pre('validate')` hook that calls `this.invalidate('email', ...)` when both `email` and `phoneNumber` are absent
  - _Requirements: 1.3, 1.6_

- [x] 2. P1 — Loosen auth route validators for phone-number flows
  - In `server/routes/auth.js`, replace the `/register` express-validator chain so `email` is `.optional()` and `phoneNumber` is `.optional().isMobilePhone()`
  - Replace the `/login` validator chain so `email` is `.optional()` and `phoneNumber` is `.optional()`; `password` remains `.notEmpty()`
  - _Requirements: 1.1, 1.2_

- [x] 3. P1 — Update authController register and login for phone number
  - In `server/controllers/authController.js`, destructure `phoneNumber` and `educationLevel` from `req.body` in `register`
  - Add early-exit guard: if `!email && !phoneNumber` return HTTP 400 `"Email or phone number is required"`
  - Add separate duplicate checks for email (if provided) and phoneNumber (if provided) with distinct error messages
  - Pass `phoneNumber` and `educationLevel` to `User.create()`
  - In `login`, destructure `phoneNumber`, add the same early-exit guard, build `query` as `email ? { email } : { phoneNumber }`, call `User.findOne(query).select('+password')`
  - Include `phoneNumber` in the response `user` object for both `register` and `login`
  - _Requirements: 1.1, 1.2, 1.5, 1.6_

- [x] 4. P1 — Fix AuthContext to route by identifier type
  - In `src/context/AuthContext.jsx`, find the `login` function's fetch/axios call
  - If the identifier contains `@`, send `{ email: identifier, password }` — otherwise send `{ phoneNumber: identifier, password }`
  - In the `register` call, forward `phoneNumber` and `educationLevel` from the form payload when email is absent
  - Store `phoneNumber` from the response into the auth state alongside `email`
  - _Requirements: 1.4_

- [x] 5. P1 — Fix offline fallback to match and store phone number
  - In `api.js`, inside `_offlineFallback()`, locate the login handler and extend the `users.find()` predicate to also match by `phoneNumber` when `body.email` is absent
  - In the register handler, add a duplicate-phone check before creating the new user, and include `phoneNumber: body.phoneNumber || null` in the stored user object
  - _Requirements: 1.7, 10.2, 10.3_

  - [ ]* 5.1 Write property test — Property 5: offline fallback matches by phoneNumber
    - Use **jest-fast-check** to generate arbitrary valid `phoneNumber`/`password` pairs
    - Seed `localStorage` with matching user, call offline login handler, assert user returned
    - Also assert error returned for wrong password
    - **Property 5: Offline fallback matches by phoneNumber when email is absent**
    - **Validates: Requirements 1.7, 10.2**

  - [ ]* 5.2 Write property test — Property 6: offline registration stores phoneNumber
    - Generate arbitrary phone-only payloads (phoneNumber present, email absent)
    - Call offline register handler, read localStorage, assert stored user has matching `phoneNumber`
    - **Property 6: Offline registration stores phoneNumber**
    - **Validates: Requirements 10.3**

- [ ] 6. P1 — Property tests for backend auth phone-number behaviour
  - Set up **jest-fast-check** (or **fast-check** with Jest) in `server/` — add to `server/package.json` devDependencies as `"fast-check": "^3.0.0"`
  - Create `server/tests/auth.property.test.js`

  - [ ]* 6.1 Write property test — Property 1: phone-number registration creates a retrievable user
    - Generate arbitrary valid phone strings, fullName, and password
    - POST to authController `register` function (unit-tested against an in-memory MongoDB via `mongodb-memory-server`)
    - Assert response `user.phoneNumber` equals submitted value
    - **Property 1: Phone-number registration creates a retrievable user**
    - **Validates: Requirements 1.1, 1.3**

  - [ ]* 6.2 Write property test — Property 2: phone-number login returns a JWT token
    - For each user created in Property 1, POST to `login` with `phoneNumber` + correct password
    - Assert response contains a non-empty `token` string
    - **Property 2: Phone-number login returns a JWT token**
    - **Validates: Requirements 1.2**

  - [ ]* 6.3 Write property test — Property 3: AuthContext routes by identifier type
    - Extract the identifier-routing logic into a pure helper in `src/context/AuthContext.jsx`
    - Generate arbitrary strings with and without `@`
    - Assert helper returns `{ email }` payload when `@` is present, `{ phoneNumber }` otherwise
    - **Property 3: AuthContext routes by identifier type**
    - **Validates: Requirements 1.4**

  - [ ]* 6.4 Write property test — Property 4: phone-only registration requires no email field
    - Generate payloads with `phoneNumber` + `password`, omitting `email`
    - Call `register` controller, assert HTTP status is 201 (never 400 citing missing email)
    - **Property 4: Phone-only registration requires no email field**
    - **Validates: Requirements 1.6**

- [ ] 7. Checkpoint — P1 complete
  - Ensure all P1 tests pass. Manual smoke: register via React UI with a phone number, log in with that phone number, verify JWT returned and user lands on correct dashboard. Ask the user if any questions arise.

- [x] 8. P2 — Create subscription backend routes and controller
  - Create `server/routes/subscriptions.js` with routes: `GET /me`, `PUT /cancel`, `PUT /renew` — all behind `protect` middleware
  - Create `server/controllers/subscriptionController.js` implementing `getMySubscription`, `cancelSubscription`, `renewSubscription` as specified in the design
  - In `getMySubscription`, compute `isActive` from `subscription.plan`, `subscription.status`, and `subscription.endDate` vs `new Date()`
  - In `renewSubscription`, fall back to dev-mode response (`{ devMode: true, txRef, paymentId, total }`) when `CHAPA_SECRET_KEY` is not set
  - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 9. P2 — Register subscription routes in server.js
  - In `server/server.js`, add `const subscriptionRoutes = require('./routes/subscriptions');` and `app.use('/api/subscriptions', subscriptionRoutes);`
  - Place the registration line alongside the other route registrations (before the error handler)
  - _Requirements: 9.3, 9.5, 9.6_

- [x] 10. P2 — Update subscription.js client to call real API
  - In `subscription.js`, replace the `hasActiveSubscription` fetch call to use `api.request('/subscriptions/me')` and read `res.subscription.isActive`
  - Add `cancelSubscription()` function that calls `api.request('/subscriptions/cancel', { method: 'PUT' })` and updates cached user in `localStorage`
  - Add `renewSubscription()` function that calls `api.request('/subscriptions/renew', { method: 'PUT' })` and redirects to `res.checkoutUrl` or `payment-success.html?tx_ref=` in dev mode
  - _Requirements: 9.4, 9.5, 9.6, 9.7_

- [x] 11. P2 — Add subscription helper methods to api.js
  - In `api.js`, add three methods to `APIService`: `getMySubscription()`, `cancelSubscription()`, `renewSubscription()` — each delegating to `this.request()` with the correct endpoint and method
  - _Requirements: 9.7_

- [ ] 12. Checkpoint — P2 complete
  - Smoke test: GET `/api/subscriptions/me` returns `{ success: true, subscription: { plan, status, isActive } }`. PUT `/api/subscriptions/cancel` sets status to `"cancelled"`. PUT `/api/subscriptions/renew` returns dev-mode `txRef` when `CHAPA_SECRET_KEY` is absent. Ask the user if any questions arise.

- [x] 13. P3 — Install multer and create upload middleware
  - Add `"multer": "^1.4.5-lts.1"` to `server/package.json` dependencies (run `npm install multer` inside `server/`)
  - Create `server/middleware/upload.js` with `diskStorage` configuration, `ALLOWED_TYPES`, `MAX_SIZE = 10 MB`, `fileFilter` function, and two exported multer instances: `uploadImage` (single `'image'`) and `uploadFile` (single `'file'`)
  - The storage `destination` callback must create `server/uploads/images/` and `server/uploads/files/` subdirectories if they do not exist
  - _Requirements: 11.3, 11.4_

- [x] 14. P3 — Create upload controller
  - Create `server/controllers/uploadController.js` with `uploadImage` and `uploadFile` handlers
  - Each handler checks `req.file` — if absent, return HTTP 400 with appropriate message
  - Build the public URL as `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/<relativePath>`
  - Return HTTP 201 with `{ success: true, url, filename }`
  - _Requirements: 11.5_

- [x] 15. P3 — Create upload routes and register in server.js
  - Create `server/routes/upload.js` with `POST /image` and `POST /file` routes, both protected by `protect` and `authorize('instructor','admin','super_admin','content_admin')`
  - Add the `multerWrap` error handler inside the router that maps `LIMIT_FILE_SIZE` → HTTP 413 `"File too large"` and unsupported type → HTTP 400
  - In `server/server.js`, add `const uploadRoutes = require('./routes/upload');` and `app.use('/api/upload', uploadRoutes);`
  - Also add `app.use('/uploads', express.static(path.join(__dirname, 'uploads')));` so uploaded files are publicly served
  - _Requirements: 11.1, 11.2, 11.4_

- [x] 16. P3 — Add upload helper methods to api.js
  - In `api.js`, add `uploadImage(file)` and `uploadFile(file)` methods to `APIService`
  - Both must use `fetch` directly (not `this.request()`) to send `multipart/form-data` — do NOT set `Content-Type` manually (let the browser set the boundary)
  - Both must attach `Authorization: Bearer ${this.getAuthToken()}` header
  - _Requirements: 11.1, 11.2_

  - [ ]* 16.1 Write property test — Property 8: upload rejects unsupported MIME types
    - Use multer with an in-memory mock storage
    - Generate arbitrary MIME type strings not in the allowed list
    - Assert the upload middleware calls `cb` with an error (statusCode 400)
    - **Property 8: Upload endpoint rejects unsupported MIME types**
    - **Validates: Requirements 11.3**

  - [ ]* 16.2 Write property test — Property 9: successful upload returns a non-empty URL
    - Generate valid image or file buffers with allowed MIME types, size ≤ 10 MB
    - POST to `uploadController` with mocked `req.file`, assert response has `success: true` and `url.length > 0`
    - **Property 9: Successful upload returns a non-empty URL**
    - **Validates: Requirements 11.5**

- [ ] 17. Checkpoint — P3 complete
  - Smoke test: POST a JPEG to `/api/upload/image` (authenticated as instructor) returns HTTP 201 with a URL. POST a PDF returns HTTP 201. POST an unsupported type returns HTTP 400. POST a 15 MB file returns HTTP 413. Ask the user if any questions arise.

- [ ] 18. P4 — Add offline banner to api.js
  - In `api.js`, add `_showOfflineBanner()` method that creates a fixed red banner (`id="api-offline-banner"`, `role="alert"`, `aria-live="polite"`) and prepends it to `document.body` — guard against duplicates with `document.getElementById` check
  - Add `_hideOfflineBanner()` method that removes the element by id if present
  - In the `catch` block of `request()` where `this.offlineMode = true` is set (just before the `_offlineFallback` call), add `this._showOfflineBanner()`
  - Where `this.offlineMode` is reset to `false` on a successful response, add `this._hideOfflineBanner()`
  - _Requirements: 10.4, 10.5_

  - [ ]* 18.1 Write property test — Property 7: all API requests carry Authorization header
    - Extract or mock `APIService.request()` header-building logic
    - Generate arbitrary endpoint strings and arbitrary non-empty token strings
    - Stub `localStorage.getItem('authToken')` to return the generated token
    - Assert the fetch call receives `Authorization: Bearer <token>` in headers
    - **Property 7: All API requests carry the Authorization header when a token exists**
    - **Validates: Requirements 2.5**

- [ ] 19. Final checkpoint — All fixes wired together
  - Ensure all automated tests pass (unit, property-based)
  - Verify server starts cleanly with all four new/modified route groups registered (`/api/auth`, `/api/subscriptions`, `/api/upload`)
  - Verify `User.phoneNumber` sparse unique index exists (`db.users.getIndexes()` in MongoDB shell)
  - Ask the user if any questions arise before marking the spec complete.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements from `requirements.md` for traceability
- P1 must be completed before P2–P4 because the User model changes affect all subsequent auth calls
- Property tests use **fast-check** / **jest-fast-check** — minimum 100 iterations each
- The `server/uploads/` directory should be added to `.gitignore`
- All `CHAPA_SECRET_KEY`-dependent paths have dev-mode fallbacks so the platform runs without a live Chapa key
