let enrollments = [];

// ── Auth check ────────────────────────────────────────────────────────────────
const _dashUser = JSON.parse(localStorage.getItem('currentUser'));
if (!_dashUser || !api.getAuthToken()) {
    window.location.href = 'auth-login.html';
}

// ── Greeting ──────────────────────────────────────────────────────────────────
if (_dashUser) {
    const firstName = (_dashUser.fullName || 'ተማሪ').split(' ')[0];
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'እንኳን ደህና ነጋህ/ሽ' : hour < 17 ? 'እንኳን ደህና አደርህ/ሽ' : 'እንኳን ደህና መጣህ/ሽ';
    const el = document.getElementById('dashGreeting');
    const sub = document.getElementById('dashSubtitle');
    if (el) el.textContent = `${greeting}, ${firstName}! 👋`;
    if (sub) sub.textContent = `አካውንት: ${_dashUser.email || _dashUser.phoneNumber || ''} · ትምህርትዎን ይቀጥሉ!`;
}

async function loadDashboard() {
    try {
        const response = await api.getMyEnrollments();
        if (response.success) {
            enrollments = response.enrollments || [];
        } else if (response.offline) {
            // Try IndexedDB
            if (typeof offlineDB !== 'undefined') {
                const cached = await offlineDB.getAll('enrollments').catch(() => []);
                enrollments = cached;
                toast?.warning('📡 Offline — showing cached data');
            }
        } else {
            // API returned but not success — show empty state not error
            enrollments = [];
        }
        renderDashboard();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Try offline cache first
        if (typeof offlineDB !== 'undefined') {
            try {
                const cached = await offlineDB.getAll('enrollments').catch(() => []);
                if (cached && cached.length > 0) {
                    enrollments = cached;
                    renderDashboard();
                    return;
                }
            } catch {}
        }
        // Show empty state instead of error for better UX
        enrollments = [];
        renderDashboard();
    }
}

function calculateOverallProgress() {
    if (enrollments.length === 0) {
        return { completed: 0, inProgress: 0, totalLessons: 0, completedLessons: 0, overallPercent: 0 };
    }
    
    let completed = 0;
    let totalLessons = 0;
    let completedLessons = 0;
    
    enrollments.forEach(enrollment => {
        const course = enrollment.course;
        if (!course) return;
        
        const courseLessons = course.totalLessons || course.lessons?.length || 0;
        const courseCompleted = enrollment.completedLessons?.length || 0;
        
        totalLessons += courseLessons;
        completedLessons += courseCompleted;
        
        if (enrollment.progress >= 100) {
            completed++;
        }
    });
    
    return {
        completed,
        inProgress: enrollments.length - completed,
        totalLessons,
        completedLessons,
        overallPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    };
}

function renderDashboard() {
    const container = document.getElementById('enrolledCourses');

    const approved = enrollments.filter(e => e.status === 'approved');
    const pending  = enrollments.filter(e => e.status === 'pending');

    // Cache approved enrollments for offline
    if (approved.length > 0 && typeof offlineDB !== 'undefined') {
        offlineDB.putAll('enrollments', approved).catch(() => {});
    }

    if (enrollments.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:4rem 2rem">
                <div style="font-size:4rem;margin-bottom:1rem">📚</div>
                <h3 style="color:var(--text-primary);margin-bottom:0.5rem">No Courses Yet</h3>
                <p style="color:var(--text-secondary);margin-bottom:1.5rem">Start your learning journey by enrolling in courses!</p>
                <a href="courses.html" class="btn btn-large">Browse Courses</a>
            </div>`;
        return;
    }

    const stats = calculateOverallProgress();

    // Pending enrollments notice
    const pendingHTML = pending.length > 0 ? `
        <div style="background:rgba(243,156,18,0.1);border:1px solid #f39c12;border-radius:12px;padding:14px 18px;margin-bottom:1.5rem;display:flex;align-items:center;gap:12px">
            <span style="font-size:1.5rem">⏳</span>
            <div>
                <strong style="color:var(--text-primary)">${pending.length} enrollment request${pending.length > 1 ? 's' : ''} pending</strong>
                <p style="font-size:0.85rem;color:var(--text-secondary);margin:2px 0 0">
                    ${pending.map(e => e.course?.title || 'Unknown').join(', ')}
                </p>
            </div>
        </div>` : '';

    const statsHTML = `
        ${pendingHTML}
        <div class="dashboard-stats">
            <div class="stat-card"><h3>${approved.length}</h3><p>Enrolled</p></div>
            <div class="stat-card"><h3>${stats.completed}</h3><p>Completed</p></div>
            <div class="stat-card"><h3>${stats.inProgress}</h3><p>In Progress</p></div>
            <div class="stat-card"><h3>${stats.overallPercent}%</h3><p>Progress</p></div>
        </div>
        <h3 style="margin:2rem 0 1rem">My Courses</h3>`;

    const coursesHTML = approved.map(enrollment => {
        const course = enrollment.course;
        if (!course) return '';
        const progress      = enrollment.progress || 0;
        const isCompleted   = progress >= 100;
        const instructorName = course.instructorName || course.instructor?.fullName || 'Unknown';
        const totalLessons  = course.totalLessons || course.lessons?.length || 0;
        const completedCount = enrollment.completedLessons?.length || 0;

        return `
            <div class="course-card">
                <div class="course-image">${course.icon || '📚'}</div>
                <div class="course-content">
                    <div class="course-badge" style="background:${isCompleted ? '#27ae60' : '#3498db'}">
                        ${isCompleted ? '✓ Completed' : 'In Progress'}
                    </div>
                    <h3>${course.title}</h3>
                    <div class="course-instructor"><span>👤 ${instructorName}</span></div>
                    <div class="progress-section">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width:${progress}%"></div>
                        </div>
                        <p style="margin-top:0.5rem;color:var(--text-secondary);font-size:0.85rem">
                            ${completedCount} / ${totalLessons} lessons · ${Math.round(progress)}%
                        </p>
                    </div>
                    <a href="course-detail.html?id=${course._id}" class="btn ${isCompleted ? 'btn-success' : ''}">
                        ${isCompleted ? '🏆 Review' : '▶️ Continue'}
                    </a>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = statsHTML + '<div class="courses-grid">' + coursesHTML + '</div>';

    // Analytics
    const analyticsSection = document.getElementById('analytics-section');
    if (analyticsSection) analyticsSection.style.display = 'block';
    const chart = new ProgressChart('progressChart');
    chart.drawDonut(stats.overallPercent, 'Overall', '#667eea');
}
// updateNavbar is handled by navbar.js (already loaded above)
// Just ensure logout button works
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api.logout(); } catch {}
    api.removeAuthToken();
    localStorage.removeItem('currentUser');
    window.location.href = 'home.html';
});

loadDashboard().then(() => {
    streakTracker?.renderBadge(document.getElementById('streak-badge'));
    renderLeaderboard?.('leaderboard-mini');
});
