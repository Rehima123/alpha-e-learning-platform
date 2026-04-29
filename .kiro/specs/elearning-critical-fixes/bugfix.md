# Bugfix Requirements Document

## Introduction

The e-learning platform suffers from a critical architectural disconnect where the frontend and backend were developed independently and never properly integrated. This has resulted in a non-functional application where:

- Frontend uses localStorage for all data operations instead of calling backend REST APIs
- Authentication systems are incompatible (localStorage vs JWT tokens)
- Security vulnerabilities exist due to plaintext password storage and lack of validation
- Course data is duplicated across multiple files with conflicting information
- Critical backend controllers and utilities are referenced but don't exist
- Payment and enrollment operations are simulated locally without database persistence

This comprehensive bugfix addresses the root cause: establishing proper frontend-backend communication, implementing secure authentication, consolidating data sources, and completing missing implementations.

## Bug Analysis

### Current Behavior (Defect)

**Authentication & Security Issues:**

1.1 WHEN a user submits login credentials via auth-login.js THEN the system stores credentials in plaintext in localStorage without calling the backend authentication API

1.2 WHEN a user registers via auth-register.js THEN the system stores user data in localStorage without calling the backend registration API or hashing passwords

1.3 WHEN the application checks authentication status THEN AuthContext.jsx reads from localStorage instead of validating JWT tokens with the backend

1.4 WHEN user credentials are stored THEN passwords are kept in plaintext in localStorage exposing them to XSS attacks

1.5 WHEN authentication is required THEN the frontend uses localStorage flags instead of sending JWT tokens in Authorization headers

**Data Inconsistency Issues:**

1.6 WHEN course data is accessed THEN multiple files (courses.js, dashboard.js, course-detail.js) contain hardcoded course arrays with conflicting IDs and information

1.7 WHEN course information is displayed THEN the frontend shows hardcoded data instead of fetching from the backend database via /api/courses

1.8 WHEN course data is updated THEN changes are not persisted because there's no single source of truth

**Missing Implementation Issues:**

1.9 WHEN payment processing is attempted via payment.js or course-payment.js THEN the system simulates payment with localStorage instead of calling a payment controller API

1.10 WHEN a user enrolls in a course THEN the enrollment is stored in localStorage only and never persisted to the database because the enrollment controller doesn't exist

1.11 WHEN the system attempts to send emails (password reset, enrollment confirmation) THEN it fails because server/utils/sendEmail.js doesn't exist

1.12 WHEN the backend tries to process payments THEN it fails because server/controllers/paymentController.js doesn't exist

1.13 WHEN the backend tries to handle enrollments THEN it fails because server/controllers/enrollmentController.js doesn't exist

**Frontend-Backend Communication Issues:**

1.14 WHEN any frontend form is submitted (login, register, payment, enrollment) THEN no HTTP requests are made to backend API endpoints

1.15 WHEN the frontend needs data THEN it reads from localStorage or hardcoded arrays instead of making GET requests to REST APIs

1.16 WHEN errors occur on the backend THEN the frontend doesn't receive or handle them because no API calls are made

**Input Validation Issues:**

1.17 WHEN user input is received on the frontend THEN no validation is performed before storing to localStorage

1.18 WHEN user input is received on the backend THEN insufficient validation allows malformed data

### Expected Behavior (Correct)

**Authentication & Security Fixes:**

2.1 WHEN a user submits login credentials via auth-login.js THEN the system SHALL make a POST request to /api/auth/login with credentials and receive a JWT token

2.2 WHEN a user registers via auth-register.js THEN the system SHALL make a POST request to /api/auth/register and the backend SHALL hash passwords before storing

2.3 WHEN the application checks authentication status THEN AuthContext.jsx SHALL validate JWT tokens by checking expiration and optionally verifying with the backend

2.4 WHEN user credentials are processed THEN passwords SHALL be hashed using bcrypt on the backend and never stored in plaintext

2.5 WHEN authentication is required THEN the frontend SHALL send JWT tokens in Authorization headers (Bearer token format) with all protected API requests

**Data Consistency Fixes:**

2.6 WHEN course data is needed THEN the frontend SHALL fetch from a single backend API endpoint (/api/courses) that queries the database

2.7 WHEN course information is displayed THEN all components (courses.js, dashboard.js, course-detail.js) SHALL use the same API data source

2.8 WHEN course data is updated THEN changes SHALL be persisted to the database via PUT/PATCH requests to /api/courses/:id

**Missing Implementation Fixes:**

2.9 WHEN payment processing is attempted THEN the system SHALL call POST /api/payments with payment details and the backend SHALL process via a payment controller

2.10 WHEN a user enrolls in a course THEN the system SHALL call POST /api/enrollments and persist the enrollment to the database via an enrollment controller

2.11 WHEN the system needs to send emails THEN server/utils/sendEmail.js SHALL exist and provide email functionality using a service like nodemailer

2.12 WHEN the backend processes payments THEN server/controllers/paymentController.js SHALL exist and handle payment logic

2.13 WHEN the backend handles enrollments THEN server/controllers/enrollmentController.js SHALL exist and manage enrollment operations

**Frontend-Backend Communication Fixes:**

2.14 WHEN any frontend form is submitted THEN the system SHALL make appropriate HTTP requests (POST/PUT) to backend API endpoints with proper error handling

2.15 WHEN the frontend needs data THEN it SHALL make GET requests to REST APIs and handle loading states and errors appropriately

