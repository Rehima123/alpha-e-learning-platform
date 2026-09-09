let enrollments = [];

// ── All courses (same structure as courses.js) ────────────────────────────────
const DASH_COURSES = [
    { id:'nat_eng101',   title:'Communicative English Skills I',  icon:'📖', sem:'Sem 1 · Natural' },
    { id:'nat_math101',  title:'Applied Mathematics I',            icon:'📐', sem:'Sem 1 · Natural' },
    { id:'nat_phys101',  title:'General Physics',                  icon:'⚡', sem:'Sem 1 · Natural' },
    { id:'nat_chem101',  title:'General Chemistry',                icon:'🧪', sem:'Sem 1 · Natural' },
    { id:'nat_crit101',  title:'Critical Thinking (Logic)',        icon:'💡', sem:'Sem 1 · Natural' },
    { id:'nat_geog101',  title:'Geography of Ethiopia & Horn',     icon:'🌍', sem:'Sem 1 · Natural' },
    { id:'nat_psych101', title:'General Psychology',               icon:'🧠', sem:'Sem 1 · Natural' },
    { id:'nat_pe101',    title:'Physical Fitness & Health',        icon:'🏃', sem:'Sem 1 · Natural' },
    { id:'soc_eng101',   title:'Communicative English Skills I',   icon:'📖', sem:'Sem 1 · Social' },
    { id:'soc_math101',  title:'Math for Social Sciences',         icon:'📐', sem:'Sem 1 · Social' },
    { id:'soc_econ101',  title:'Introduction to Economics',        icon:'📊', sem:'Sem 1 · Social' },
    { id:'soc_geog101',  title:'Geography of Ethiopia & Horn',     icon:'🌍', sem:'Sem 1 · Social' },
    { id:'soc_crit101',  title:'Critical Thinking (Logic)',        icon:'💡', sem:'Sem 1 · Social' },
    { id:'soc_psych101', title:'General Psychology',               icon:'🧠', sem:'Sem 1 · Social' },
    { id:'soc_pe101',    title:'Physical Fitness & Health',        icon:'🏃', sem:'Sem 1 · Social' },
    { id:'soc_anth101',  title:'Social Anthropology',              icon:'🗿', sem:'Sem 1 · Social' },
    { id:'nat_eng102',   title:'Communicative English Skills II',  icon:'✍️', sem:'Sem 2' },
    { id:'nat_bio101',   title:'General Biology',                  icon:'🧬', sem:'Sem 2' },
    { id:'nat_hist101',  title:'History of Ethiopia & Horn',       icon:'📜', sem:'Sem 2' },
    { id:'nat_ict101',   title:'Emerging Technologies',            icon:'🤖', sem:'Sem 2' },
    { id:'nat_civic101', title:'Moral & Civic Education',          icon:'⚖️', sem:'Sem 2' },
    { id:'nat_math102',  title:'Applied Mathematics II',           icon:'📐', sem:'Sem 2' },
    { id:'nat_incl101',  title:'Inclusiveness',                    icon:'🤝', sem:'Sem 2' },
    { id:'soc_bus101',   title:'Entrepreneurship',                 icon:'💼', sem:'Sem 2' },
    { id:'coc_anat_phys',title:'Human Anatomy & Physiology',       icon:'🫀', sem:'CoC' },
    { id:'coc_bio',      title:'General Biology CoC Prep',         icon:'🧬', sem:'CoC' },
    { id:'coc_chem',     title:'General Chemistry CoC Prep',       icon:'🧪', sem:'CoC' },
    { id:'coc_pharm_basic',title:'Pharmacology Essentials',        icon:'💊', sem:'CoC' },
    { id:'coc_ph_foundation',title:'Public Health & Epidemiology', icon:'🏥', sem:'CoC' },
    { id:'coc_eng',      title:'English Language Competency',      icon:'📖', sem:'CoC' },
    { id:'coc_model_1',  title:'Comprehensive Model Exam 1',       icon:'📝', sem:'CoC' },
    { id:'coc_model_2',  title:'Comprehensive Model Exam 2',       icon:'📝', sem:'CoC' },
];

// ── Auth check ────────────────────────────────────────────────────────────────
const _dashUser = JSON.parse(localStorage.getItem('currentUser'));
if (!_dashUser || !api.getAuthToken()) {
    window.location.href = 'auth-login.html';
}

// ── Greeting ──────────────────────────────────────────────────────────────────
if (_dashUser) {
    const firstName = (_dashUser.fullName || 'ተማሪ').split(' ')[0];
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'እንኳን ደህና ነጋህ/ሽ' : hour < 17 ? 'እንኳን ደህና አደርህ/ሽ' : 'እንኳን ደህና ምሽቱ ደህና ይሁን';
    const el  = document.getElementById('dashGreeting');
    const sub = document.getElementById('dashSubtitle');
    if (el)  el.textContent  = `${greeting}, ${firstName}! 👋`;
    if (sub) sub.textContent = `${_dashUser.email || _dashUser.phoneNumber || ''} · ትምህርትዎን ይቀጥሉ!`;

    // Show payment status banner
    renderPaymentBanner(_dashUser.paymentStatus || 'UNPAID', _dashUser.enrolledPackage || 'None');
}

