
// API Configuration and Service Layer
// ─── SET YOUR BACKEND URL HERE ────────────────────────────────────────────────
// After deploying backend to Render, replace the URL below:
const BACKEND_URL = 'https://alpha-freshman-api.onrender.com';
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : `${BACKEND_URL}/api`;

class APIService {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.offlineMode = false;
    }

    getAuthToken() {
        return localStorage.getItem('authToken');
    }

    setAuthToken(token) {
        localStorage.setItem('authToken', token);
    }

    removeAuthToken() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getAuthToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            this.offlineMode = false;
            return data;
        } catch (error) {
            if (!navigator.onLine || error instanceof TypeError) {
                console.warn('[API] Offline — using localStorage fallback');
                this.offlineMode = true;
                return this._offlineFallback(endpoint, options);
            }
            throw error;
        }
    }

    // ── Offline localStorage fallback ──────────────────────────────────────────
    _offlineFallback(endpoint, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        const body   = options.body ? JSON.parse(options.body) : {};

        // Auth: login
        if (endpoint === '/auth/login' && method === 'POST') {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user  = users.find(u => u.email === body.email && u.password === body.password);
            if (!user) return { success: false, message: 'Invalid credentials' };
            const token = 'offline-token-' + user.id;
            this.setAuthToken(token);
            localStorage.setItem('currentUser', JSON.stringify(user));
            return { success: true, token, user };
        }

        // Auth: register
        if (endpoint === '/auth/register' && method === 'POST') {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            if (users.find(u => u.email === body.email)) {
                return { success: false, message: 'Email already registered' };
            }
            const newUser = {
                id: 'user-' + Date.now(),
                fullName: body.fullName,
                email: body.email,
                password: body.password,
                role: body.role || 'student',
                isActive: true,
                createdAt: new Date().toISOString()
            };
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            const token = 'offline-token-' + newUser.id;
            this.setAuthToken(token);
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            return { success: true, token, user: newUser };
        }

        // Auth: me
        if (endpoint === '/auth/me') {
            const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (!user) return { success: false, message: 'Not authenticated' };
            return { success: true, user };
        }

        // Courses: get all
        if (endpoint.startsWith('/courses') && method === 'GET' && endpoint === '/courses') {
            const courses = JSON.parse(localStorage.getItem('approvedCourses') || '[]');
            return { success: true, count: courses.length, courses };
        }

        // Courses: create
        if (endpoint === '/courses' && method === 'POST') {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const course = {
                _id: 'course-' + Date.now(),
                ...body,
                instructor: user.id,
                instructorName: user.fullName,
                status: 'pending',
                enrolledStudents: 0,
                rating: 0,
                createdAt: new Date().toISOString()
            };
            const pending = JSON.parse(localStorage.getItem('pendingCourses') || '[]');
            pending.push(course);
            localStorage.setItem('pendingCourses', JSON.stringify(pending));
            return { success: true, message: 'Course submitted for approval', course };
        }

        // Admin: pending courses
        if (endpoint === '/admin/courses/pending') {
            const courses = JSON.parse(localStorage.getItem('pendingCourses') || '[]');
            return { success: true, count: courses.length, courses };
        }

        // Admin: approve course
        if (endpoint.includes('/approve') && method === 'PUT') {
            const id = endpoint.split('/')[3];
            const pending  = JSON.parse(localStorage.getItem('pendingCourses') || '[]');
            const approved = JSON.parse(localStorage.getItem('approvedCourses') || '[]');
            const idx = pending.findIndex(c => c._id === id);
            if (idx !== -1) {
                const course = { ...pending[idx], status: 'approved', isPublished: true };
                pending.splice(idx, 1);
                approved.push(course);
                localStorage.setItem('pendingCourses', JSON.stringify(pending));
                localStorage.setItem('approvedCourses', JSON.stringify(approved));
                return { success: true, message: 'Course approved', course };
            }
            return { success: false, message: 'Course not found' };
        }

        // Admin: reject course
        if (endpoint.includes('/reject') && method === 'PUT') {
            const id = endpoint.split('/')[3];
            const pending = JSON.parse(localStorage.getItem('pendingCourses') || '[]');
            const idx = pending.findIndex(c => c._id === id);
            if (idx !== -1) {
                pending[idx].status = 'rejected';
                localStorage.setItem('pendingCourses', JSON.stringify(pending));
                return { success: true, message: 'Course rejected' };
            }
            return { success: false, message: 'Course not found' };
        }

        // Admin: all users
        if (endpoint === '/admin/users') {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            return { success: true, count: users.length, users };
        }

        // Admin: stats
        if (endpoint === '/admin/stats') {
            const users    = JSON.parse(localStorage.getItem('users') || '[]');
            const pending  = JSON.parse(localStorage.getItem('pendingCourses') || '[]');
            const approved = JSON.parse(localStorage.getItem('approvedCourses') || '[]');
            return {
                success: true,
                stats: {
                    totalUsers:       users.length,
                    totalStudents:    users.filter(u => u.role === 'student').length,
                    totalInstructors: users.filter(u => u.role === 'instructor').length,
                    totalCourses:     approved.length,
                    pendingCourses:   pending.length
                }
            };
        }

        // Enrollments
        if (endpoint === '/enrollments/pending' || endpoint === '/enrollments/all') {
            const enrollments = JSON.parse(localStorage.getItem('enrollments') || '[]');
            return { success: true, count: enrollments.length, enrollments };
        }

        if (endpoint === '/enrollments' && method === 'POST') {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const enrollment = {
                _id: 'enroll-' + Date.now(),
                student: user,
                course: { _id: body.courseId, title: 'Course' },
                status: 'pending',
                requestedAt: new Date().toISOString()
            };
            const enrollments = JSON.parse(localStorage.getItem('enrollments') || '[]');
            enrollments.push(enrollment);
            localStorage.setItem('enrollments', JSON.stringify(enrollments));
            return { success: true, enrollment };
        }

        // Instructor: my courses
        if (endpoint === '/courses/instructor/my-courses') {
            const user    = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const pending  = JSON.parse(localStorage.getItem('pendingCourses') || '[]');
            const approved = JSON.parse(localStorage.getItem('approvedCourses') || '[]');
            const courses  = [...pending, ...approved].filter(c => c.instructor === user.id);
            return { success: true, courses };
        }

        // Payments report (stub)
        if (endpoint.startsWith('/payments/report')) {
            return { success: true, totals: { totalRevenue: 0, platformRevenue: 0, instructorPaid: 0, count: 0, totalDiscount: 0, totalTax: 0 }, byCourse: [], byDay: [] };
        }

        // Coupons (stub)
        if (endpoint === '/coupons' && method === 'GET') {
            return { success: true, coupons: [] };
        }

        // Videos (stub)
        if (endpoint.startsWith('/videos')) {
            return { success: true, course: { chapters: [] } };
        }

        // Default
        return { success: false, offline: true, message: 'Offline — feature unavailable', courses: [], enrollments: [], users: [] };
    }

    // ── Auth endpoints ──────────────────────────────────────────────────────────
    async register(userData) {
        return this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
    }

    async login(credentials) {
        return this.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    }

    async getMe() {
        return this.request('/auth/me');
    }

    async logout() {
        return this.request('/auth/logout', { method: 'POST' });
    }

    // ── Course endpoints ────────────────────────────────────────────────────────
    async getCourses(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/courses${queryString ? '?' + queryString : ''}`);
    }

    async getCourse(id) {
        return this.request(`/courses/${id}`);
    }

    async createCourse(courseData) {
        return this.request('/courses', { method: 'POST', body: JSON.stringify(courseData) });
    }

    async updateCourse(id, courseData) {
        return this.request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(courseData) });
    }

    async deleteCourse(id) {
        return this.request(`/courses/${id}`, { method: 'DELETE' });
    }

    async getInstructorCourses() {
        return this.request('/courses/instructor/my-courses');
    }

    async addReview(courseId, reviewData) {
        return this.request(`/courses/${courseId}/review`, { method: 'POST', body: JSON.stringify(reviewData) });
    }

    // ── Admin endpoints ─────────────────────────────────────────────────────────
    async getPendingCourses()    { return this.request('/admin/courses/pending'); }
    async approveCourse(id)      { return this.request(`/admin/courses/${id}/approve`, { method: 'PUT' }); }
    async rejectCourse(id)       { return this.request(`/admin/courses/${id}/reject`,  { method: 'PUT' }); }
    async getAllUsers()           { return this.request('/admin/users'); }
    async deactivateUser(id)     { return this.request(`/admin/users/${id}/deactivate`, { method: 'PUT' }); }
    async activateUser(id)       { return this.request(`/admin/users/${id}/activate`,   { method: 'PUT' }); }
    async getAdminStats()        { return this.request('/admin/stats'); }

    // ── Enrollment endpoints ────────────────────────────────────────────────────
    async requestEnrollment(courseId) {
        return this.request('/enrollments', { method: 'POST', body: JSON.stringify({ courseId }) });
    }
    async getMyEnrollments()         { return this.request('/enrollments/my-enrollments'); }
    async getPendingEnrollments()    { return this.request('/enrollments/pending'); }
    async getAllEnrollments()        { return this.request('/enrollments/all'); }
    async approveEnrollment(id)      { return this.request(`/enrollments/${id}/approve`, { method: 'PUT' }); }
    async rejectEnrollment(id, reason = '') {
        return this.request(`/enrollments/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) });
    }
    async updateProgress(enrollmentId, progressData) {
        return this.request(`/enrollments/${enrollmentId}/progress`, { method: 'PUT', body: JSON.stringify(progressData) });
    }

    // ── Payment endpoints ───────────────────────────────────────────────────────
    async createPaymentIntent(data) {
        return this.request('/payments/create-intent', { method: 'POST', body: JSON.stringify(data) });
    }
    async confirmPayment(id) {
        return this.request(`/payments/${id}/confirm`, { method: 'POST' });
    }
}

const api = new APIService();
