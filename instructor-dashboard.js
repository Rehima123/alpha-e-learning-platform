// ─── Instructor Dashboard ─────────────────────────────────────────────────────
let currentUser = null;
let allPayments = [];
let allStudents = [];
let activeCourseId = null; // for lessons manager

// ── API helpers ───────────────────────────────────────────────────────────────
const iapi = {
    get:  (path)       => api.request(path, { method: 'GET' }),
    post: (path, body) => api.request(path, { method: 'POST',   body: JSON.stringify(body) }),
    put:  (path, body) => api.request(path, { method: 'PUT',    body: JSON.stringify(body) }),
    del:  (path)       => api.request(path, { method: 'DELETE' }),
};

// ── Tab Switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll('.idash-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.idash-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('panel-' + tab).classList.add('active');

    if (tab === 'courses')  loadCourseManager();
    if (tab === 'payments') loadPayments('all');
    if (tab === 'students') loadStudents();
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── Lightbox ──────────────────────────────────────────────────────────────────
function openLightbox(src) {
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); }

// ═══════════════════════════════════════════════════════════════
// 1. OVERVIEW
// ═══════════════════════════════════════════════════════════════
async function loadOverview() {
    try {
        const res = await iapi.get('/instructor/overview');
        if (!res.success) throw new Error(res.message);

        const { totalRevenue, totalStudents, activeCourses, pendingPayments, recentActivity } = res.overview;

        document.getElementById('metRevenue').textContent  = totalRevenue.toLocaleString() + ' ETB';
        document.getElementById('metStudents').textContent = totalStudents;
        document.getElementById('metCourses').textContent  = activeCourses;
        document.getElementById('metPending').textContent  = pendingPayments;

        // Badge on payments tab
        if (pendingPayments > 0) {
            const badge = document.getElementById('paymentBadge');
            badge.textContent = pendingPayments;
            badge.style.display = 'inline';
            document.getElementById('pendingBadge').style.display = 'block';
        }

        renderActivityFeed(recentActivity);
    } catch (err) {
        console.error('[loadOverview]', err);
        document.getElementById('activityFeed').innerHTML =
            `<div class="empty-state"><div class="empty-state-icon">📊</div><p>Could not load overview data.</p></div>`;
    }
}

