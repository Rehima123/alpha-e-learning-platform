// ─── Navbar User Auth State ───────────────────────────────────────────────────
// Shows profile dropdown when logged in, login/signup buttons when logged out

(function () {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');

    // Find login/signup nav items
    const loginBtn  = document.querySelector('a[href="auth-login.html"].btn-nav-login, a[href="auth-login.html"]');
    const signupBtn = document.querySelector('a[href="auth-register.html"].btn-nav-register, a[href="auth-register.html"]');

    if (!user) {
        // Not logged in — show login/signup (already visible by default)
        return;
    }

    // ── Logged in — hide login/signup, show profile dropdown ─────────────────
    if (loginBtn)  loginBtn.closest('li')?.remove();
    if (signupBtn) signupBtn.closest('li')?.remove();

    const initials = (user.fullName || user.email || 'U')
        .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const avatar = user.avatar
        ? `<img src="${user.avatar}" alt="avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
        : `<span style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);
               color:white;display:flex;align-items:center;justify-content:center;
               font-weight:700;font-size:0.8rem;">${initials}</span>`;

    const profileLi = document.createElement('li');
    profileLi.style.cssText = 'position:relative;list-style:none;';
    profileLi.innerHTML = `
        <button id="profileToggle" style="
            display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);
            border:1px solid rgba(255,255,255,0.2);border-radius:24px;padding:4px 12px 4px 4px;
            cursor:pointer;color:inherit;font-size:0.88rem;font-weight:600;">
            ${avatar}
            <span style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${user.fullName || user.email.split('@')[0]}
            </span>
            <span style="font-size:0.6rem;opacity:0.7;">▼</span>
        </button>
        <div id="profileDropdown" style="
            display:none;position:absolute;right:0;top:calc(100% + 8px);
            background:var(--card-bg,#1e293b);border:1px solid rgba(255,255,255,0.1);
            border-radius:12px;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,0.3);
            z-index:9999;overflow:hidden;">
            <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);">
                <div style="font-weight:700;font-size:0.9rem;">${user.fullName || ''}</div>
                <div style="font-size:0.75rem;opacity:0.6;margin-top:2px;">${user.email || ''}</div>
                <div style="font-size:0.7rem;margin-top:4px;background:rgba(102,126,234,0.2);
                    color:#a78bfa;padding:2px 8px;border-radius:10px;display:inline-block;">
                    ${user.role || 'student'}
                </div>
            </div>
            <a href="dashboard.html" style="display:flex;align-items:center;gap:10px;
                padding:11px 16px;text-decoration:none;color:inherit;font-size:0.88rem;
                transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'"
                onmouseout="this.style.background='transparent'">
                📊 My Dashboard
            </a>
            <a href="courses.html" style="display:flex;align-items:center;gap:10px;
                padding:11px 16px;text-decoration:none;color:inherit;font-size:0.88rem;
                transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'"
                onmouseout="this.style.background='transparent'">
                📚 My Courses
            </a>
            ${user.role === 'instructor' ? `
            <a href="instructor-dashboard.html" style="display:flex;align-items:center;gap:10px;
                padding:11px 16px;text-decoration:none;color:inherit;font-size:0.88rem;"
                onmouseover="this.style.background='rgba(255,255,255,0.05)'"
                onmouseout="this.style.background='transparent'">
                🎓 Instructor Dashboard
            </a>` : ''}
            ${['admin','super_admin','content_admin','finance_admin','support_admin'].includes(user.role) ? `
            <a href="admin-dashboard.html" style="display:flex;align-items:center;gap:10px;
                padding:11px 16px;text-decoration:none;color:inherit;font-size:0.88rem;"
                onmouseover="this.style.background='rgba(255,255,255,0.05)'"
                onmouseout="this.style.background='transparent'">
                ⚙️ Admin Panel
            </a>` : ''}
            <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:4px;"></div>
            <button onclick="logoutUser()" style="
                display:flex;align-items:center;gap:10px;width:100%;padding:11px 16px;
                background:none;border:none;color:#f87171;font-size:0.88rem;
                cursor:pointer;text-align:left;" onmouseover="this.style.background='rgba(248,113,113,0.08)'"
                onmouseout="this.style.background='none'">
                🚪 Logout
            </button>
        </div>`;

    // Append to nav-links
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) navLinks.appendChild(profileLi);

    // Toggle dropdown
    document.getElementById('profileToggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const dd = document.getElementById('profileDropdown');
        dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
    });

    // Close on outside click
    document.addEventListener('click', () => {
        const dd = document.getElementById('profileDropdown');
        if (dd) dd.style.display = 'none';
    });
})();

function logoutUser() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    window.location.href = 'auth-login.html';
}
