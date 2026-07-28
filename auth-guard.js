// Auth Guard - protects pages that require login
// Works offline-first: checks localStorage, then verifies with server if online

async function requireAuth() {
    const token = localStorage.getItem('authToken');
    const user  = JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (!token || !user) {
        window.location.href = 'auth-login.html';
        return null;
    }

    // If online, verify token with server
    if (navigator.onLine) {
        try {
            const res = await api.getMe();
            if (res.success) {
                localStorage.setItem('currentUser', JSON.stringify(res.user));
                return res.user;
            }
        } catch {
            // Server unreachable — fall back to cached user
        }
    }

    return user;
}

async function requireAdmin() {
    const user = await requireAuth();
    if (!user) return null;

    const adminRoles = ['admin', 'super_admin', 'content_admin', 'finance_admin', 'support_admin'];
    if (!adminRoles.includes(user.role)) {
        alert('Access denied. Admin account required.');
        window.location.href = 'home.html';
        return null;
    }
    return user;
}

async function requireInstructor() {
    const user = await requireAuth();
    if (!user) return null;

    if (user.role !== 'instructor' && user.role !== 'admin') {
        alert('Access denied. Instructor account required.');
        window.location.href = 'home.html';
        return null;
    }
    return user;
}