function renderActivityFeed(items) {
    const feed = document.getElementById('activityFeed');
    if (!items || items.length === 0) {
        feed.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><p>No recent activity yet.</p></div>`;
        return;
    }
    feed.innerHTML = items.map(item => {
        const initials = (item.studentName || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const date = new Date(item.submittedAt).toLocaleDateString();
        return `
        <div class="activity-item">
            <div class="activity-avatar">${initials}</div>
            <div class="activity-info">
                <div class="activity-name">${escHtml(item.studentName)}</div>
                <div class="activity-detail">${item.courseIcon} ${escHtml(item.courseTitle)} · ${date}</div>
            </div>
            <div class="activity-amount">${item.amount.toLocaleString()} ETB</div>
            <span class="status-pill ${item.status === 'approved' ? 'approved' : item.status === 'rejected' ? 'rejected' : 'pending'}">
                ${item.status === 'pending_verification' ? '⏳ Pending' : item.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
            </span>
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// 2. COURSE MANAGER
// ═══════════════════════════════════════════════════════════════
async function loadCourseManager() {
    const grid = document.getElementById('courseManagerGrid');
    grid.innerHTML = '<div class="loading-spinner">Loading courses...</div>';
    try {
        const res = await iapi.get('/instructor/courses');
        if (!res.success) throw new Error(res.message);
        renderCourseCards(res.courses);
    } catch (err) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📚</div><p>${escHtml(err.message)}</p></div>`;
    }
}

function renderCourseCards(courses) {
    const grid = document.getElementById('courseManagerGrid');
    if (!courses || courses.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <div class="empty-state-icon">📚</div>
                <p>No courses yet. Click <strong>+ Add Course</strong> to get started.</p>
            </div>`;
        return;
    }
    grid.innerHTML = courses.map(course => {
        const statusColor = course.status === 'approved' ? '#27ae60' : course.status === 'rejected' ? '#e74c3c' : '#f39c12';
        const statusLabel = course.status === 'approved' ? '✓ Approved' : course.status === 'pending' ? '⏳ Pending' : '✗ Rejected';
        return `
        <div class="course-manager-card">
            <div class="course-manager-card-header">
                <div class="course-emoji">${course.icon || '📚'}</div>
                <div>
                    <div class="course-card-title">${escHtml(course.title)}</div>
                    <div class="course-card-meta">${course.category} · ${course.level}</div>
                    <span style="font-size:0.75rem;font-weight:700;color:${statusColor}">${statusLabel}</span>
                    ${course.isPublished ? '<span style="margin-left:8px;font-size:0.72rem;background:rgba(39,174,96,0.15);color:#27ae60;padding:2px 7px;border-radius:8px">Published</span>' : '<span style="margin-left:8px;font-size:0.72rem;background:rgba(255,255,255,0.08);color:var(--text-secondary);padding:2px 7px;border-radius:8px">Draft</span>'}
                </div>
            </div>
            <div class="course-manager-card-body">
                <div class="course-card-stats">
                    <div class="course-stat">
                        <div class="course-stat-val">${course.totalLessons || 0}</div>
                        <div class="course-stat-lbl">Lessons</div>
                    </div>
                    <div class="course-stat">
                        <div class="course-stat-val">${course.enrolledStudents || 0}</div>
                        <div class="course-stat-lbl">Students</div>
                    </div>
                    <div class="course-stat">
                        <div class="course-stat-val">${course.price === 0 ? 'Free' : course.price.toLocaleString() + ' ETB'}</div>
                        <div class="course-stat-lbl">Price</div>
                    </div>
                </div>
                <div class="course-card-actions">
                    <button class="btn-icon btn-edit"   onclick="editCourse('${course._id}')">✏️ Edit</button>
                    <button class="btn-icon btn-edit"   onclick="openLessonsManager('${course._id}', '${escAttr(course.title)}')">📖 Lessons</button>
                    <button class="btn-icon btn-delete" onclick="deleteCourse('${course._id}', '${escAttr(course.title)}')">🗑️ Delete</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Course Form ───────────────────────────────────────────────────────────────
function openCourseModalForCreate() {
    document.getElementById('courseModalTitle').textContent = 'Create New Course';
    document.getElementById('editCourseId').value = '';
    document.getElementById('fCourseTitle').value     = '';
    document.getElementById('fCourseDesc').value      = '';
    document.getElementById('fCoursePrice').value     = '';
    document.getElementById('fCourseCategory').value  = 'semester1';
    document.getElementById('fCourseLevel').value     = 'Freshman';
    document.getElementById('fCourseDuration').value  = '';
    document.getElementById('fCourseIcon').value      = '📚';
    document.getElementById('fCourseThumbnail').value = '';
    document.getElementById('fCoursePublished').checked = false;
    openModal('courseModal');
}

async function editCourse(courseId) {
    try {
        const res = await iapi.get('/instructor/courses');
        const course = res.courses?.find(c => c._id === courseId);
        if (!course) return toast?.error('Course not found');

        document.getElementById('courseModalTitle').textContent = 'Edit Course';
        document.getElementById('editCourseId').value           = courseId;
        document.getElementById('fCourseTitle').value           = course.title        || '';
        document.getElementById('fCourseDesc').value            = course.description  || '';
        document.getElementById('fCoursePrice').value           = course.price        ?? '';
        document.getElementById('fCourseCategory').value        = course.category     || 'semester1';
        document.getElementById('fCourseLevel').value           = course.level        || 'Freshman';
        document.getElementById('fCourseDuration').value        = course.duration     || '';
        document.getElementById('fCourseIcon').value            = course.icon         || '📚';
        document.getElementById('fCourseThumbnail').value       = course.thumbnail    || '';
        document.getElementById('fCoursePublished').checked     = !!course.isPublished;
        openModal('courseModal');
    } catch (err) {
        toast?.error('Failed to load course: ' + err.message);
    }
}

async function saveCourse() {
    const id = document.getElementById('editCourseId').value;
    const title = document.getElementById('fCourseTitle').value.trim();
    const description = document.getElementById('fCourseDesc').value.trim();

    if (!title || !description) return toast?.error('Title and description are required');

    const data = {
        title,
        description,
        price:       parseFloat(document.getElementById('fCoursePrice').value)  || 0,
        category:    document.getElementById('fCourseCategory').value,
        level:       document.getElementById('fCourseLevel').value,
        duration:    document.getElementById('fCourseDuration').value.trim()    || '16 weeks',
        icon:        document.getElementById('fCourseIcon').value.trim()        || '📚',
        thumbnail:   document.getElementById('fCourseThumbnail').value.trim()   || '',
        isPublished: document.getElementById('fCoursePublished').checked
    };

    try {
        let res;
        if (id) {
            res = await iapi.put(`/instructor/courses/${id}`, data);
        } else {
            res = await iapi.post('/instructor/courses', data);
        }
        if (!res.success) throw new Error(res.message);
        toast?.success(id ? 'Course updated!' : 'Course created and submitted for approval!');
        closeModal('courseModal');
        loadCourseManager();
        loadOverview();
    } catch (err) {
        toast?.error('Error: ' + err.message);
    }
}

async function deleteCourse(courseId, title) {
    if (!confirm(`Delete course "${title}"? This cannot be undone.`)) return;
    try {
        const res = await iapi.del(`/instructor/courses/${courseId}`);
        if (!res.success) throw new Error(res.message);
        toast?.success('Course deleted');
        loadCourseManager();
        loadOverview();
    } catch (err) {
        toast?.error('Error: ' + err.message);
    }
}

// ── Lessons Manager ───────────────────────────────────────────────────────────
function openLessonsManager(courseId, courseTitle) {
    activeCourseId = courseId;
    document.getElementById('lessonsCourseTitle').textContent = courseTitle;
    document.getElementById('lessonForm').style.display = 'none';
    openModal('lessonsModal');
    loadLessons(courseId);
}

async function loadLessons(courseId) {
    const list = document.getElementById('lessonsList');
    list.innerHTML = '<div class="loading-spinner">Loading lessons...</div>';
    try {
        const res = await iapi.get('/instructor/courses');
        const course = res.courses?.find(c => c._id === courseId);
        if (!course) throw new Error('Course not found');
        renderLessons(course.lessons || [], courseId);
    } catch (err) {
        list.innerHTML = `<div class="empty-state"><p>${escHtml(err.message)}</p></div>`;
    }
}

function renderLessons(lessons, courseId) {
    const list = document.getElementById('lessonsList');
    if (lessons.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📖</div><p>No lessons yet. Add your first lesson below.</p></div>`;
        return;
    }
    const sorted = [...lessons].sort((a, b) => (a.order || 0) - (b.order || 0));
    list.innerHTML = `
        <div class="lessons-panel">
            ${sorted.map(lesson => `
            <div class="lesson-row">
                <div class="lesson-order">${lesson.order || '?'}</div>
                <div class="lesson-info">
                    <div class="lesson-title-text">${escHtml(lesson.title)}</div>
                    <div class="lesson-meta">
                        ${lesson.duration ? '⏱ ' + lesson.duration + ' · ' : ''}
                        ${lesson.videoUrl ? '🎬 Video attached · ' : ''}
                        <span class="${lesson.isFree ? 'free-badge' : 'paid-badge'}">${lesson.isFree ? 'Free Preview' : 'Paid'}</span>
                    </div>
                </div>
                <button class="btn-icon btn-edit"   onclick="editLesson('${lesson._id}', ${JSON.stringify(lesson).replace(/"/g,'&quot;')})">✏️</button>
                <button class="btn-icon btn-delete" onclick="deleteLesson('${courseId}', '${lesson._id}', '${escAttr(lesson.title)}')">🗑️</button>
            </div>`).join('')}
        </div>`;
}