function renderPaymentBanner(status, pkg) {
    const el = document.getElementById('payStatusBanner');
    if (!el) return;
    if (status === 'APPROVED') {
        el.innerHTML = `
            <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);
                border-radius:16px;padding:16px 20px;display:flex;align-items:center;gap:14px">
                <span style="font-size:1.8rem;flex-shrink:0">✅</span>
                <div>
                    <div style="color:#34d399;font-weight:800;font-size:0.9rem">Access Approved!</div>
                    <div style="color:#64748b;font-size:0.8rem;margin-top:2px">
                        Package: <strong style="color:#94a3b8">${pkg}</strong> — ሁሉም ኮርሶች ክፍት ናቸው
                    </div>
                </div>
                <a href="courses.html" style="margin-left:auto;padding:8px 18px;
                    background:#10b981;color:white;border-radius:12px;font-size:0.8rem;
                    font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0">
                    ▶ ትምህርት ጀምር
                </a>
            </div>`;
    } else if (status === 'PENDING') {
        el.innerHTML = `
            <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);
                border-radius:16px;padding:16px 20px;display:flex;align-items:center;gap:14px">
                <span style="font-size:1.8rem;flex-shrink:0">⏳</span>
                <div>
                    <div style="color:#fbbf24;font-weight:800;font-size:0.9rem">ደረሰኝዎ በ Review ላይ ነው</div>
                    <div style="color:#64748b;font-size:0.8rem;margin-top:2px">
                        Admin ካጸደቀ ሁሉም ኮርሶች ይከፈቱልዎታል · ብዙ ጊዜ 24 ሰዓት ይወስዳል
                    </div>
                </div>
            </div>`;
    } else {
        el.innerHTML = `
            <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);
                border-radius:16px;padding:16px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
                <span style="font-size:1.8rem;flex-shrink:0">🔒</span>
                <div style="flex:1;min-width:0">
                    <div style="color:#818cf8;font-weight:800;font-size:0.9rem">ኮርሶችን ለመክፈት ክፍያ ይፈልጋል</div>
                    <div style="color:#64748b;font-size:0.8rem;margin-top:2px">
                        399 ETB ብቻ — ሁሉም Freshman + CoC ኮርሶች
                    </div>
                </div>
                <a href="payment.html?method=manual" style="padding:10px 22px;
                    background:linear-gradient(135deg,#f59e0b,#ea580c);color:#0f172a;
                    border-radius:12px;font-size:0.82rem;font-weight:900;text-decoration:none;
                    white-space:nowrap;flex-shrink:0">
                    💳 ክፍያ ፈጽሙ →
                </a>
            </div>`;
    }
}

async function loadDashboard() {
    try {
        const response = await api.getMyEnrollments();
        if (response.success) {
            enrollments = response.enrollments || [];
        } else {
            enrollments = [];
        }
    } catch {
        enrollments = [];
    }

    // Refresh payment status from API
    try {
        const ps = await api.getPaymentStatus();
        if (ps.success) {
            _dashUser.paymentStatus   = ps.paymentStatus;
            _dashUser.enrolledPackage = ps.enrolledPackage;
            localStorage.setItem('currentUser', JSON.stringify(_dashUser));
            renderPaymentBanner(ps.paymentStatus, ps.enrolledPackage);
        }
    } catch {}

    renderDashboard();
}

function calculateOverallProgress() {
    if (enrollments.length === 0) return { completed:0, inProgress:0, totalLessons:0, completedLessons:0, overallPercent:0 };
    let completed=0, totalLessons=0, completedLessons=0;
    enrollments.forEach(e => {
        const c = e.course;
        if (!c) return;
        totalLessons    += c.totalLessons || 0;
        completedLessons += e.completedLessons?.length || 0;
        if (e.progress >= 100) completed++;
    });
    return { completed, inProgress: enrollments.length - completed, totalLessons, completedLessons,
        overallPercent: totalLessons > 0 ? Math.round((completedLessons/totalLessons)*100) : 0 };
}

