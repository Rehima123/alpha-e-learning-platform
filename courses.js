let allCourses = [];
let filteredCourses = [];
let currentCategory = 'all';
let currentSort = 'newest';
let userEnrollments = [];

// ── Load courses from API with offline fallback ───────────────────────────────
async function loadCourses() {
    showSkeletons('coursesGrid', 6);
    try {
        const params = {};
        if (currentCategory !== 'all') params.category = currentCategory;
        if (currentSort !== 'newest') params.sort = currentSort;

        const response = await api.getCourses(params);
        if (response.success) {
            allCourses = response.courses || [];
            // Cache each course individually for offline use
            if (allCourses.length > 0 && typeof offlineDB !== 'undefined') {
                offlineDB.putAll('courses', allCourses).catch(() => {});
            }
            filteredCourses = [...allCourses];
            applySearch();
        } else if (response.offline) {
            await loadCoursesFromCache();
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        const loaded = await loadCoursesFromCache();
        if (!loaded) {
            document.getElementById('coursesGrid').innerHTML =
                '<p style="text-align:center;grid-column:1/-1;color:red">Failed to load courses. Please try again.</p>';
            toast?.error('Failed to load courses');
        }
    }
}

async function loadCoursesFromCache() {
    try {
        if (typeof offlineDB === 'undefined') return false;
        const cached = await offlineDB.getAll('courses');
        if (cached.length > 0) {
            allCourses = cached;
            filteredCourses = [...allCourses];
            renderCourses();
            toast?.warning('📡 Offline — showing cached courses');
            return true;
        }
    } catch {}
    return false;
}

// ── Load user enrollments ─────────────────────────────────────────────────────
async function loadEnrollments() {
    try {
        const token = api.getAuthToken();
        if (!token) return;
        const response = await api.getMyEnrollments();
        if (response.success) userEnrollments = response.enrollments || [];
    } catch {}
}

function getEnrollmentStatus(courseId) {
    const e = userEnrollments.find(e => (e.course?._id || e.course) === courseId);
    return e?.status || null;
}

// ── Apply search filter client-side ──────────────────────────────────────────
function applySearch() {
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
    filteredCourses = q
        ? allCourses.filter(c =>
            c.title.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            (c.instructorName || '').toLowerCase().includes(q)
          )
        : [...allCourses];
    renderCourses();
}

// ── Render course cards ───────────────────────────────────────────────────────
function renderCourses() {
    const grid = document.getElementById('coursesGrid');
    const count = document.getElementById('courseCount');
    if (count) count.textContent = `${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''}`;

    if (filteredCourses.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center;grid-column:1/-1;padding:3rem;color:var(--text-secondary)">
                <div style="font-size:3rem;margin-bottom:1rem">🔍</div>
                <p>No courses found. Try a different search or category.</p>
            </div>`;
        return;
    }

    grid.innerHTML = filteredCourses.map(course => {
        const status = getEnrollmentStatus(course._id);
        const instructorName = course.instructorName || course.instructor?.fullName || 'Unknown';
        const totalLessons   = course.totalLessons || course.lessons?.length || 0;
        const enrolledCount  = course.enrolledStudents || 0;
        const isFree = !course.isPremium || course.price === 0;
        const priceETB = Math.round(course.price * 56);

        let btnLabel = isFree ? '🎓 Enroll Free' : '👁 View Course';
        let btnClass = 'btn';
        if (status === 'approved') { btnLabel = '▶ Continue'; btnClass = 'btn btn-success'; }
        else if (status === 'pending') { btnLabel = '⏳ Pending'; btnClass = 'btn'; }
        else if (status === 'rejected') { btnLabel = '❌ Rejected'; btnClass = 'btn'; }

        return `
            <div class="course-card" onclick="window.location.href='course-detail.html?id=${course._id}'" style="cursor:pointer">
                <div class="course-image">
                    ${course.icon || '📚'}
                    ${isFree
                        ? '<span class="badge-free">FREE</span>'
                        : course.isFreePreview
                            ? '<span class="badge-preview">FREE PREVIEW</span>'
                            : '<span class="badge-premium">⭐ PREMIUM</span>'
                    }
                </div>
                <div class="course-content">
                    <div class="course-badge">${course.level}</div>
                    <h3>${course.title}</h3>
                    <p style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${course.description}</p>
                    <div class="course-instructor"><span>👤 ${instructorName}</span></div>
                    <div class="course-rating">
                        <span class="stars">${'⭐'.repeat(Math.floor(course.rating || 0))}</span>
                        <span>${(course.rating || 0).toFixed(1)} (${enrolledCount.toLocaleString()} students)</span>
                    </div>
                    <div class="course-meta">
                        <span>📚 ${totalLessons} lessons</span> |
                        <span>⏱️ ${course.duration}</span>
                    </div>
                    <div class="course-footer">
                        <span class="course-price">
                            ${isFree
                                ? '<span style="color:#27ae60;font-weight:700">Free</span>'
                                : `<strong>${priceETB.toLocaleString()} ETB</strong>`
                            }
                        </span>
                        <a href="course-detail.html?id=${course._id}" class="${btnClass}" onclick="event.stopPropagation()">${btnLabel}</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ── Filter / search / sort ────────────────────────────────────────────────────
document.getElementById('searchInput')?.addEventListener('input', applySearch);

document.getElementById('sortSelect')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    loadCourses();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        loadCourses();
    });
});