function openAddLessonForm() {
    document.getElementById('lessonFormTitle').textContent = 'Add New Lesson';
    document.getElementById('editLessonId').value    = '';
    document.getElementById('fLessonTitle').value    = '';
    document.getElementById('fLessonVideo').value    = '';
    document.getElementById('fLessonDuration').value = '';
    document.getElementById('fLessonOrder').value    = '';
    document.getElementById('fLessonFree').checked   = false;
    document.getElementById('lessonForm').style.display = 'block';
    document.getElementById('lessonForm').scrollIntoView({ behavior: 'smooth' });
}

function editLesson(lessonId, lesson) {
    document.getElementById('lessonFormTitle').textContent = 'Edit Lesson';
    document.getElementById('editLessonId').value    = lessonId;
    document.getElementById('fLessonTitle').value    = lesson.title    || '';
    document.getElementById('fLessonVideo').value    = lesson.videoUrl || '';
    document.getElementById('fLessonDuration').value = lesson.duration || '';
    document.getElementById('fLessonOrder').value    = lesson.order    || '';
    document.getElementById('fLessonFree').checked   = !!lesson.isFree;
    document.getElementById('lessonForm').style.display = 'block';
    document.getElementById('lessonForm').scrollIntoView({ behavior: 'smooth' });
}

