let allCourses = [];
let filteredCourses = [];
let currentCategory = 'all';
let currentSort = 'newest';
let userEnrollments = [];

// ── Static course data (fallback when backend is offline) ─────────────────────
const STATIC_COURSES = [
    {
        _id: 'course-eng1', title: 'Communicative English I', icon: '📖',
        description: 'Develop essential English communication skills for academic and everyday contexts. Covers reading, writing, listening and speaking.',
        level: 'Beginner', category: 'semester1', duration: '16 weeks',
        instructor: { fullName: 'Dr. Tigist Haile' }, instructorName: 'Dr. Tigist Haile',
        rating: 4.8, enrolledStudents: 1240, totalLessons: 32, isPremium: false, price: 0,
        createdAt: '2024-01-01'
    },
    {
        _id: 'course-math1', title: 'Mathematics for Natural Science', icon: '📐',
        description: 'Covers calculus, algebra and analytical geometry. Foundation for engineering, medicine and natural science students.',
        level: 'Intermediate', category: 'semester1', duration: '16 weeks',
        instructor: { fullName: 'Prof. Bekele Tadesse' }, instructorName: 'Prof. Bekele Tadesse',
        rating: 4.7, enrolledStudents: 980, totalLessons: 28, isPremium: false, price: 0,
        createdAt: '2024-01-02'
    },
    {
        _id: 'course-logic1', title: 'Critical Thinking & Logic', icon: '🧠',
        description: 'Master logical reasoning, argument analysis and problem-solving techniques essential for all academic disciplines.',
        level: 'Beginner', category: 'semester1', duration: '12 weeks',
        instructor: { fullName: 'Dr. Mekdes Alemu' }, instructorName: 'Dr. Mekdes Alemu',
        rating: 4.9, enrolledStudents: 1560, totalLessons: 24, isPremium: false, price: 0,
        createdAt: '2024-01-03'
    },
    {
        _id: 'course-geo1', title: 'Introduction to Geography', icon: '🌍',
        description: 'Physical and human geography of Ethiopia and the world. Covers climate, ecosystems, population and development.',
        level: 'Beginner', category: 'semester1', duration: '14 weeks',
        instructor: { fullName: 'Dr. Yonas Girma' }, instructorName: 'Dr. Yonas Girma',
        rating: 4.5, enrolledStudents: 870, totalLessons: 22, isPremium: false, price: 0,
        createdAt: '2024-01-04'
    },
    {
        _id: 'course-psy1', title: 'General Psychology', icon: '🧩',
        description: 'Introduction to psychological principles covering behavior, cognition, emotion, personality and human development.',
        level: 'Beginner', category: 'semester1', duration: '14 weeks',
        instructor: { fullName: 'Dr. Hana Kebede' }, instructorName: 'Dr. Hana Kebede',
        rating: 4.6, enrolledStudents: 1120, totalLessons: 26, isPremium: false, price: 0,
        createdAt: '2024-01-05'
    },
    {
        _id: 'course-phy1', title: 'General Physics I', icon: '⚛️',
        description: 'Mechanics, thermodynamics, waves and optics. Core physics for Natural Science stream students.',
        level: 'Intermediate', category: 'semester1', duration: '16 weeks',
        instructor: { fullName: 'Prof. Abebe Mengistu' }, instructorName: 'Prof. Abebe Mengistu',
        rating: 4.7, enrolledStudents: 950, totalLessons: 30, isPremium: false, price: 0,
        createdAt: '2024-01-06'
    },
    {
        _id: 'course-eng2', title: 'Communicative English II', icon: '✍️',
        description: 'Advanced academic writing, research skills and presentation techniques. Build on Communicative English I.',
        level: 'Intermediate', category: 'semester2', duration: '16 weeks',
        instructor: { fullName: 'Dr. Tigist Haile' }, instructorName: 'Dr. Tigist Haile',
        rating: 4.7, enrolledStudents: 1080, totalLessons: 30, isPremium: false, price: 0,
        createdAt: '2024-01-07'
    },
    {
        _id: 'course-anthro', title: 'Introduction to Anthropology', icon: '🏛️',
        description: 'Study human societies, cultures and evolution. Understand Ethiopia\'s diverse cultural heritage.',
        level: 'Beginner', category: 'semester2', duration: '12 weeks',
        instructor: { fullName: 'Dr. Sara Muleta' }, instructorName: 'Dr. Sara Muleta',
        rating: 4.5, enrolledStudents: 720, totalLessons: 20, isPremium: false, price: 0,
        createdAt: '2024-01-08'
    },
    {
        _id: 'course-ict', title: 'ICT & Computer Applications', icon: '💻',
        description: 'Practical computer skills including word processing, spreadsheets, presentations, internet and basic programming.',
        level: 'Beginner', category: 'semester2', duration: '12 weeks',
        instructor: { fullName: 'Eng. Daniel Tesfaye' }, instructorName: 'Eng. Daniel Tesfaye',
        rating: 4.8, enrolledStudents: 1450, totalLessons: 24, isPremium: false, price: 0,
        createdAt: '2024-01-09'
    },
    {
        _id: 'course-entrep', title: 'Entrepreneurship & Innovation', icon: '💡',
        description: 'Learn to identify opportunities, develop business ideas and build entrepreneurial mindset for the modern economy.',
        level: 'Beginner', category: 'semester2', duration: '10 weeks',
        instructor: { fullName: 'Dr. Liya Girma' }, instructorName: 'Dr. Liya Girma',
        rating: 4.6, enrolledStudents: 890, totalLessons: 20, isPremium: false, price: 0,
        createdAt: '2024-01-10'
    },
    {
        _id: 'course-hist', title: 'Ethiopian History & Heritage', icon: '📜',
        description: 'Comprehensive study of Ethiopian history from ancient civilizations to the modern state. Rich with primary sources.',
        level: 'Beginner', category: 'semester2', duration: '14 weeks',
        instructor: { fullName: 'Prof. Getachew Yimer' }, instructorName: 'Prof. Getachew Yimer',
        rating: 4.9, enrolledStudents: 1320, totalLessons: 28, isPremium: false, price: 0,
        createdAt: '2024-01-11'
    },
    {
        _id: 'course-civic', title: 'Civic Education & Democracy', icon: '⚖️',
        description: 'Rights and responsibilities of citizens, democratic governance, constitutional law and Ethiopia\'s political system.',
        level: 'Beginner', category: 'semester2', duration: '12 weeks',
        instructor: { fullName: 'Dr. Meseret Bekele' }, instructorName: 'Dr. Meseret Bekele',
        rating: 4.4, enrolledStudents: 760, totalLessons: 22, isPremium: false, price: 0,
        createdAt: '2024-01-12'
    },
    {
        _id: 'course-econ', title: 'Introduction to Economics', icon: '📊',
        description: 'Microeconomics and macroeconomics fundamentals. Supply, demand, markets, GDP, inflation and monetary policy.',
        level: 'Beginner', category: 'social', duration: '14 weeks',
        instructor: { fullName: 'Dr. Temesgen Alemu' }, instructorName: 'Dr. Temesgen Alemu',
        rating: 4.7, enrolledStudents: 1010, totalLessons: 26, isPremium: true, price: 120,
        isFreePreview: true, createdAt: '2024-01-13'
    },
    {
        _id: 'course-bio1', title: 'General Biology', icon: '🔬',
        description: 'Cell biology, genetics, evolution, ecology and physiology. Foundation course for Medicine and Natural Science students.',
        level: 'Intermediate', category: 'natural', duration: '16 weeks',
        instructor: { fullName: 'Dr. Emebet Tadesse' }, instructorName: 'Dr. Emebet Tadesse',
        rating: 4.8, enrolledStudents: 1180, totalLessons: 32, isPremium: true, price: 150,
        isFreePreview: true, createdAt: '2024-01-14'
    },
    {
        _id: 'course-chem1', title: 'General Chemistry', icon: '⚗️',
        description: 'Atomic structure, chemical bonding, reactions, stoichiometry and thermochemistry for science stream students.',
        level: 'Intermediate', category: 'natural', duration: '16 weeks',
        instructor: { fullName: 'Prof. Dawit Hailu' }, instructorName: 'Prof. Dawit Hailu',
        rating: 4.6, enrolledStudents: 890, totalLessons: 30, isPremium: true, price: 150,
        isFreePreview: true, createdAt: '2024-01-15'
    },
    {
        _id: 'course-advmath', title: 'Advanced Mathematics', icon: '📏',
        description: 'Differential equations, linear algebra, vector calculus and complex analysis for engineering and science majors.',
        level: 'Advanced', category: 'natural', duration: '16 weeks',
        instructor: { fullName: 'Prof. Bekele Tadesse' }, instructorName: 'Prof. Bekele Tadesse',
        rating: 4.5, enrolledStudents: 640, totalLessons: 34, isPremium: true, price: 5,
        createdAt: '2024-01-16'
    },
    {
        _id: 'course-global', title: 'Global Affairs & International Relations', icon: '🌐',
        description: 'International organizations, foreign policy, global challenges and Ethiopia\'s role in the African Union and world affairs.',
        level: 'Intermediate', category: 'social', duration: '12 weeks',
        instructor: { fullName: 'Dr. Feven Mekonnen' }, instructorName: 'Dr. Feven Mekonnen',
        rating: 4.6, enrolledStudents: 720, totalLessons: 22, isPremium: false, price: 0,
        createdAt: '2024-01-17'
    },
    {
        _id: 'course-inclusive', title: 'Inclusiveness & Diversity Studies', icon: '🤝',
        description: 'Explore gender, disability, ethnicity and social inclusion in Ethiopian and global contexts.',
        level: 'Beginner', category: 'social', duration: '10 weeks',
        instructor: { fullName: 'Dr. Mekdes Alemu' }, instructorName: 'Dr. Mekdes Alemu',
        rating: 4.7, enrolledStudents: 830, totalLessons: 18, isPremium: false, price: 0,
        createdAt: '2024-01-18'
    },
    {
        _id: 'course-physfit', title: 'Physical Fitness & Health', icon: '🏃',
        description: 'Physical education, nutrition, mental health and wellness strategies for academic success and lifelong fitness.',
        level: 'Beginner', category: 'semester1', duration: '8 weeks',
        instructor: { fullName: 'Coach Biruk Asnake' }, instructorName: 'Coach Biruk Asnake',
        rating: 4.8, enrolledStudents: 1400, totalLessons: 16, isPremium: false, price: 0,
        createdAt: '2024-01-19'
    },
    {
        _id: 'course-exam-prep', title: 'Freshman Exam Preparation', icon: '🎯',
        description: 'Complete exam preparation with past papers, mock tests and AI-powered practice questions for all freshman subjects.',
        level: 'Intermediate', category: 'natural', duration: '6 weeks',
        instructor: { fullName: 'Alpha Tutorial Team' }, instructorName: 'Alpha Tutorial Team',
        rating: 4.9, enrolledStudents: 2100, totalLessons: 20, isPremium: true, price: 8,
        createdAt: '2024-01-20'
    },
    {
        _id: 'course-study-skills', title: 'Study Skills & Time Management', icon: '⏰',
        description: 'Evidence-based learning strategies, memory techniques, note-taking and exam strategies to maximize your GPA.',
        level: 'Beginner', category: 'semester1', duration: '4 weeks',
        instructor: { fullName: 'Dr. Hana Kebede' }, instructorName: 'Dr. Hana Kebede',
        rating: 4.8, enrolledStudents: 1780, totalLessons: 12, isPremium: false, price: 0,
        createdAt: '2024-01-21'
    },
    {
        _id: 'course-law-intro', title: 'Introduction to Law', icon: '📋',
        description: 'Fundamentals of Ethiopian legal system, constitutional law, human rights and access to justice for social science students.',
        level: 'Intermediate', category: 'social', duration: '14 weeks',
        instructor: { fullName: 'Adv. Selam Worku' }, instructorName: 'Adv. Selam Worku',
        rating: 4.7, enrolledStudents: 560, totalLessons: 26, isPremium: true, price: 120,
        isFreePreview: true, createdAt: '2024-01-22'
    }
];