// ── Navbar ────────────────────────────────────────────────────────────────────
function updateNavbar() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const navLinks = document.querySelector('.nav-links');
    if (!currentUser || !navLinks) return;

    navLinks.innerHTML = `
        <li><a href="home.html">Home</a></li>
        <li><a href="courses.html">Courses</a></li>
        <li><a href="dashboard.html">My Learning</a></li>
        ${currentUser.role === 'instructor' ? '<li><a href="instructor-dashboard.html">My Courses</a></li>' : ''}
        ${currentUser.role === 'admin'      ? '<li><a href="admin-dashboard.html">Admin</a></li>' : ''}
        <li><span style="color:white;margin-right:1rem">👤 ${currentUser.fullName}</span></li>
        <li><a href="#" id="logoutBtn" class="btn-nav-logout">Logout</a></li>
    `;

    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await api.logout(); } catch {}
        api.removeAuthToken();
        localStorage.removeItem('currentUser');
        window.location.href = 'home.html';
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────
updateNavbar();
document.addEventListener('DOMContentLoaded', () => {
    // Handle ?search= from home page hero
    const urlSearch = new URLSearchParams(window.location.search).get('search');
    if (urlSearch) {
        const input = document.getElementById('searchInput');
        if (input) input.value = urlSearch;
    }

    new LiveSearch('searchInput', (id) => window.location.href = `course-detail.html?id=${id}`);
    loadEnrollments().then(() => loadCourses());
});