function cancelLessonForm() {
    document.getElementById('lessonForm').style.display = 'none';
}

async function saveLesson() {
    if (!activeCourseId) return;
    const title = document.getElementById('fLessonTitle').value.trim();
    if (!title) return toast?.error('Lesson title is required');

    // Normalize YouTube URL → embed ID
    let videoUrl = document.getElementById('fLessonVideo').value.trim();
    videoUrl = normalizeYoutubeUrl(videoUrl);

    const data = {
        title,
        videoUrl,
        duration:    document.getElementById('fLessonDuration').value.trim(),
        order:       parseInt(document.getElementById('fLessonOrder').value) || undefined,
        isFree:      document.getElementById('fLessonFree').checked
    };

    const lessonId = document.getElementById('editLessonId').value;

    try {
        let res;
        if (lessonId) {
            res = await iapi.put(`/instructor/courses/${activeCourseId}/lessons/${lessonId}`, data);
        } else {
            res = await iapi.post(`/instructor/courses/${activeCourseId}/lessons`, data);
        }
        if (!res.success) throw new Error(res.message);
        toast?.success(lessonId ? 'Lesson updated!' : 'Lesson added!');
        cancelLessonForm();
        loadLessons(activeCourseId);
        loadCourseManager();
    } catch (err) {
        toast?.error('Error: ' + err.message);
    }
}

async function deleteLesson(courseId, lessonId, title) {
    if (!confirm(`Delete lesson "${title}"?`)) return;
    try {
        const res = await iapi.del(`/instructor/courses/${courseId}/lessons/${lessonId}`);
        if (!res.success) throw new Error(res.message);
        toast?.success('Lesson deleted');
        loadLessons(courseId);
        loadCourseManager();
    } catch (err) {
        toast?.error('Error: ' + err.message);
    }
}

function normalizeYoutubeUrl(url) {
    if (!url) return '';
    // Already an embed ID (no slash, no http)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return `https://www.youtube.com/embed/${url}`;
    // youtu.be/ID or youtube.com/watch?v=ID or /embed/ID
    const match = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url; // return as-is if unrecognized
}

