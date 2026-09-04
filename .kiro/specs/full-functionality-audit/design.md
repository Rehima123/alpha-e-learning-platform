# Design Document — Full Functionality Audit

## Overview

The **Alpha Freshman Tutorial** e-learning platform has four broken or missing subsystems that block real users from completing key flows. This design covers the concrete changes needed to fix them, in priority order:

1. **P1 — React Auth / Phone Number Bug**: The React UI sends `phoneNumber` but the backend only accepts `email`. Three files need surgery.
2. **P2 — Subscription Lifecycle**: `subscription.js` redirects but the backend has no `/api/subscriptions` routes. Three new files needed.
3. **P3 — File Upload**: Instructors can only enter URLs; there is no `multipart/form-data` endpoint. Two new files and multer middleware needed.
4. **P4 — Offline Indicator**: `api.js` silently enters offline mode with no user-visible feedback.

No architectural changes are required — the existing Express/Mongoose/Vanilla-JS stack is extended in place.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                       │
│  ┌──────────────────┐   ┌────────────────────────────────┐   │
│  │  React (Vite)    │   │  Vanilla HTML/JS pages          │   │
│  │  src/            │   │  *.html / *.js                  │   │
│  │  AuthForm.jsx    │   │  api.js  ←── offline banner P4  │   │
│  │  AuthContext.jsx │   │  subscription.js ←── P2 client  │   │
│  └────────┬─────────┘   └────────────────────────────────┘   │
│           │ fetch /api/*                                       │
└───────────┼──────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────┐
│  Express (server/)                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ routes/auth.js │  │routes/          │  │routes/         │  │
│  │ (P1 modified)  │  │subscriptions.js│  │upload.js       │  │
│  │                │  │(P2 new)        │  │(P3 new)        │  │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘  │
│          │                   │                    │            │
│  ┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐  │
│  │authController  │  │subscription    │  │uploadController│  │
│  │(P1 modified)   │  │Controller      │  │(P3 new)        │  │
│  │                │  │(P2 new)        │  │+ multer middleware│ │
│  └───────┬────────┘  └───────┬────────┘  └────────────────┘  │
│          │                   │                                  │
│  ┌───────▼────────┐  ┌───────▼────────┐                        │
│  │ models/User.js │  │ models/User.js │                        │
│  │ +phoneNumber   │  │ subscription   │                        │
│  │ (P1 modified)  │  │ (already exists│                        │
│  └────────────────┘  └────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### P1 — React Auth Phone Number Fix

#### `server/models/User.js`

Add `phoneNumber` field to the schema, **after** the `email` field. Make `email` optional and `phoneNumber` optional, but require at least one via a pre-validate hook.

```js
phoneNumber: {
    type: String,
    unique: true,
    sparse: true,   // sparse index: only indexes documents where field exists
    trim: true,
    match: [/^\+?[\d\s\-]{7,15}$/, 'Please provide a valid phone number']
}
```

The `email` field's `required` must change from `[true, '...']` to `false`.  
A schema-level `pre('validate')` hook enforces that at least one of `email` or `phoneNumber` is present:

```js
userSchema.pre('validate', function(next) {
    if (!this.email && !this.phoneNumber) {
        this.invalidate('email', 'Either email or phone number is required');
    }
    next();
});
```

#### `server/routes/auth.js`

The express-validator rules for `/register` and `/login` must be loosened to allow phone-number-only requests.

**register validator** — replace current validators with:
```js
body('fullName').trim().notEmpty().withMessage('Full name is required'),
body('email').optional().isEmail().withMessage('Please provide a valid email'),
body('phoneNumber').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
body('role').optional().isIn(['student', 'instructor']).withMessage('Invalid role')
```

**login validator** — replace current validators with:
```js
body('email').optional().isEmail().withMessage('Please provide a valid email'),
body('phoneNumber').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
body('password').notEmpty().withMessage('Password is required')
```

#### `server/controllers/authController.js`

**`register` function** — updated signature and duplicate-check logic:

```js
exports.register = async (req, res, next) => {
    const { fullName, email, phoneNumber, password, role, educationLevel } = req.body;

    // Require at least one identifier
    if (!email && !phoneNumber) {
        return res.status(400).json({ success: false, message: 'Email or phone number is required' });
    }

    // Duplicate check — email
    if (email) {
        const byEmail = await User.findOne({ email });
        if (byEmail) return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Duplicate check — phoneNumber
    if (phoneNumber) {
        const byPhone = await User.findOne({ phoneNumber });
        if (byPhone) return res.status(400).json({ success: false, message: 'User already exists with this phone number' });
    }

    const user = await User.create({ fullName, email, phoneNumber, password, role: role || 'student', educationLevel });
    const token = user.generateAuthToken();
    // ... rest unchanged
};
```

**`login` function** — updated lookup logic:

```js
exports.login = async (req, res, next) => {
    const { email, phoneNumber, password } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({ success: false, message: 'Email or phone number is required' });
    }

    const query = email ? { email } : { phoneNumber };
    const user = await User.findOne(query).select('+password');
    // ... rest unchanged (isActive check, comparePassword, token generation)
};
```

The response object must also include `phoneNumber` when present:

```js
user: {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    avatar: user.avatar
}
```

#### `api.js` — `_offlineFallback`

**Login fallback** — extend the user lookup:
```js
const user = users.find(u =>
    (body.email    && u.email       === body.email    && u.password === body.password) ||
    (body.phoneNumber && u.phoneNumber === body.phoneNumber && u.password === body.password)
);
```

**Register fallback** — store `phoneNumber` when email is absent:
```js
const newUser = {
    id: 'user-' + Date.now(),
    fullName: body.fullName,
    email: body.email || null,
    phoneNumber: body.phoneNumber || null,
    password: body.password,
    role: body.role || 'student',
    isActive: true,
    createdAt: new Date().toISOString()
};
// Duplicate check for phoneNumber
if (body.phoneNumber && users.find(u => u.phoneNumber === body.phoneNumber)) {
    return { success: false, message: 'User already exists with this phone number' };
}
```

---

### P2 — Subscription Lifecycle

The `paymentController.js` already handles subscription payments and updates `user.subscription` when a payment completes. What is missing is the read/cancel/renew API surface.

#### `server/routes/subscriptions.js` (new file)

```js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

// GET  /api/subscriptions/me      — current user's subscription status
router.get('/me', protect, subscriptionController.getMySubscription);

// PUT  /api/subscriptions/cancel  — cancel active subscription
router.put('/cancel', protect, subscriptionController.cancelSubscription);

// PUT  /api/subscriptions/renew   — re-initiate payment for current plan
router.put('/renew', protect, subscriptionController.renewSubscription);

module.exports = router;
```

Register in `server/server.js`:
```js
const subscriptionRoutes = require('./routes/subscriptions');
app.use('/api/subscriptions', subscriptionRoutes);
```

#### `server/controllers/subscriptionController.js` (new file)

```js
const User = require('../models/User');
const Payment = require('../models/Payment');
const axios = require('axios');

// GET /api/subscriptions/me
exports.getMySubscription = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('subscription fullName email');
        const sub  = user.subscription || {};
        const now  = new Date();
        const isActive = (sub.plan === 'monthly' || sub.plan === 'annual')
            && sub.status === 'active'
            && sub.endDate
            && new Date(sub.endDate) > now;

        res.json({
            success: true,
            subscription: {
                plan:      sub.plan     || 'free',
                status:    sub.status   || 'active',
                startDate: sub.startDate || null,
                endDate:   sub.endDate   || null,
                isActive
            }
        });
    } catch (error) { next(error); }
};

// PUT /api/subscriptions/cancel
exports.cancelSubscription = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { 'subscription.status': 'cancelled' },
            { new: true }
        );
        res.json({ success: true, message: 'Subscription cancelled', subscription: user.subscription });
    } catch (error) { next(error); }
};

// PUT /api/subscriptions/renew
// Re-initiates a Chapa payment (or dev-mode) for the user's current plan.
exports.renewSubscription = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('subscription fullName email');
        const plan = user.subscription?.plan;
        if (!plan || plan === 'free') {
            return res.status(400).json({ success: false, message: 'No plan to renew. Please subscribe first.' });
        }

        const plans   = { monthly: 1650, annual: 11300 }; // ETB
        const subtotal = plans[plan];
        const tax      = Math.round(subtotal * 0.15);
        const total    = subtotal + tax;
        const txRef    = `AFT-RENEW-${Date.now()}-${req.user.id.toString().slice(-6)}`;

        const Payment = require('../models/Payment');
        const payment = await Payment.create({
            student: req.user.id,
            type: 'subscription',
            plan,
            subtotal, discount: 0, tax, total,
            currency: 'ETB',
            provider: 'chapa',
            txRef,
            instructorShare: 0,
            platformShare: Math.round(total * 0.30)
        });

        const chapaKey = process.env.CHAPA_SECRET_KEY;
        if (!chapaKey) {
            return res.json({ success: true, devMode: true, message: 'Dev mode renewal simulated', txRef, paymentId: payment._id, total });
        }

        const chapaRes = await axios.post('https://api.chapa.co/v1/transaction/initialize', {
            amount: total, currency: 'ETB',
            email: user.email,
            first_name: user.fullName.split(' ')[0],
            last_name:  user.fullName.split(' ').slice(1).join(' ') || 'User',
            tx_ref: txRef,
            callback_url: `${process.env.SERVER_URL}/api/payments/chapa-webhook`,
            return_url:   `${process.env.CLIENT_URL}/payment-success.html?tx_ref=${txRef}`,
            customization: { title: 'Alpha Freshman Tutorial', description: `${plan} Subscription Renewal` }
        }, { headers: { Authorization: `Bearer ${chapaKey}` } });

        res.json({ success: true, checkoutUrl: chapaRes.data.data.checkout_url, txRef, paymentId: payment._id, total });
    } catch (error) { next(error); }
};
```

#### `subscription.js` (client-side additions)

Add two new exported functions and update `hasActiveSubscription` to call the new endpoint:

```js
// Replace the hasActiveSubscription try block fetch call:
const res = await api.request('/subscriptions/me');
if (!res.success) return false;
return res.subscription.isActive;

// New: cancelSubscription
async function cancelSubscription() {
    const res = await api.request('/subscriptions/cancel', { method: 'PUT' });
    if (res.success) {
        // Update cached user
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (user.subscription) user.subscription.status = 'cancelled';
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
    return res;
}

// New: renewSubscription
async function renewSubscription() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const plan = user?.subscription?.plan;
    if (!plan || plan === 'free') {
        window.location.href = 'subscription.html';
        return;
    }
    const res = await api.request('/subscriptions/renew', { method: 'PUT' });
    if (res.checkoutUrl) window.location.href = res.checkoutUrl;
    else if (res.devMode) window.location.href = `payment-success.html?tx_ref=${res.txRef}`;
    return res;
}
```

Also add `api.js` method stubs:
```js
async getMySubscription()       { return this.request('/subscriptions/me'); }
async cancelSubscription()      { return this.request('/subscriptions/cancel', { method: 'PUT' }); }
async renewSubscription()       { return this.request('/subscriptions/renew',  { method: 'PUT' }); }
```

---

### P3 — File Upload

#### `server/middleware/upload.js` (new file)

Uses `multer` with `diskStorage` for local dev; swap the storage engine to a cloud adapter (e.g., `multer-storage-cloudinary`) in production without changing any controller code.

```js
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    file:  ['application/pdf', 'video/mp4', 'video/webm', 'application/zip']
};
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sub = file.mimetype.startsWith('image/') ? 'images' : 'files';
        const dir = path.join(UPLOAD_DIR, sub);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, name);
    }
});

function fileFilter(allowedMimes) {
    return (req, file, cb) => {
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(Object.assign(new Error('Unsupported file type'), { statusCode: 400 }), false);
        }
    };
}

exports.uploadImage = multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: fileFilter(ALLOWED_TYPES.image)
}).single('image');

exports.uploadFile = multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: fileFilter(ALLOWED_TYPES.file)
}).single('file');
```

#### `server/controllers/uploadController.js` (new file)

```js
const path = require('path');

const BASE_URL = process.env.SERVER_URL || 'http://localhost:5000';

// POST /api/upload/image
exports.uploadImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided' });
    }
    const relativePath = req.file.path.replace(/\\/g, '/').split('/uploads/')[1];
    const url = `${BASE_URL}/uploads/${relativePath}`;
    res.status(201).json({ success: true, url, filename: req.file.filename });
};

// POST /api/upload/file
exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
    }
    const relativePath = req.file.path.replace(/\\/g, '/').split('/uploads/')[1];
    const url = `${BASE_URL}/uploads/${relativePath}`;
    res.status(201).json({ success: true, url, filename: req.file.filename });
};
```

#### `server/routes/upload.js` (new file)

```js
const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadImage, uploadFile } = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');

// Error wrapper — multer throws synchronously; this catches it and forwards to Express error handler
function multerWrap(uploadFn) {
    return (req, res, next) => {
        uploadFn(req, res, (err) => {
            if (!err) return next();
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ success: false, message: 'File too large' });
            }
            err.statusCode = err.statusCode || 400;
            next(err);
        });
    };
}

// POST /api/upload/image  — instructors and admins only
router.post('/image', protect, authorize('instructor','admin','super_admin','content_admin'),
    multerWrap(uploadImage), uploadController.uploadImage);

// POST /api/upload/file   — instructors and admins only
router.post('/file',  protect, authorize('instructor','admin','super_admin','content_admin'),
    multerWrap(uploadFile),  uploadController.uploadFile);

module.exports = router;
```

Register in `server/server.js`:
```js
const uploadRoutes = require('./routes/upload');
app.use('/api/upload', uploadRoutes);
```

Also add `api.js` upload helpers (these use `fetch` directly since `request()` forces `Content-Type: application/json`):

```js
async uploadImage(file) {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${this.baseURL}/upload/image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` },
        body: form
    });
    return res.json();
}

async uploadFile(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${this.baseURL}/upload/file`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` },
        body: form
    });
    return res.json();
}
```

**multer dependency**: Add to `server/package.json`:
```
"multer": "^1.4.5-lts.1"
```

---

### P4 — Offline Indicator

In `api.js`, extend the `_offlineFallback` activation path to surface a banner. The existing `request()` method sets `this.offlineMode = true` then calls `_offlineFallback()`. Add a single helper call there:

```js
// In the catch block of request(), before returning _offlineFallback():
this.offlineMode = true;
this._showOfflineBanner();
return this._offlineFallback(endpoint, options);

// New method on APIService:
_showOfflineBanner() {
    if (document.getElementById('api-offline-banner')) return; // already shown
    const banner = document.createElement('div');
    banner.id = 'api-offline-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');
    banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
        'background:#b91c1c', 'color:#fff', 'text-align:center',
        'padding:10px 16px', 'font-size:14px', 'font-weight:600',
        'box-shadow:0 2px 8px rgba(0,0,0,0.3)'
    ].join(';');
    banner.textContent = '⚠️ You are offline — showing cached data';
    document.body.prepend(banner);
}

_hideOfflineBanner() {
    document.getElementById('api-offline-banner')?.remove();
}
```

Call `_hideOfflineBanner()` when `offlineMode` goes back to `false` inside `request()`:
```js
this.offlineMode = false;
this._hideOfflineBanner();
```

---

## Data Models

### User Schema changes (P1)

| Field | Type | Constraints |
|---|---|---|
| `email` | String | optional (was required), unique, lowercase, sparse index |
| `phoneNumber` | String | optional, unique, sparse index, trim |
| `educationLevel` | String | optional — store the React form's education level value |

**Index strategy**: Both `email` and `phoneNumber` use `sparse: true` so that documents without the field are excluded from the unique index (multiple null-field documents are allowed).

### Subscription data (P2)

No schema changes needed — `user.subscription` with `plan / status / startDate / endDate` already exists in `User.js`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Phone-number registration creates a retrievable user

*For any* valid `phoneNumber`, `fullName`, and `password`, POSTing to `/api/auth/register` with those values and no email SHALL return a user object whose `phoneNumber` matches the submitted value.

**Validates: Requirements 1.1, 1.3**

---

### Property 2: Phone-number login returns a JWT token

*For any* user created with a `phoneNumber`, POSTing to `/api/auth/login` with that `phoneNumber` and the correct `password` SHALL return a JWT `token` string.

**Validates: Requirements 1.2**

---

### Property 3: AuthContext routes by identifier type

*For any* identifier string, `AuthContext.login()` SHALL send `{ email }` in the request body when the string contains `@`, and SHALL send `{ phoneNumber }` when the string does not contain `@`.

**Validates: Requirements 1.4**

---

### Property 4: Phone-only registration requires no email field

*For any* registration payload that contains `phoneNumber` and `password` but omits `email`, the backend SHALL respond with HTTP 201 — never with a 400 error citing a missing email.

**Validates: Requirements 1.6**

---

### Property 5: Offline fallback matches by phoneNumber when email is absent

*For any* offline user store containing users with `phoneNumber` fields, calling the offline login handler with a `{ phoneNumber, password }` body (no email) SHALL return the matching user when credentials are correct, and SHALL return an error when they are incorrect.

**Validates: Requirements 1.7, 10.2**

---

### Property 6: Offline registration stores phoneNumber

*For any* phone-only registration payload (phoneNumber present, email absent), the offline register handler SHALL persist a user object to localStorage that contains the submitted `phoneNumber` value.

**Validates: Requirements 10.3**

---

### Property 7: All API requests carry the Authorization header when a token exists

*For any* API endpoint and any non-null token stored in localStorage, `APIService.request()` SHALL include `Authorization: Bearer <token>` in the request headers.

**Validates: Requirements 2.5**

---

### Property 8: Upload endpoint rejects unsupported MIME types

*For any* file whose MIME type is not in `['image/jpeg','image/png','image/webp','image/gif','application/pdf','video/mp4','video/webm','application/zip']`, the upload endpoint SHALL return HTTP 400.

**Validates: Requirements 11.3**

---

### Property 9: Successful upload returns a non-empty URL

*For any* file with a valid MIME type and size ≤ 10 MB, POSTing to `/api/upload/image` or `/api/upload/file` SHALL return a response with `success: true` and a non-empty `url` string.

**Validates: Requirements 11.5**

---

## Error Handling

### Auth (P1)

| Scenario | HTTP | Message |
|---|---|---|
| Neither email nor phoneNumber provided | 400 | `"Email or phone number is required"` |
| Duplicate email on register | 400 | `"User already exists with this email"` |
| Duplicate phoneNumber on register | 400 | `"User already exists with this phone number"` |
| Invalid credentials on login | 401 | `"Invalid credentials"` |
| Deactivated account | 401 | `"Your account has been deactivated"` |

### Subscription (P2)

| Scenario | HTTP | Message |
|---|---|---|
| Renew with no plan (free user) | 400 | `"No plan to renew. Please subscribe first."` |
| Cancel non-existent subscription | 200 | Sets status to `"cancelled"` regardless (idempotent) |

### File Upload (P3)

| Scenario | HTTP | Message |
|---|---|---|
| No file attached | 400 | `"No image file provided"` / `"No file provided"` |
| Unsupported MIME type | 400 | `"Unsupported file type"` |
| File exceeds 10 MB | 413 | `"File too large"` |
| Unauthenticated request | 401 | (from `protect` middleware) |
| Wrong role | 403 | (from `authorize` middleware) |

---

## Testing Strategy

### Unit tests (example-based)

These test specific concrete scenarios:

- `authController.register` with `phoneNumber` and no `email` → 201, user returned
- `authController.register` with duplicate `phoneNumber` → 400
- `authController.login` with `phoneNumber` → 200, token returned
- `authController.login` with neither identifier → 400
- `_offlineFallback` login with `phoneNumber` body → returns matching user
- `_offlineFallback` register stores `phoneNumber` field
- `subscriptionController.getMySubscription` — active vs expired subscription
- `subscriptionController.cancelSubscription` — sets status to `"cancelled"`
- `subscriptionController.renewSubscription` — dev mode returns `txRef`
- `uploadController.uploadImage` — `req.file` present → 201 with URL
- `uploadController.uploadFile` — `req.file` absent → 400

### Property-based tests

Use **fast-check** (JavaScript) or **jest-fast-check** for the following properties. Each test runs a minimum of **100 iterations**.

```
Feature: full-functionality-audit, Property 1: phone-number registration creates a retrievable user
Feature: full-functionality-audit, Property 2: phone-number login returns a JWT token
Feature: full-functionality-audit, Property 3: AuthContext routes by identifier type
Feature: full-functionality-audit, Property 4: phone-only registration requires no email field
Feature: full-functionality-audit, Property 5: offline fallback matches by phoneNumber
Feature: full-functionality-audit, Property 6: offline registration stores phoneNumber
Feature: full-functionality-audit, Property 7: all API requests carry Authorization header
Feature: full-functionality-audit, Property 8: upload rejects unsupported MIME types
Feature: full-functionality-audit, Property 9: successful upload returns non-empty URL
```

Properties 1, 2, 4 are integration-style (hit the real controller with a test DB). Properties 3, 5, 6, 7 are pure unit tests against extracted logic functions. Properties 8, 9 use multer with an in-memory mock storage.

### Integration tests

- End-to-end React registration → login with phone number (Playwright or Cypress)
- Subscription cancel flow: POST payment → PUT /subscriptions/cancel → GET /subscriptions/me → status = cancelled
- File upload: POST /api/upload/image → verify URL is accessible via GET

### Smoke tests

- Server starts with new routes registered (no 404 on `/api/subscriptions/me`, `/api/upload/image`)
- `User.phoneNumber` field has a sparse unique index in MongoDB (`db.users.getIndexes()`)