// ── Load courses from API with offline fallback ───────────────────────────────
async function loadCourses() {
    showSkeletons('coursesGrid', 6);
    try {
        const params = {};
        if (currentCategory !== 'all') params.category = currentCategory;

        const response = await api.getCourses(params);
        if (response.success) {
            allCourses = response.courses || [];
            // Cache for offline
            if (allCourses.length > 0 && typeof offlineDB !== 'undefined') {
                offlineDB.put('courses', allCourses).catch(() => {});
            }
            filteredCourses = [...allCourses];
            renderCourses();
        } else if (response.offline) {
            await loadCoursesFromCache();
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        const loaded = await loadCoursesFromCache();
        if (!loaded) {
            document.getElementById('coursesGrid').innerHTML =
                '<p style="text-align:center;grid-column:1/-1;color:red">Failed to load courses. Please try again.</p>';
            toast?.error('Failed to load courses');
        }
    }
}

async function loadCoursesFromCache() {
    try {
        if (typeof offlineDB === 'undefined') return false;
        const cached = await offlineDB.getAll('courses');
        if (cached.length > 0) {
            allCourses = cached;
            filteredCourses = [...allCourses];
            renderCourses();
            toast?.warning('📡 Offline — showing cached courses');
            return true;
        }
    } catch {}
    return false;
}

// ── Load user enrollments ─────────────────────────────────────────────────────
async function loadEnrollments() {
    try {
        const token = api.getAuthToken();
        if (!token) return;
        const response = await api.getMyEnrollments();
        if (response.success) userEnrollments = response.enrollments || [];
    } catch (error) {
        // Not logged in — that's fine, just show courses without enrollment status
    }
}

function getEnrollmentStatus(courseId) {
    const e = userEnrollments.find(e =>
        (e.course?._id || e.course) === courseId
    );
    return e?.status || null; // 'approved' | 'pending' | 'rejected' | null
}

// ── Render course cards ───────────────────────────────────────────────────────
function renderCourses() {
    const grid = document.getElementById('coursesGrid');

    if (filteredCourses.length === 0) {
        grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-secondary)">No courses found</p>';
        return;
    }

    grid.innerHTML = filteredCourses.map(course => {
        const status = getEnrollmentStatus(course._id);
        const instructorName = course.instructorName || course.instructor?.fullName || 'Unknown';
        const totalLessons   = course.totalLessons || course.lessons?.length || 0;
        const enrolledCount  = course.enrolledStudents || 0;
        const isFree = !course.isPremium || course.price === 0;

        let btnLabel = isFree ? 'Enroll Free' : 'View Course';
        let btnClass = 'btn';
        if (status === 'approved') { btnLabel = '▶ Continue'; btnClass = 'btn btn-success'; }
        else if (status === 'pending') { btnLabel = '⏳ Pending'; btnClass = 'btn'; }

        return `
            <div class="course-card">
                <div class="course-image">
                    ${course.icon || '📚'}
                    ${isFree
                        ? '<span class="badge-free">FREE</span>'
                        : course.isFreePreview
                            ? '<span class="badge-preview">FREE PREVIEW</span>'
                            : '<span class="badge-premium">⭐ PREMIUM</span>'
                    }
                </div>
                <div class="course-content">
                    <div class="course-badge">${course.level}</div>
                    <h3>${course.title}</h3>
                    <p>${course.description}</p>
                    <div class="course-instructor"><span>👤 ${instructorName}</span></div>
                    <div class="course-rating">
                        <span class="stars">${'⭐'.repeat(Math.floor(course.rating || 0))}</span>
                        <span>${(course.rating || 0).toFixed(1)} (${enrolledCount.toLocaleString()} students)</span>
                    </div>
                    <div class="course-meta">
                        <span>📚 ${totalLessons} lessons</span> |
                        <span>⏱️ ${course.duration}</span>
                    </div>
                    <div class="course-footer">
                        <span class="course-price">
                            ${isFree
                                ? '<span style="color:#27ae60;font-weight:700">Free</span>'
                                : `<strong>${Math.round(course.price * 56).toLocaleString()} ETB</strong>`
                            }
                        </span>
                        <a href="course-detail.html?id=${course._id}" class="${btnClass}">${btnLabel}</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ── Filter / search ───────────────────────────────────────────────────────────
function filterCourses() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    filteredCourses = allCourses.filter(c =>
        c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
    renderCourses();
}

document.getElementById('searchInput')?.addEventListener('input', filterCourses);

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        loadCourses();
    });
});

// ── Navbar ────────────────────────────────────────────────────────────────────
function updateNavbar() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const navLinks = document.querySelector('.nav-links');
    if (!currentUser || !navLinks) return;

    navLinks.innerHTML = `
        <li><a href="home.html">Home</a></li>
        <li><a href="courses.html">Courses</a></li>
        <li><a href="dashboard.html">My Learning</a></li>
        ${currentUser.role === 'instructor' ? '<li><a href="instructor-dashboard.html">My Courses</a></li>' : ''}
        ${currentUser.role === 'admin'      ? '<li><a href="admin-dashboard.html">Admin</a></li>' : ''}
        <li><span style="color:white;margin-right:1rem">👤 ${currentUser.fullName}</span></li>
        <li><a href="#" id="logoutBtn" class="btn-nav-logout">Logout</a></li>
    `;

    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await api.logout(); } catch {}
        api.removeAuthToken();
        localStorage.removeItem('currentUser');
        window.location.href = 'home.html';
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────
updateNavbar();
document.addEventListener('DOMContentLoaded', () => {
    new LiveSearch('searchInput', (id) => window.location.href = `course-detail.html?id=${id}`);
    loadEnrollments().then(() => loadCourses());
});