// ═══════════════════════════════════════════════════════════════
// 3. PAYMENTS
// ═══════════════════════════════════════════════════════════════
let currentPaymentFilter = 'all';

async function loadPayments(status = 'all') {
    currentPaymentFilter = status;
    const tbody = document.getElementById('paymentsTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="loading-spinner">Loading...</td></tr>';
    try {
        const res = await iapi.get(`/instructor/payments?status=${status}`);
        if (!res.success) throw new Error(res.message);
        allPayments = res.payments;
        renderPaymentsTable(res.payments);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state">${escHtml(err.message)}</td></tr>`;
    }
}

function filterPayments(status, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadPayments(status);
}

function renderPaymentsTable(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!payments || payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">💳</div><p>No payments found.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = payments.map(p => {
        const date = new Date(p.submittedAt).toLocaleDateString();
        const statusClass = p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending';
        const statusLabel = p.status === 'pending_verification' ? '⏳ Pending' : p.status === 'approved' ? '✅ Approved' : '❌ Rejected';
        const receiptHtml = p.receiptImage
            ? `<img src="${p.receiptImage}" class="receipt-thumb" onclick="openLightbox('${p.receiptImage.replace(/'/g,"\\'")} ')" alt="Receipt" title="Click to enlarge">`
            : '<span style="color:var(--text-secondary);font-size:0.75rem">No image</span>';
        const actionHtml = p.status === 'pending_verification'
            ? `<button class="btn-icon btn-approve" onclick="approvePayment('${p._id}')">✅ Approve</button>
               <button class="btn-icon btn-reject"  onclick="openRejectModal('${p._id}')">❌ Reject</button>`
            : `<span style="color:var(--text-secondary);font-size:0.78rem">—</span>`;

        return `
        <tr>
            <td><span style="font-weight:600">${escHtml(p.student?.fullName || 'Unknown')}</span></td>
            <td><span style="font-size:0.78rem;color:var(--text-secondary)">${escHtml(p.student?.email || '')}</span></td>
            <td>${p.course?.icon || '📚'} ${escHtml(p.course?.title || p.plan || 'Unknown')}</td>
            <td><strong style="color:#27ae60">${(p.amount || 0).toLocaleString()} ETB</strong></td>
            <td style="font-size:0.78rem;color:var(--text-secondary)">${date}</td>
            <td>${receiptHtml}</td>
            <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
            <td style="white-space:nowrap">${actionHtml}</td>
        </tr>`;
    }).join('');
}

async function approvePayment(paymentId) {
    if (!confirm('Approve this payment and grant course access to the student?')) return;
    try {
        const res = await iapi.put(`/instructor/payments/${paymentId}/approve`, {});
        if (!res.success) throw new Error(res.message);
        toast?.success('Payment approved! Student notified via email.');
        loadPayments(currentPaymentFilter);
        loadOverview();
    } catch (err) {
        toast?.error('Error: ' + err.message);
    }
}

function openRejectModal(paymentId) {
    document.getElementById('rejectPaymentId').value = paymentId;
    document.getElementById('rejectReason').value = '';
    openModal('rejectModal');
}

