# API Integration Guide

## Overview
The frontend has been updated to connect with the backend API instead of using localStorage. All authentication, course management, and admin functions now use proper API calls.

## Changes Made

### 1. API Service Layer (`api.js`)
Created a centralized API service that handles:
- JWT token management
- HTTP requests with proper headers
- Error handling
- All API endpoints (auth, courses, admin, enrollments, payments)

### 2. Frontend Files Updated

#### Authentication
- `auth-login.js` - Now calls `/api/auth/login`
- `auth-register.js` - Now calls `/api/auth/register`
- Both store JWT token and user data properly

#### Courses
- `courses.js` - Fetches courses from `/api/courses`
- Loads user enrollments from `/api/enrollments/my-enrollments`
- Filters courses by category via API

#### Admin Dashboard
- `admin-dashboard.js` - Uses API for:
  - Getting pending courses
  - Approving/rejecting courses
  - Managing users
  - Platform statistics

#### Instructor Dashboard
- `instructor-dashboard.js` - Uses API for:
  - Creating new courses
  - Loading instructor's courses
  - Course status tracking

### 3. Backend Endpoints Implemented

#### Enrollments (`server/controllers/enrollmentController.js`)
- `POST /api/enrollments` - Enroll in a course
- `GET /api/enrollments/my-enrollments` - Get user's enrollments
- `PUT /api/enrollments/:id/progress` - Update progress

#### Admin Stats
- `GET /api/admin/stats` - Platform statistics

## Setup Instructions

### 1. Environment Configuration
Create `.env` file in the `server/` directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/elearning
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Install Dependencies
```bash
cd server
npm install
```

### 3. Start Backend Server
```bash
cd server
npm start
```

The server will run on `http://localhost:5000`

### 4. Update API Base URL (if needed)
If your backend runs on a different port, update `api.js`:
```javascript
const API_BASE_URL = 'http://localhost:YOUR_PORT/api';
```

### 5. Serve Frontend
You can use any static server. Examples:

Using Python:
```bash
python -m http.server 8000
```

Using Node.js http-server:
```bash
npx http-server -p 8000
```

Access the app at `http://localhost:8000`

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Courses
- `GET /api/courses` - Get all approved courses
- `GET /api/courses/:id` - Get single course
- `POST /api/courses` - Create course (Instructor only)
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course
- `GET /api/courses/instructor/my-courses` - Get instructor's courses

### Admin
- `GET /api/admin/courses/pending` - Get pending courses
- `PUT /api/admin/courses/:id/approve` - Approve course
- `PUT /api/admin/courses/:id/reject` - Reject course
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/activate` - Activate user
- `PUT /api/admin/users/:id/deactivate` - Deactivate user
- `GET /api/admin/stats` - Get platform statistics

### Enrollments
- `POST /api/enrollments` - Enroll in course
- `GET /api/enrollments/my-enrollments` - Get user enrollments
- `PUT /api/enrollments/:id/progress` - Update progress

## Security Features

### JWT Authentication
- All protected routes require `Authorization: Bearer <token>` header
- Tokens stored in localStorage
- Automatic token inclusion in API requests

### Role-Based Access Control
- Admin routes require admin role
- Instructor routes require instructor role
- Course creation restricted to instructors

### CORS Configuration
- Backend configured to accept requests from frontend origin
- Credentials enabled for cookie support

## Testing the Integration

### 1. Test Registration
1. Go to `/auth-register.html`
2. Fill in the form
3. Check browser console for API call
4. Verify JWT token in localStorage

### 2. Test Login
1. Go to `/auth-login.html`
2. Login with registered credentials
3. Verify redirect based on role

### 3. Test Course Loading
1. Login as student
2. Go to `/courses.html`
3. Courses should load from API
4. Check Network tab for API calls

### 4. Test Admin Functions
1. Login as admin (create admin user first)
2. Go to `/admin-dashboard.html`
3. Test course approval/rejection
4. Test user management

### 5. Test Instructor Functions
1. Login as instructor
2. Go to `/instructor-dashboard.html`
3. Create a new course
4. Verify it appears in pending courses

## Troubleshooting

### CORS Errors
- Ensure backend CORS is configured for your frontend URL
- Check `CLIENT_URL` in `.env` matches your frontend URL

### 401 Unauthorized
- Check if JWT token is stored in localStorage
- Verify token is being sent in Authorization header
- Check token expiration

### 404 Not Found
- Verify backend server is running
- Check API_BASE_URL in `api.js`
- Ensure route exists in backend

### Network Errors
- Check if backend server is running on correct port
- Verify MongoDB connection
- Check browser console for detailed errors

## Next Steps

### Still Using localStorage
These features still need API integration:
- Payment processing
- Subscription management
- Course detail page
- Dashboard/My Learning page

### Recommended Improvements
1. Add loading spinners during API calls
2. Implement token refresh mechanism
3. Add better error messages
4. Implement payment gateway integration
5. Add file upload for course materials
6. Implement real-time notifications

## Migration Notes

### Data Migration
The old localStorage data won't automatically transfer to the database. To migrate:
1. Export localStorage data
2. Create migration script
3. Import into MongoDB

### Backward Compatibility
The system no longer uses localStorage for core functionality. If you need to maintain old data:
1. Create a migration endpoint
2. Send localStorage data to backend
3. Backend processes and stores in MongoDB