2.16 WHEN errors occur on the backend THEN the frontend SHALL receive error responses and display user-friendly error messages

**Input Validation Fixes:**

2.17 WHEN user input is received on the frontend THEN the system SHALL validate input (email format, password strength, required fields) before submission

2.18 WHEN user input is received on the backend THEN the system SHALL validate and sanitize all inputs to prevent injection attacks

### Unchanged Behavior (Regression Prevention)

**Existing Functionality Preservation:**

3.1 WHEN the admin dashboard displays course management UI THEN it SHALL CONTINUE TO show the same interface layout and controls

3.2 WHEN users navigate between pages THEN the routing and navigation SHALL CONTINUE TO work as before

3.3 WHEN the UI renders course cards and lists THEN the visual presentation SHALL CONTINUE TO match the current design

3.4 WHEN users interact with forms THEN the form fields and validation messages SHALL CONTINUE TO appear in the same locations

3.5 WHEN the application loads THEN the theme system (light/dark mode) SHALL CONTINUE TO function as before

3.6 WHEN backend API endpoints that work correctly are called THEN they SHALL CONTINUE TO return the same response format

3.7 WHEN the database schema for existing models (User, Course) is accessed THEN it SHALL CONTINUE TO support current queries

3.8 WHEN JWT tokens are generated for valid logins THEN the backend SHALL CONTINUE TO use the same token structure and expiration

3.9 WHEN course data is queried from the database THEN the backend SHALL CONTINUE TO return courses in the same JSON format

3.10 WHEN users access public pages (home, course listings) THEN these SHALL CONTINUE TO be accessible without authentication


## Bug Condition Methodology

### Bug Condition Function

The bug condition identifies operations that use localStorage or hardcoded data instead of backend APIs:

```pascal
FUNCTION isBugCondition(operation)
  INPUT: operation of type SystemOperation
  OUTPUT: boolean
  
  // Returns true when operation bypasses backend API
  RETURN (
    operation.usesLocalStorage = true OR
    operation.usesHardcodedData = true OR
    operation.missingBackendEndpoint = true OR
    operation.noHTTPRequest = true OR
    operation.plaintextPassword = true OR
    operation.noJWTValidation = true
  )
END FUNCTION
```

### Fix Checking Property

For all operations that currently bypass the backend, the fixed system must use proper API communication:

```pascal
// Property: Fix Checking - Backend Integration
FOR ALL operation WHERE isBugCondition(operation) DO
  result ← executeOperation'(operation)
  ASSERT (
    result.madeHTTPRequest = true AND
    result.usedBackendAPI = true AND
    (operation.requiresAuth IMPLIES result.sentJWTToken = true) AND
    (operation.involvesPassword IMPLIES result.passwordHashed = true) AND
    result.dataFromDatabase = true
  )
END FOR
```

**Key Definitions:**
- **executeOperation**: Original function (uses localStorage/hardcoded data)
- **executeOperation'**: Fixed function (uses backend APIs with JWT auth)

### Preservation Checking Property

For all operations that already work correctly, behavior must remain unchanged:

```pascal
// Property: Preservation Checking
FOR ALL operation WHERE NOT isBugCondition(operation) DO
  ASSERT executeOperation(operation) = executeOperation'(operation)
END FOR
```

This ensures that:
- Existing working API endpoints continue to function
- UI rendering and navigation remain unchanged
- Database schema compatibility is maintained
- JWT token structure stays consistent

### Concrete Counterexamples

**Example 1: Login Operation**
```javascript
// Current (buggy): auth-login.js
Input: { email: "user@example.com", password: "pass123" }
Current Behavior: Stores in localStorage, no API call
Expected Behavior: POST to /api/auth/login, receives JWT token
Bug Condition: operation.noHTTPRequest = true
```

**Example 2: Course Data Fetch**
```javascript
// Current (buggy): courses.js
Input: Request to display courses
Current Behavior: Shows hardcoded array of 3 courses
Expected Behavior: GET /api/courses, displays database courses
Bug Condition: operation.usesHardcodedData = true
```

**Example 3: Payment Processing**
```javascript
// Current (buggy): payment.js
Input: { courseId: 1, amount: 99.99, cardInfo: {...} }
Current Behavior: Stores payment in localStorage only
Expected Behavior: POST /api/payments, processes via payment controller
Bug Condition: operation.missingBackendEndpoint = true
```

**Example 4: Password Storage**
```javascript
// Current (buggy): auth-register.js
Input: { email: "new@example.com", password: "mypass" }
Current Behavior: Stores password as "mypass" in localStorage
Expected Behavior: Backend hashes to "$2b$10$..." before storing
Bug Condition: operation.plaintextPassword = true
```

### Verification Criteria

**Fix Verification (must all pass):**
1. All authentication operations make API calls to /api/auth/*
2. All passwords are hashed with bcrypt (verify hash format starts with $2b$)
3. All protected routes send JWT tokens in Authorization headers
4. All course data comes from database via /api/courses
5. Payment controller exists and handles POST /api/payments
6. Enrollment controller exists and handles POST /api/enrollments
7. sendEmail utility exists and can send emails
8. No localStorage is used for authentication or data persistence
9. No hardcoded course arrays remain in frontend files

**Preservation Verification (must all pass):**
1. UI layout and styling remain visually identical
2. Navigation and routing continue to work
3. Existing backend endpoints return same response formats
4. Database queries for User and Course models still work
5. JWT token generation uses same secret and expiration
6. Public pages remain accessible without authentication