async function confirmRejectPayment() {
    const paymentId = document.getElementById('rejectPaymentId').value;
    const reason    = document.getElementById('rejectReason').value.trim();
    if (!reason) return toast?.error('Please provide a rejection reason');
    try {
        const res = await iapi.put(`/instructor/payments/${paymentId}/reject`, { reason });
        if (!res.success) throw new Error(res.message);
        toast?.success('Payment rejected. Student notified via email.');
        closeModal('rejectModal');
        loadPayments(currentPaymentFilter);
        loadOverview();
    } catch (err) {
        toast?.error('Error: ' + err.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// 4. STUDENTS
// ═══════════════════════════════════════════════════════════════
async function loadStudents(search = '') {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-spinner">Loading...</td></tr>';
    try {
        const url = search ? `/instructor/students?search=${encodeURIComponent(search)}` : '/instructor/students';
        const res = await iapi.get(url);
        if (!res.success) throw new Error(res.message);
        allStudents = res.students;
        renderStudentsTable(res.students);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">${escHtml(err.message)}</div></td></tr>`;
    }
}

function searchStudents(value) {
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => loadStudents(value), 350);
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTableBody');
    if (!students || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">👥</div><p>No enrolled students found.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = students.map(s => {
        const enrolledDate = new Date(s.enrolledAt).toLocaleDateString();
        const isActive = s.status === 'approved';
        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.78rem;flex-shrink:0">
                        ${(s.studentName || 'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                    </div>
                    <span style="font-weight:600;font-size:0.88rem">${escHtml(s.studentName)}</span>
                </div>
            </td>
            <td style="font-size:0.78rem;color:var(--text-secondary)">${escHtml(s.email)}</td>
            <td>${s.courseIcon || '📚'} ${escHtml(s.courseTitle)}</td>
            <td style="font-size:0.78rem;color:var(--text-secondary)">${enrolledDate}</td>
            <td>
                <div style="display:flex;align-items:center;gap:8px">
                    <div class="progress-bar-wrap">
                        <div class="progress-bar-fill" style="width:${s.progress}%"></div>
                    </div>
                    <span style="font-size:0.78rem;font-weight:600;color:var(--text-secondary)">${s.progress}%</span>
                </div>
                <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:2px">${s.completedLessons}/${s.totalLessons} lessons</div>
            </td>
            <td>
                ${isActive
                    ? `<button class="btn-icon btn-revoke" onclick="toggleAccess('${s.enrollmentId}','revoke','${escAttr(s.studentName)}')">🚫 Revoke</button>`
                    : `<button class="btn-icon btn-grant"  onclick="toggleAccess('${s.enrollmentId}','grant','${escAttr(s.studentName)}')">✅ Grant</button>`
                }
            </td>
        </tr>`;
    }).join('');
}

async function toggleAccess(enrollmentId, action, studentName) {
    const msg = action === 'revoke'
        ? `Revoke access for ${studentName}? They will no longer be able to access the course.`
        : `Grant access back to ${studentName}?`;
    if (!confirm(msg)) return;
    try {
        const res = await iapi.put(`/instructor/students/${enrollmentId}/access`, { action });
        if (!res.success) throw new Error(res.message);
        toast?.success(`Access ${action === 'grant' ? 'granted' : 'revoked'} for ${studentName}`);
        loadStudents(document.getElementById('studentSearch').value);
    } catch (err) {
        toast?.error('Error: ' + err.message);
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
    return escHtml(str).replace(/'/g,'&#39;');
}

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api.logout(); } catch {}
    api.removeAuthToken();
    localStorage.removeItem('currentUser');
    window.location.href = 'home.html';
});

// Theme toggle
document.getElementById('themeToggle')?.addEventListener('click', () => {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    document.getElementById('themeToggle').textContent = t === 'dark' ? '☀️' : '🌙';
});

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
    const user = await requireInstructor();
    if (!user) return;
    currentUser = user;

    const welcomeEl = document.getElementById('welcomeMsg');
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${user.fullName || 'Instructor'}!`;

    // Update navbar with user info
    const navLinks = document.getElementById('navLinks');
    if (navLinks && user) {
        const initials = (user.fullName || 'I').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
        const existing = navLinks.querySelector('#userDisplay');
        if (!existing) {
            const li = document.createElement('li');
            li.innerHTML = `<span id="userDisplay" style="display:flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:0.85rem">
                <span style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.7rem">${initials}</span>
                ${user.fullName?.split(' ')[0] || ''}
            </span>`;
            navLinks.insertBefore(li, document.getElementById('logoutBtn')?.parentElement);
        }
    }

    // Load overview immediately
    loadOverview();
})();