// ── Skeleton loader ───────────────────────────────────────────────────────────
function showSkeletonsLocal(containerId, count = 6) {
    if (typeof showSkeletons === 'function') { showSkeletons(containerId, count); return; }
    const grid = document.getElementById(containerId);
    if (grid) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem">Loading...</p>';
}

// ── Load courses from API with static fallback ────────────────────────────────
async function loadCourses() {
    // Show static courses FIRST — instant, no waiting
    loadStaticCourses();

    // Then silently try API in background (don't block UI)
    try {
        const response = await Promise.race([
            api.getCourses({}),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
        ]);
        if (response && response.success && Array.isArray(response.courses) && response.courses.length > 0) {
            allCourses = response.courses;
            filteredCourses = [...allCourses];
            applySearch();
        }
    } catch (_) {
        // Static courses already showing — nothing to do
    }
}

function loadStaticCourses() {
    allCourses = [...STATIC_COURSES];
    // Apply category filter
    if (currentCategory !== 'all') {
        filteredCourses = allCourses.filter(c => c.category === currentCategory);
    } else {
        filteredCourses = [...allCourses];
    }
    // Apply sort
    if (currentSort === 'rating') {
        filteredCourses.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (currentSort === 'students') {
        filteredCourses.sort((a, b) => (b.enrolledStudents || 0) - (a.enrolledStudents || 0));
    }
    applySearch();
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
    } catch {
        // Not logged in — that's fine
    }
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
        <li><a href="study-hub.html">📚 Study Hub</a></li>
        <li><a href="department-guide.html">🎓 Departments</a></li>
        ${currentUser.role === 'instructor' ? '<li><a href="instructor-dashboard.html">My Courses</a></li>' : ''}
        ${currentUser.role === 'admin'      ? '<li><a href="admin-dashboard.html">Admin</a></li>' : ''}
        <li><button id="themeToggle" class="theme-toggle" title="Toggle theme">🌙</button></li>
        <li><span style="color:white;margin-right:1rem">👤 ${currentUser.fullName}</span></li>
        <li><a href="#" id="logoutBtn" class="btn-nav-logout">Logout</a></li>
    `;

    document.getElementById('themeToggle')?.addEventListener('click', () => {
        const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('theme', t);
        document.getElementById('themeToggle').textContent = t === 'dark' ? '☀️' : '🌙';
    });

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

// Load static courses IMMEDIATELY — don't wait for DOMContentLoaded
(function initCourses() {
    const urlSearch = new URLSearchParams(window.location.search).get('search');
    if (urlSearch) {
        const input = document.getElementById('searchInput');
        if (input) input.value = urlSearch;
    }
    loadEnrollments().catch(() => {});
    loadCourses();
})();

document.addEventListener('DOMContentLoaded', () => {
    // Handle ?search= from home page hero
    const urlSearch = new URLSearchParams(window.location.search).get('search');
    if (urlSearch) {
        const input = document.getElementById('searchInput');
        if (input) {
            input.value = urlSearch;
            applySearch();
        }
    }
    // LiveSearch for suggestions dropdown
    try {
        new LiveSearch('searchInput', (id) => window.location.href = `course-detail.html?id=${id}`);
    } catch(e) { console.warn('LiveSearch init failed:', e); }
});