function renderDashboard() {
    const container = document.getElementById('enrolledCourses');
    const user      = JSON.parse(localStorage.getItem('currentUser'));
    const status    = user?.paymentStatus || 'UNPAID';
    const approved  = enrollments.filter(e => e.status === 'approved');
    const pending   = enrollments.filter(e => e.status === 'pending');
    const stats     = calculateOverallProgress();

    // Update stat boxes
    document.getElementById('stat-enrolled').textContent  = approved.length || DASH_COURSES.length;
    document.getElementById('stat-completed').textContent = stats.completed;
    document.getElementById('stat-progress').textContent  = stats.overallPercent + '%';

    // If APPROVED — show all courses from static list
    if (status === 'APPROVED' || user?.role === 'admin' || user?.role === 'super_admin') {
        // Build course cards from static list
        const courseCards = DASH_COURSES.map(c => {
            const enrollment = approved.find(e => (e.course?._id || e.course) === c.id);
            const progress   = enrollment?.progress || 0;
            const done       = progress >= 100;
            return `
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:18px;
                padding:18px;display:flex;flex-direction:column;gap:12px;
                transition:border-color 0.2s,box-shadow 0.2s;cursor:pointer"
                onmouseover="this.style.borderColor='#4f46e5';this.style.boxShadow='0 6px 24px rgba(99,102,241,0.12)'"
                onmouseout="this.style.borderColor='#1e293b';this.style.boxShadow='none'"
                onclick="window.location.href='course-detail.html?id=${c.id}'">
                <div style="display:flex;align-items:center;gap:12px">
                    <span style="font-size:1.8rem;flex-shrink:0">${c.icon}</span>
                    <div style="flex:1;min-width:0">
                        <h4 style="color:white;font-size:0.85rem;font-weight:700;margin:0 0 3px;
                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.title}</h4>
                        <span style="font-size:10px;color:#64748b;font-weight:600">${c.sem}</span>
                    </div>
                    ${done ? '<span style="color:#34d399;font-size:0.8rem;flex-shrink:0">✓ Done</span>' : ''}
                </div>
                <div style="height:4px;background:#1e293b;border-radius:4px;overflow:hidden">
                    <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#4f46e5,#10b981);border-radius:4px;transition:width 0.4s"></div>
                </div>
                <a href="course-detail.html?id=${c.id}"
                    style="display:block;text-align:center;padding:8px;
                    background:${done ? '#16a34a' : '#4f46e5'};color:white;border-radius:10px;
                    font-size:11px;font-weight:800;text-decoration:none;transition:opacity 0.2s"
                    onclick="event.stopPropagation()">
                    ${done ? '🏆 Review' : '▶ Continue Learning'}
                </a>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">
                ${courseCards}
            </div>`;

        // Show analytics
        const analyticsSection = document.getElementById('analytics-section');
        if (analyticsSection) analyticsSection.style.display = 'block';
        try { new ProgressChart('progressChart').drawDonut(stats.overallPercent,'Overall','#667eea'); } catch{}

    } else if (status === 'PENDING') {
        container.innerHTML = `
            <div style="background:#0f172a;border:1px dashed rgba(245,158,11,0.4);border-radius:20px;
                padding:48px 24px;text-align:center">
                <div style="font-size:3rem;margin-bottom:12px">⏳</div>
                <h3 style="color:#fbbf24;margin:0 0 8px;font-size:1rem;font-weight:800">ደረሰኝዎ በ Review ላይ ነው</h3>
                <p style="color:#64748b;font-size:0.85rem;margin:0">Admin ካጸደቀ ሁሉም ኮርሶች ይከፈቱልዎታል</p>
            </div>`;
    } else {
        // UNPAID — show locked preview
        const preview = DASH_COURSES.slice(0, 8).map(c => `
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:18px;
                padding:18px;opacity:0.5;cursor:not-allowed">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                    <span style="font-size:1.5rem">${c.icon}</span>
                    <div>
                        <div style="color:white;font-size:0.82rem;font-weight:700">${c.title}</div>
                        <div style="font-size:10px;color:#64748b">${c.sem}</div>
                    </div>
                </div>
                <div style="padding:8px;background:#1e293b;border-radius:10px;
                    text-align:center;font-size:11px;color:#64748b;font-weight:700">🔒 Locked</div>
            </div>`).join('');

        container.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:20px">
                ${preview}
            </div>
            <div style="text-align:center;padding:24px 0">
                <p style="color:#64748b;font-size:0.85rem;margin:0 0 12px">
                    + ${DASH_COURSES.length - 8} more courses unlocked after payment
                </p>
                <a href="payment.html?method=manual"
                    style="padding:12px 32px;background:linear-gradient(135deg,#f59e0b,#ea580c);
                    color:#0f172a;border-radius:14px;font-weight:900;font-size:0.9rem;text-decoration:none">
                    💳 ክፍያ ፈጽሙ — 399 ETB
                </a>
            </div>`;
    }
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api.logout(); } catch {}
    api.removeAuthToken();
    localStorage.removeItem('currentUser');
    window.location.href = 'home.html';
});

loadDashboard().then(() => {
    try { streakTracker?.renderBadge(document.getElementById('streak-badge')); } catch {}
    try { renderLeaderboard?.('leaderboard-mini'); } catch {}
});
