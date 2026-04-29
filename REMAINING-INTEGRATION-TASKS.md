# Remaining API Integration Tasks

## Files Still Using localStorage

### 1. course-detail.js
**Current:** Reads course data from localStorage
**Needs:** 
- Fetch course by ID from `/api/courses/:id`
- Enroll functionality via `/api/enrollments`
- Check enrollment status from user's enrollments

### 2. dashboard.js (My Learning)
**Current:** Reads enrolled courses from localStorage
**Needs:**
- Fetch enrollments from `/api/enrollments/my-enrollments`
- Display progress from enrollment data
- Update progress via `/api/enrollments/:id/progress`

### 3. payment.js
**Current:** Stores payment in localStorage
**Needs:**
- Implement Stripe integration
- Create payment intent via `/api/payments/create-intent`
- Confirm payment via `/api/payments/:id/confirm`
- Update user subscription after payment

### 4. subscription.js
**Current:** Updates subscription in localStorage
**Needs:**
- Fetch subscription plans from API
- Update user subscription via API
- Handle trial period properly

### 5. course-payment.js
**Current:** Processes course payment in localStorage
**Needs:**
- Similar to payment.js
- Process course-specific payments
- Update enrollment after payment

## Backend Routes to Implement

### 1. Payment Routes (`server/routes/payments.js`)
Currently empty. Needs:
```javascript
POST /api/payments/create-intent
POST /api/payments/:id/confirm
GET /api/payments/history
```

### 2. User Routes (`server/routes/users.js`)
May need:
```javascript
GET /api/users/profile
PUT /api/users/profile
PUT /api/users/subscription
GET /api/users/dashboard
```

## React Components (src/)

### Files Using localStorage:
1. `src/pages/Login.jsx` - ✅ Already uses localStorage (needs API integration)
2. `src/pages/Register.jsx` - ✅ Already uses localStorage (needs API integration)
3. `src/context/AuthContext.jsx` - ✅ Already uses localStorage (needs API integration)

### Integration Steps for React:
1. Create `src/services/api.js` (similar to root `api.js`)
2. Update AuthContext to use API
3. Update Login/Register components
4. Add axios or fetch for HTTP requests

## Priority Order

### High Priority (Core Functionality)
1. ✅ Authentication (auth-login.js, auth-register.js) - DONE
2. ✅ Course listing (courses.js) - DONE
3. ✅ Admin dashboard (admin-dashboard.js) - DONE
4. ✅ Instructor dashboard (instructor-dashboard.js) - DONE
5. ⏳ Course detail page (course-detail.js)
6. ⏳ My Learning dashboard (dashboard.js)

### Medium Priority (Enhanced Features)
7. ⏳ Enrollment system (already backend ready)
8. ⏳ Progress tracking
9. ⏳ Course reviews
10. ⏳ User profile management

### Low Priority (Payment & Subscription)
11. ⏳ Payment processing (payment.js, course-payment.js)
12. ⏳ Subscription management (subscription.js)
13. ⏳ Payment history
14. ⏳ Stripe integration

## Quick Fix Template

For each remaining file, follow this pattern:

### 1. Add API script to HTML
```html
<script src="api.js"></script>
<script src="your-file.js"></script>
```

### 2. Replace localStorage reads with API calls
```javascript
// OLD
const courses = JSON.parse(localStorage.getItem('courses') || '[]');

// NEW
async function loadCourses() {
    try {
        const response = await api.getCourses();
        if (response.success) {
            const courses = response.courses;
            // Use courses
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
```

### 3. Replace localStorage writes with API calls
```javascript
// OLD
localStorage.setItem('enrolledCourses', JSON.stringify(enrolled));

// NEW
async function enrollInCourse(courseId) {
    try {
        const response = await api.enrollInCourse(courseId);
        if (response.success) {
            alert('Enrolled successfully!');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
```

### 4. Add error handling
```javascript
try {
    const response = await api.someMethod();
    if (response.success) {
        // Handle success
    }
} catch (error) {
    console.error('Error:', error);
    alert('Operation failed. Please try again.');
}
```

## Testing Checklist

After integrating each file:
- [ ] Check browser console for errors
- [ ] Verify API calls in Network tab
- [ ] Test with valid data
- [ ] Test with invalid data
- [ ] Test error scenarios
- [ ] Verify JWT token is sent
- [ ] Check response handling
- [ ] Test loading states
- [ ] Verify UI updates correctly

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution:** Ensure user is logged in and token is valid

### Issue: CORS Error
**Solution:** Check backend CORS configuration

### Issue: 404 Not Found
**Solution:** Verify API endpoint exists and URL is correct

### Issue: Data not updating
**Solution:** Check if API call is successful and UI is re-rendering

### Issue: Token expired
**Solution:** Implement token refresh or redirect to login
