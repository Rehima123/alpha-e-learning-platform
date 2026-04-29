// Initialize default admin account in localStorage (offline fallback)
// In production this is handled by the backend database

(function initDefaultAdmin() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const adminExists = users.some(u => u.email === 'admin@alpha.com');

    if (!adminExists) {
        users.push({
            id: 'admin-001',
            fullName: 'Admin User',
            email: 'admin@alpha.com',
            password: 'admin123',   // plain text only for offline demo
            role: 'admin',
            isActive: true,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('users', JSON.stringify(users));
    }
})();
