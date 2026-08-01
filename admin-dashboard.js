// ── Auth guard — verified server-side at bottom of file ──────────────────────
let currentUser = JSON.parse(localStorage.getItem('currentUser'));

// ── Role permission helper (mirrors server) ───────────────────────────────────
const ROLE_PERMISSIONS = {
    super_admin:   ['*'],
    admin:         ['*'],
    content_admin: ['courses','videos'],
    finance_admin: ['payments','coupons','revenue'],
    support_admin: ['enrollments','tickets','users.view'],
    instructor:    [],
    student:       []
};

function hasAccess(section) {
    if (!currentUser) return false;
    const perms = ROLE_PERMISSIONS[currentUser.role] || [];
    return perms.includes('*') || perms.some(p => section.startsWith(p));
}

// ── Role badge ────────────────────────────────────────────────────────────────
const ROLE_LABELS = {
    super_admin:   { label: '⚡ Super Admin',    color: '#e74c3c' },
    admin:         { label: '🔑 Admin',           color: '#8e44ad' },
    content_admin: { label: '📝 Content Admin',   color: '#2980b9' },
    finance_admin: { label: '💰 Finance Admin',   color: '#27ae60' },
    support_admin: { label: '🎧 Support Admin',   color: '#e67e22' },
    instructor:    { label: '🎓 Instructor',      color: '#16a085' },
    student:       { label: '📚 Student',         color: '#7f8c8d' }
};

// ── Show only tabs the current role can access ─────────────────────────────────
function applyRoleBasedUI() {
    if (!currentUser) return;

    // Show role badge in header
    const badge = ROLE_LABELS[currentUser.role];
    const headerEl = document.querySelector('.admin-header h2') || document.querySelector('h2');
    if (headerEl && badge) {
        headerEl.insertAdjacentHTML('afterend',
            `<span style="display:inline-block;background:${badge.color};color:white;
            padding:3px 12px;border-radius:20px;font-size:0.78rem;font-weight:700;margin-top:6px">
            ${badge.label}</span>`
        );
    }

    // Hide/show tabs based on role
    const tabRules = {
        'enrollments':     ['*','enrollments'],
        'courses':         ['*','courses'],
        'revenue':         ['*','revenue','payments'],
        'coupons':         ['*','coupons','payments'],
        'videos':          ['*','videos','courses'],
        'users':           ['*','users.view'],
        'tickets':         ['*','tickets'],
        'manual-payments': ['*','payments','revenue']
    };

    Object.entries(tabRules).forEach(([tab, allowedPerms]) => {
        const btn = document.querySelector(`[data-tab="${tab}"]`);
        if (!btn) return;
        const perms = ROLE_PERMISSIONS[currentUser.role] || [];
        const canSee = perms.includes('*') || allowedPerms.some(p => perms.includes(p));
        btn.style.display = canSee ? '' : 'none';
    });

    // Show user management only to super_admin
    const userTabBtn = document.querySelector('[data-tab="users"]');
    if (userTabBtn && currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
        userTabBtn.style.display = 'none';
    }
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function showTab(tab) {
    document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab).style.display = 'block';
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
}

// ── Load all admin data ───────────────────────────────────────────────────────
async function loadAdminData() {
    try {
        const [statsRes, pendingEnrollRes] = await Promise.all([
            api.getAdminStats(),
            api.getPendingEnrollments()
        ]);

        if (statsRes.success) {
            const s = statsRes.stats;
            document.getElementById('totalUsers').textContent = s.totalUsers || 0;
            document.getElementById('totalInstructors').textContent = s.totalInstructors || 0;
            document.getElementById('pendingApprovals').textContent = s.pendingCourses || 0;
            document.getElementById('pendingEnrollCount').textContent =
                pendingEnrollRes.success ? pendingEnrollRes.count : 0;
        }

        await Promise.all([
            loadPendingCourses(),
            loadEnrollmentRequests(),
            loadUsers(),
            loadManualPaymentBadge()
        ]);
    } catch (error) {
        console.error('Error loading admin data:', error);
        toast?.error('Failed to load admin data');
    }
}

// ── Pending course approvals ──────────────────────────────────────────────────
async function loadPendingCourses() {
    const container = document.getElementById('pendingCoursesList');
    try {
        const response = await api.getPendingCourses();
        if (!response.success || response.courses.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);padding:1rem">No pending courses</p>';
            return;
        }
        container.innerHTML = response.courses.map(course => {
            const instructor = course.instructorName || course.instructor?.fullName || 'Unknown';
            return `
                <div class="approval-card">
                    <div class="approval-header">
                        <div>
                            <h4>${course.icon || '📚'} ${course.title}</h4>
                            <p style="color:var(--text-secondary);font-size:0.85rem">by ${instructor} · ${course.category} · $${course.price}</p>
                        </div>
                        <div class="approval-actions">
                            <button class="btn btn-success btn-sm" onclick="approveCourse('${course._id}')">✓ Approve</button>
                            <button class="btn btn-danger btn-sm" onclick="rejectCourse('${course._id}')">✗ Reject</button>
                        </div>
                    </div>
                    <p style="font-size:0.88rem;color:var(--text-secondary)">${course.description}</p>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p style="color:red">Failed to load pending courses</p>';
    }
}

async function approveCourse(id) {
    try {
        const res = await api.approveCourse(id);
        if (res.success) { toast?.success('Course approved!'); await loadAdminData(); }
    } catch (e) { toast?.error('Failed to approve course'); }
}

async function rejectCourse(id) {
    if (!confirm('Reject this course?')) return;
    try {
        const res = await api.rejectCourse(id);
        if (res.success) { toast?.warning('Course rejected'); await loadAdminData(); }
    } catch (e) { toast?.error('Failed to reject course'); }
}

// ── Enrollment requests ───────────────────────────────────────────────────────
async function loadEnrollmentRequests() {
    const container = document.getElementById('enrollmentRequestsList');
    try {
        const response = await api.getAllEnrollments();
        if (!response.success || response.enrollments.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);padding:1rem">No enrollment requests yet</p>';
            return;
        }

        // Sort: pending first, then by date descending
        const sorted = [...response.enrollments].sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return new Date(b.requestedAt) - new Date(a.requestedAt);
        });

        const pendingCount = sorted.filter(e => e.status === 'pending').length;
        const statusColor = { pending: '#f39c12', approved: '#27ae60', rejected: '#e74c3c' };
        const statusIcon  = { pending: '⏳', approved: '✅', rejected: '❌' };

        container.innerHTML = `
            ${pendingCount > 0 ? `
            <div style="background:rgba(243,156,18,0.08);border:1px solid rgba(243,156,18,0.3);
                border-radius:10px;padding:10px 16px;margin-bottom:1rem;font-size:0.88rem;color:#b7770d">
                ⏳ <strong>${pendingCount}</strong> enrollment${pendingCount !== 1 ? 's' : ''} waiting for approval
            </div>` : ''}
            <table class="users-table">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Requested</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(e => `
                        <tr style="${e.status === 'pending' ? 'background:rgba(243,156,18,0.04)' : ''}">
                            <td>
                                <strong>${e.student?.fullName || 'Unknown'}</strong><br>
                                <small style="color:var(--text-secondary)">${e.student?.email || ''}</small>
                            </td>
                            <td>${e.course?.icon || '📚'} ${e.course?.title || 'Unknown'}</td>
                            <td style="font-size:0.82rem;color:var(--text-secondary)">${new Date(e.requestedAt).toLocaleDateString()}</td>
                            <td>
                                <span style="color:${statusColor[e.status]};font-weight:600">
                                    ${statusIcon[e.status]} ${e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                                </span>
                            </td>
                            <td>
                                ${e.status === 'pending' ? `
                                    <button class="btn btn-success btn-sm" onclick="approveEnrollment('${e._id}')">✓ Approve</button>
                                    <button class="btn btn-danger btn-sm" onclick="rejectEnrollment('${e._id}')">✗ Reject</button>
                                ` : `<span style="font-size:0.8rem;color:var(--text-secondary)">Reviewed</span>`}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Update badge
        const badge = document.getElementById('enrollBadge');
        if (badge) badge.textContent = pendingCount > 0 ? pendingCount : '';

    } catch (error) {
        container.innerHTML = '<p style="color:red">Failed to load enrollment requests</p>';
    }
}

async function approveEnrollment(id) {
    try {
        const res = await api.approveEnrollment(id);
        if (res.success) {
            toast?.success(`Enrollment approved for ${res.enrollment.student?.fullName}`);
            await loadEnrollmentRequests();
            await loadAdminData();
        }
    } catch (e) { toast?.error('Failed to approve enrollment'); }
}

async function rejectEnrollment(id) {
    const reason = prompt('Reason for rejection (optional):') || '';
    try {
        const res = await api.rejectEnrollment(id, reason);
        if (res.success) {
            toast?.warning('Enrollment rejected');
            await loadEnrollmentRequests();
            await loadAdminData();
        }
    } catch (e) { toast?.error('Failed to reject enrollment'); }
}

// ── Admin: create course ──────────────────────────────────────────────────────
function showCreateCourseModal() {
    document.getElementById('createCourseModal').style.display = 'flex';
}
function closeCreateCourseModal() {
    document.getElementById('createCourseModal').style.display = 'none';
}

// ── Chapter/Lesson builder (create form) ──────────────────────────────────────
let courseChapters = [];

function updateLockDefault() {
    const isPremium = document.getElementById('newIsPremium').value === 'true';
    const lockSel   = document.getElementById('newIsLocked');
    if (lockSel) lockSel.value = isPremium ? 'true' : 'false';
}

function addChapter() {
    courseChapters.push({ title: '', lessons: [] });
    renderChapterBuilder();
}

function removeChapter(idx) {
    courseChapters.splice(idx, 1);
    renderChapterBuilder();
}

function addLesson(chapterIdx) {
    courseChapters[chapterIdx].lessons.push({ title: '', duration: '', videoUrl: '', notes: '' });
    renderChapterBuilder();
}

function removeLesson(chapterIdx, lessonIdx) {
    courseChapters[chapterIdx].lessons.splice(lessonIdx, 1);
    renderChapterBuilder();
}

function syncChapterData() {
    // Sync current input values back into courseChapters before re-render
    courseChapters.forEach((ch, ci) => {
        const titleEl = document.getElementById(`ch-title-${ci}`);
        if (titleEl) ch.title = titleEl.value;
        ch.lessons.forEach((l, li) => {
            const lt = document.getElementById(`l-title-${ci}-${li}`);
            const ld = document.getElementById(`l-dur-${ci}-${li}`);
            const lv = document.getElementById(`l-vid-${ci}-${li}`);
            const ln = document.getElementById(`l-notes-${ci}-${li}`);
            if (lt) l.title    = lt.value;
            if (ld) l.duration = ld.value;
            if (lv) l.videoUrl = lv.value;
            if (ln) l.notes    = ln.value;
        });
    });
}

function renderChapterBuilder() {
    const container = document.getElementById('chaptersBuilder');
    if (!container) return;
    container.innerHTML = courseChapters.map((ch, ci) => `
        <div style="border:1px solid var(--border-color);border-radius:12px;overflow:hidden">
            <div style="background:rgba(102,126,234,0.08);padding:10px 14px;display:flex;align-items:center;gap:8px">
                <strong style="color:var(--text-primary);font-size:0.88rem">Chapter ${ci + 1}</strong>
                <input type="text" id="ch-title-${ci}" value="${ch.title}"
                    placeholder="Chapter title..." oninput="courseChapters[${ci}].title=this.value"
                    style="flex:1;padding:6px 10px;border:1px solid var(--border-color);border-radius:8px;
                        background:var(--bg-primary);color:var(--text-primary);font-size:0.85rem">
                <button type="button" onclick="syncChapterData();addLesson(${ci})"
                    class="btn btn-success btn-sm" style="white-space:nowrap;font-size:0.78rem">+ Lesson</button>
                <button type="button" onclick="syncChapterData();removeChapter(${ci})"
                    class="btn btn-danger btn-sm" style="font-size:0.78rem">✕</button>
            </div>
            <div style="padding:8px 14px 14px;display:flex;flex-direction:column;gap:8px">
                ${ch.lessons.length === 0 ? '<p style="color:var(--text-secondary);font-size:0.82rem;margin:4px 0">No lessons yet — click + Lesson</p>' : ''}
                ${ch.lessons.map((l, li) => `
                    <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;padding:10px 12px">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                            <span style="font-size:0.78rem;color:var(--text-secondary);white-space:nowrap">Lesson ${li+1}</span>
                            <input type="text" id="l-title-${ci}-${li}" value="${l.title}"
                                placeholder="Lesson title..." oninput="courseChapters[${ci}].lessons[${li}].title=this.value"
                                style="flex:1;padding:5px 8px;border:1px solid var(--border-color);border-radius:6px;
                                    background:var(--bg-secondary);color:var(--text-primary);font-size:0.82rem">
                            <button type="button" onclick="syncChapterData();removeLesson(${ci},${li})"
                                class="btn btn-danger btn-sm" style="font-size:0.72rem;padding:3px 8px">✕</button>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 2fr;gap:6px;margin-bottom:6px">
                            <input type="text" id="l-dur-${ci}-${li}" value="${l.duration}"
                                placeholder="Duration (e.g. 30 min)" oninput="courseChapters[${ci}].lessons[${li}].duration=this.value"
                                style="padding:5px 8px;border:1px solid var(--border-color);border-radius:6px;
                                    background:var(--bg-secondary);color:var(--text-primary);font-size:0.8rem">
                            <input type="text" id="l-vid-${ci}-${li}" value="${l.videoUrl}"
                                placeholder="YouTube URL (optional)" oninput="courseChapters[${ci}].lessons[${li}].videoUrl=this.value"
                                style="padding:5px 8px;border:1px solid var(--border-color);border-radius:6px;
                                    background:var(--bg-secondary);color:var(--text-primary);font-size:0.8rem">
                        </div>
                        <textarea id="l-notes-${ci}-${li}" rows="2"
                            placeholder="Study notes (markdown supported)..."
                            oninput="courseChapters[${ci}].lessons[${li}].notes=this.value"
                            style="width:100%;padding:5px 8px;border:1px solid var(--border-color);border-radius:6px;
                                background:var(--bg-secondary);color:var(--text-primary);font-size:0.8rem;resize:vertical"
                        >${l.notes}</textarea>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

document.getElementById('createCourseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Sync any in-progress text field values before reading
    syncChapterData();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Creating...';

    try {
        const data = {
            title:       document.getElementById('newTitle').value,
            description: document.getElementById('newDescription').value,
            category:    document.getElementById('newCategory').value,
            level:       document.getElementById('newLevel').value,
            duration:    document.getElementById('newDuration').value,
            price:       parseFloat(document.getElementById('newPrice').value),
            icon:        document.getElementById('newIcon').value || '📚',
            isPremium:   document.getElementById('newIsPremium').value === 'true',
            isLocked:    document.getElementById('newIsLocked').value === 'true',
            isFreePreview: document.getElementById('newFreePreview').value === 'true',
            chapters: courseChapters.map((ch, ci) => ({
                title: ch.title,
                order: ci,
                lessons: ch.lessons.map((l, li) => ({
                    title:    l.title,
                    duration: l.duration,
                    videoUrl: l.videoUrl,
                    notes:    l.notes,
                    order:    li
                }))
            }))
        };

        const res = await api.createCourse(data);
        if (res.success) {
            const publishNow = document.getElementById('newPublishNow')?.checked;
            if (publishNow) await api.approveCourse(res.course._id);
            toast?.success(publishNow ? 'Course created and published!' : 'Course created (pending approval)');
            closeCreateCourseModal();
            e.target.reset();
            courseChapters = [];
            renderChapterBuilder();
            await loadAdminData();
        }
    } catch (err) {
        toast?.error(err.message || 'Failed to create course');
    } finally {
        btn.disabled = false; btn.textContent = 'Create Course';
    }
});

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadUsers() {
    const container = document.getElementById('usersList');
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
    try {
        const response = await api.getAllUsers();
        if (!response.success || response.users.length === 0) {
            container.innerHTML = '<p>No users found</p>'; return;
        }

        const roleColors = {
            super_admin:   '#e74c3c', admin: '#8e44ad',
            content_admin: '#2980b9', finance_admin: '#27ae60',
            support_admin: '#e67e22', instructor: '#16a085', student: '#7f8c8d'
        };
        const roleLabel = r => ({
            super_admin:'⚡ Super Admin', admin:'🔑 Admin',
            content_admin:'📝 Content', finance_admin:'💰 Finance',
            support_admin:'🎧 Support', instructor:'🎓 Instructor', student:'📚 Student'
        }[r] || r);

        container.innerHTML = `
            <table class="users-table">
                <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Subscription</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${response.users.map(u => `
                        <tr>
                            <td>${u.fullName}</td>
                            <td style="font-size:0.85rem">${u.email}</td>
                            <td>
                                <span style="display:inline-block;background:${roleColors[u.role]||'#7f8c8d'};
                                    color:white;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:700">
                                    ${roleLabel(u.role)}
                                </span>
                            </td>
                            <td>${u.subscription?.plan || 'free'}</td>
                            <td>${u.isActive ? '<span style="color:#27ae60">✓ Active</span>' : '<span style="color:#e74c3c">✗ Inactive</span>'}</td>
                            <td style="font-size:0.82rem;color:var(--text-secondary)">${new Date(u.createdAt).toLocaleDateString()}</td>
                            <td style="display:flex;gap:6px;flex-wrap:wrap">
                                ${isSuperAdmin ? `
                                <select onchange="changeUserRole('${u._id}', this.value)"
                                    style="padding:4px 8px;border-radius:6px;border:1px solid var(--border-color);
                                    background:var(--bg-secondary);color:var(--text-primary);font-size:0.78rem;cursor:pointer">
                                    <option value="">Change Role...</option>
                                    <option value="student"       ${u.role==='student'?'selected':''}>📚 Student</option>
                                    <option value="instructor"    ${u.role==='instructor'?'selected':''}>🎓 Instructor</option>
                                    <option value="support_admin" ${u.role==='support_admin'?'selected':''}>🎧 Support Admin</option>
                                    <option value="content_admin" ${u.role==='content_admin'?'selected':''}>📝 Content Admin</option>
                                    <option value="finance_admin" ${u.role==='finance_admin'?'selected':''}>💰 Finance Admin</option>
                                    <option value="super_admin"   ${u.role==='super_admin'?'selected':''}>⚡ Super Admin</option>
                                </select>
                                ` : ''}
                                ${u.isActive
                                    ? `<button class="btn btn-sm btn-danger" onclick="deactivateUser('${u._id}')">Deactivate</button>`
                                    : `<button class="btn btn-sm btn-success" onclick="activateUser('${u._id}')">Activate</button>`
                                }
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        container.innerHTML = '<p style="color:red">Failed to load users</p>';
    }
}

async function changeUserRole(userId, newRole) {
    if (!newRole) return;
    if (!confirm(`Change this user's role to "${newRole}"?`)) return;
    try {
        const res = await api.request(`/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
        });
        if (res.success) {
            toast?.success(`Role updated to ${newRole}`);
            await loadUsers();
        }
    } catch (e) { toast?.error('Failed to update role'); }
}

async function deactivateUser(id) {
    if (!confirm('Deactivate this user?')) return;
    try {
        const res = await api.deactivateUser(id);
        if (res.success) { toast?.warning('User deactivated'); await loadUsers(); }
    } catch (e) { toast?.error('Failed'); }
}

async function activateUser(id) {
    try {
        const res = await api.activateUser(id);
        if (res.success) { toast?.success('User activated'); await loadUsers(); }
    } catch (e) { toast?.error('Failed'); }
}

// ── Video manager ─────────────────────────────────────────────────────────────
let videoCourses = [];

async function loadVideoManager() {
    try {
        const res = await api.getCourses();
        if (res.success) {
            videoCourses = res.courses || [];
            const select = document.getElementById('videoCourseSelect');
            select.innerHTML = '<option value="">Choose a course...</option>' +
                videoCourses.map(c => `<option value="${c._id}">${c.icon || '📚'} ${c.title}</option>`).join('');
        }
    } catch (e) { toast?.error('Failed to load courses'); }
}

async function loadCourseChapters() {
    const courseId = document.getElementById('videoCourseSelect').value;
    const container = document.getElementById('videoChaptersList');
    if (!courseId) { container.innerHTML = ''; return; }

    container.innerHTML = '<p style="color:var(--text-secondary)">Loading...</p>';
    try {
        const res = await api.request(`/videos/course/${courseId}`);
        if (!res.success) throw new Error();
        const course = res.course;
        const chapters = course.chapters || [];

        if (chapters.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary)">No chapters found for this course.</p>';
            return;
        }

        container.innerHTML = chapters.map((ch, ci) => `
            <div style="background:var(--bg-secondary);border-radius:12px;margin-bottom:12px;
                border:1px solid var(--border-color);overflow:hidden">
                <div style="padding:12px 16px;background:rgba(102,126,234,0.06);
                    border-bottom:1px solid var(--border-color);font-weight:700;color:var(--text-primary)">
                    Chapter ${ci + 1}: ${ch.title}
                </div>
                ${(ch.lessons || []).map((lesson, li) => `
                    <div style="padding:12px 16px;border-bottom:1px solid var(--border-color);display:flex;
                        align-items:center;gap:12px;flex-wrap:wrap">
                        <div style="flex:1;min-width:150px">
                            <p style="margin:0;font-size:0.88rem;font-weight:600;color:var(--text-primary)">
                                ${li + 1}. ${lesson.title}
                            </p>
                            ${lesson.videoUrl ? `
                                <p style="margin:3px 0 0;font-size:0.75rem;color:#27ae60">
                                    ✓ Video linked
                                </p>` : `
                                <p style="margin:3px 0 0;font-size:0.75rem;color:var(--text-secondary)">
                                    No video yet
                                </p>`
                            }
                        </div>
                        <div style="display:flex;gap:8px;align-items:center;flex:2;min-width:200px">
                            <input type="text" id="yt-${ci}-${li}"
                                value="${lesson.videoUrl || ''}"
                                placeholder="https://youtube.com/watch?v=..."
                                style="flex:1;padding:7px 10px;border:1px solid var(--border-color);
                                    border-radius:8px;background:var(--bg-primary);color:var(--text-primary);
                                    font-size:0.82rem">
                            <button onclick="saveVideoUrl('${courseId}', ${ci}, ${li})"
                                class="btn btn-success btn-sm" style="white-space:nowrap">
                                💾 Save
                            </button>
                            ${lesson.videoUrl ? `
                                <a href="${lesson.videoUrl}" target="_blank"
                                    class="btn btn-sm" style="white-space:nowrap">▶ Test</a>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    } catch {
        container.innerHTML = '<p style="color:red">Failed to load course chapters</p>';
    }
}

async function saveVideoUrl(courseId, chapterIdx, lessonIdx) {
    const input = document.getElementById(`yt-${chapterIdx}-${lessonIdx}`);
    const videoUrl = input?.value.trim() || '';

    try {
        const res = await api.request('/videos/lesson', {
            method: 'PUT',
            body: JSON.stringify({ courseId, chapterIdx, lessonIdx, videoUrl })
        });
        if (res.success) {
            toast?.success('Video URL saved!');
            // Update visual indicator
            const indicator = input.closest('div[style*="flex:2"]')?.previousElementSibling?.querySelector('p:last-child');
            if (indicator) {
                indicator.style.color = videoUrl ? '#27ae60' : 'var(--text-secondary)';
                indicator.textContent = videoUrl ? '✓ Video linked' : 'No video yet';
            }
        }
    } catch (e) {
        toast?.error(e.message || 'Failed to save video URL');
    }
}

// ── Revenue report ────────────────────────────────────────────────────────────
async function loadRevenue() {
    const period = document.getElementById('revPeriod')?.value || 30;
    const container = document.getElementById('revenueContent');
    container.innerHTML = '<p style="color:var(--text-secondary)">Loading...</p>';
    try {
        const res = await api.request(`/payments/report?period=${period}`);
        if (!res.success) throw new Error();
        const t = res.totals;

        container.innerHTML = `
            <div class="dashboard-stats" style="margin-bottom:1.5rem">
                <div class="stat-card"><h3>${t.totalRevenue?.toLocaleString() || 0}</h3><p>Total Revenue (ETB)</p></div>
                <div class="stat-card"><h3>${t.platformRevenue?.toLocaleString() || 0}</h3><p>Platform Share (ETB)</p></div>
                <div class="stat-card"><h3>${t.instructorPaid?.toLocaleString() || 0}</h3><p>Instructor Payouts (ETB)</p></div>
                <div class="stat-card"><h3>${t.count || 0}</h3><p>Transactions</p></div>
                <div class="stat-card"><h3>${t.totalDiscount?.toLocaleString() || 0}</h3><p>Discounts Given (ETB)</p></div>
                <div class="stat-card"><h3>${t.totalTax?.toLocaleString() || 0}</h3><p>Tax Collected (ETB)</p></div>
            </div>

            ${res.byCourse.length > 0 ? `
            <h4 style="margin-bottom:0.8rem;color:var(--text-primary)">Top Courses by Revenue</h4>
            <table class="users-table" style="margin-bottom:1.5rem">
                <thead><tr><th>Course</th><th>Sales</th><th>Revenue (ETB)</th></tr></thead>
                <tbody>
                    ${res.byCourse.map(c => `
                        <tr>
                            <td>${c.icon || '📚'} ${c.title}</td>
                            <td>${c.count}</td>
                            <td style="font-weight:600;color:#667eea">${c.revenue?.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>` : ''}

            ${res.byDay.length > 0 ? `
            <h4 style="margin-bottom:0.8rem;color:var(--text-primary)">Daily Revenue</h4>
            <table class="users-table">
                <thead><tr><th>Date</th><th>Transactions</th><th>Revenue (ETB)</th></tr></thead>
                <tbody>
                    ${res.byDay.map(d => `
                        <tr>
                            <td>${d._id}</td>
                            <td>${d.count}</td>
                            <td style="font-weight:600;color:#27ae60">${d.revenue?.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>` : '<p style="color:var(--text-secondary)">No transactions in this period</p>'}
        `;
    } catch {
        container.innerHTML = '<p style="color:red">Failed to load revenue data</p>';
    }
}

// ── Coupons ───────────────────────────────────────────────────────────────────
function showCouponForm() {
    document.getElementById('couponFormBox').style.display = 'block';
}

async function createCoupon() {
    const code = document.getElementById('cpCode').value.trim().toUpperCase();
    const type = document.getElementById('cpType').value;
    const value = parseFloat(document.getElementById('cpValue').value);
    const maxUses = document.getElementById('cpMaxUses').value;
    const expiresAt = document.getElementById('cpExpires').value;
    const description = document.getElementById('cpDesc').value;

    if (!code || !value) { toast?.error('Code and value are required'); return; }

    try {
        const res = await api.request('/coupons', {
            method: 'POST',
            body: JSON.stringify({ code, type, value, description,
                maxUses: maxUses ? parseInt(maxUses) : null,
                expiresAt: expiresAt || null })
        });
        if (res.success) {
            toast?.success(`Coupon ${code} created!`);
            document.getElementById('couponFormBox').style.display = 'none';
            await loadCoupons();
        }
    } catch (e) { toast?.error(e.message || 'Failed to create coupon'); }
}

async function loadCoupons() {
    const container = document.getElementById('couponsList');
    try {
        const res = await api.request('/coupons');
        if (!res.success || res.coupons.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary)">No coupons yet</p>'; return;
        }
        container.innerHTML = `
            <table class="users-table">
                <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Used</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    ${res.coupons.map(c => `
                        <tr>
                            <td><strong style="color:#667eea">${c.code}</strong></td>
                            <td>${c.type === 'percent' ? `${c.value}%` : `${c.value} ETB`}</td>
                            <td>${c.type === 'percent' ? `${c.value}% off` : `${c.value} ETB off`}</td>
                            <td>${c.usedCount}${c.maxUses ? '/' + c.maxUses : ''}</td>
                            <td style="font-size:0.82rem">${c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</td>
                            <td>${c.isActive ? '<span style="color:#27ae60">✓ Active</span>' : '<span style="color:#e74c3c">Inactive</span>'}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="deleteCoupon('${c._id}','${c.code}')">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch { container.innerHTML = '<p style="color:red">Failed to load coupons</p>'; }
}

async function deleteCoupon(id, code) {
    if (!confirm(`Delete coupon ${code}?`)) return;
    try {
        await api.request(`/coupons/${id}`, { method: 'DELETE' });
        toast?.warning(`Coupon ${code} deleted`);
        await loadCoupons();
    } catch { toast?.error('Failed to delete coupon'); }
}

// ── Support Tickets ───────────────────────────────────────────────────────────
async function loadTickets() {
    const container = document.getElementById('ticketsList');
    try {
        const res = await api.request('/admin/tickets');
        if (!res.success || !res.tickets || res.tickets.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:3rem;color:var(--text-secondary)">
                    <div style="font-size:3rem;margin-bottom:1rem">🎧</div>
                    <p>No support tickets yet.</p>
                    <p style="font-size:0.85rem;margin-top:0.5rem">Students can submit questions from their dashboard.</p>
                </div>`;
            document.getElementById('ticketCount').textContent = '0 tickets';
            return;
        }
        const tickets = res.tickets;
        document.getElementById('ticketCount').textContent = `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`;
        const statusColor = { open: '#e67e22', answered: '#27ae60', closed: '#95a5a6' };
        const statusIcon  = { open: '🔓', answered: '✅', closed: '🔒' };
        container.innerHTML = tickets.map(t => `
            <div style="background:var(--bg-secondary);border-radius:12px;padding:1.2rem;margin-bottom:1rem;
                border:1px solid var(--border-color);border-left:4px solid ${statusColor[t.status] || '#667eea'}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px">
                    <div>
                        <strong style="color:var(--text-primary)">${t.subject || 'Student Question'}</strong>
                        <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:3px">
                            👤 ${t.student?.fullName || 'Unknown'} · ${t.student?.email || ''} ·
                            ${new Date(t.createdAt || Date.now()).toLocaleDateString()}
                        </div>
                    </div>
                    <span style="color:${statusColor[t.status]||'#667eea'};font-weight:700;font-size:0.82rem">
                        ${statusIcon[t.status]||'🔓'} ${(t.status||'open').toUpperCase()}
                    </span>
                </div>
                <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:12px">${t.message || t.body || ''}</p>
                ${t.reply ? `
                    <div style="background:rgba(102,126,234,0.08);border-radius:8px;padding:10px 14px;margin-bottom:12px;
                        border-left:3px solid #667eea;font-size:0.85rem;color:var(--text-primary)">
                        <strong>📩 Your reply:</strong> ${t.reply}
                    </div>` : ''}
                ${t.status !== 'closed' ? `
                    <div style="display:flex;gap:8px;align-items:center">
                        <input type="text" id="reply-${t._id}" placeholder="Type your reply..."
                            style="flex:1;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;
                                background:var(--bg-primary);color:var(--text-primary);font-size:0.85rem">
                        <button class="btn btn-success btn-sm" onclick="replyTicket('${t._id}')">Send Reply</button>
                        <button class="btn btn-sm" onclick="closeTicket('${t._id}')">Close</button>
                    </div>` : ''}
            </div>
        `).join('');
    } catch {
        container.innerHTML = '<p style="color:var(--text-secondary);padding:1rem">Support ticket system ready — no tickets yet.</p>';
        document.getElementById('ticketCount').textContent = '';
    }
}

async function replyTicket(ticketId) {
    const input = document.getElementById(`reply-${ticketId}`);
    const reply = input?.value.trim();
    if (!reply) { toast?.error('Please enter a reply'); return; }
    try {
        const res = await api.request(`/admin/tickets/${ticketId}/reply`, {
            method: 'PUT', body: JSON.stringify({ reply })
        });
        if (res.success) { toast?.success('Reply sent!'); await loadTickets(); }
    } catch { toast?.error('Failed to send reply'); }
}

async function closeTicket(ticketId) {
    if (!confirm('Close this ticket?')) return;
    try {
        await api.request(`/admin/tickets/${ticketId}/reply`, {
            method: 'PUT', body: JSON.stringify({ reply: '', status: 'closed' })
        });
        toast?.success('Ticket closed'); await loadTickets();
    } catch { toast?.error('Failed'); }
}

// ── Manual Payment Receipts ───────────────────────────────────────────────────
async function loadManualPaymentBadge() {
    try {
        const res = await api.request('/payments/manual-pending?status=pending_verification');
        if (res.success) {
            const badge = document.getElementById('manualPayBadge');
            if (badge) badge.textContent = res.count > 0 ? res.count : '';
        }
    } catch { /* silent */ }
}

async function loadManualPayments() {
    const container = document.getElementById('manualPaymentsList');
    const filter    = document.getElementById('manualPayFilter')?.value || 'all';
    container.innerHTML = '<p style="color:var(--text-secondary)">Loading...</p>';

    try {
        const res = await api.request(`/payments/manual-pending?status=${filter}`);
        if (!res.success) throw new Error(res.message);

        const payments = res.payments || [];

        // Update badge (pending count)
        const pendingCount = payments.filter(p => p.status === 'pending_verification').length;
        const badge = document.getElementById('manualPayBadge');
        if (badge) badge.textContent = pendingCount > 0 ? pendingCount : '';

        if (payments.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:3rem;color:var(--text-secondary)">
                    <div style="font-size:3rem;margin-bottom:1rem">📭</div>
                    <p>No manual payment receipts found for this filter.</p>
                </div>`;
            return;
        }

        const statusColor = {
            pending_verification: '#f39c12',
            approved:  '#27ae60',
            rejected:  '#e74c3c'
        };
        const statusLabel = {
            pending_verification: '⏳ Pending Review',
            approved:  '✅ Approved',
            rejected:  '❌ Rejected'
        };

        container.innerHTML = payments.map(p => {
            const studentName  = p.student?.fullName || 'Unknown';
            const studentEmail = p.student?.email    || '';
            const courseName   = p.course
                ? `${p.course.icon || '📚'} ${p.course.title}`
                : `${p.plan || '—'} Subscription`;
            const date = new Date(p.submittedAt).toLocaleString();
            const isImage = p.receiptImage && !p.receiptImage.includes('application/pdf') &&
                            (p.receiptImage.startsWith('data:image') || p.receiptFileName?.match(/\.(jpg|jpeg|png|gif)$/i));

            return `
            <div style="background:var(--bg-secondary);border-radius:14px;padding:1.2rem 1.4rem;
                margin-bottom:1rem;border:1px solid var(--border-color);
                border-left:4px solid ${statusColor[p.status] || '#888'}">

                <div style="display:flex;justify-content:space-between;align-items:flex-start;
                    flex-wrap:wrap;gap:10px;margin-bottom:10px">
                    <div>
                        <strong style="color:var(--text-primary);font-size:1rem">${studentName}</strong>
                        <span style="font-size:0.8rem;color:var(--text-secondary);margin-left:8px">${studentEmail}</span>
                        <div style="margin-top:4px;font-size:0.88rem;color:var(--text-secondary)">
                            📚 ${courseName} &nbsp;·&nbsp;
                            💵 <strong style="color:#27ae60">${(p.amount || 0).toLocaleString()} ETB</strong> &nbsp;·&nbsp;
                            🕒 ${date}
                        </div>
                    </div>
                    <span style="color:${statusColor[p.status]};font-weight:700;font-size:0.85rem;white-space:nowrap">
                        ${statusLabel[p.status] || p.status}
                    </span>
                </div>

                <!-- Receipt thumbnail -->
                ${isImage ? `
                <div style="margin-bottom:12px">
                    <img src="${p.receiptImage}" alt="Receipt"
                        onclick="openReceiptLightbox('${p.receiptImage.replace(/'/g, "\\'")}')"
                        style="max-height:100px;max-width:160px;border-radius:6px;cursor:zoom-in;
                            border:1px solid var(--border-color);object-fit:cover">
                    <p style="font-size:0.75rem;color:var(--text-secondary);margin:3px 0">
                        Click to view full size
                    </p>
                </div>` : p.receiptImage ? `
                <div style="margin-bottom:12px">
                    <a href="${p.receiptImage}" target="_blank"
                        style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;
                        border:1px solid var(--border-color);border-radius:8px;text-decoration:none;
                        color:var(--text-primary);font-size:0.85rem">
                        📄 View PDF Receipt
                    </a>
                </div>` : '<p style="font-size:0.82rem;color:#aaa;margin-bottom:10px">No receipt image</p>'}

                ${p.adminNote ? `
                <div style="background:rgba(231,76,60,0.06);border-radius:6px;padding:8px 12px;
                    margin-bottom:10px;font-size:0.82rem;color:var(--text-secondary)">
                    <strong>Admin note:</strong> ${p.adminNote}
                </div>` : ''}

                ${p.status === 'pending_verification' ? `
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                    <input type="text" id="note-${p._id}" placeholder="Admin note (optional)"
                        style="flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--border-color);
                        border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-size:0.85rem">
                    <button class="btn btn-success btn-sm"
                        onclick="approveManualPayment('${p._id}')">✅ Approve</button>
                    <button class="btn btn-danger btn-sm"
                        onclick="rejectManualPayment('${p._id}')">❌ Reject</button>
                </div>` : `
                <div style="font-size:0.82rem;color:var(--text-secondary)">
                    Reviewed ${p.reviewedAt ? 'on ' + new Date(p.reviewedAt).toLocaleDateString() : ''}
                    ${p.reviewedBy?.fullName ? 'by ' + p.reviewedBy.fullName : ''}
                </div>`}
            </div>`;
        }).join('');
    } catch (err) {
        console.error('[loadManualPayments]', err);
        container.innerHTML = '<p style="color:red">Failed to load manual payments</p>';
    }
}

async function approveManualPayment(id) {
    const noteEl = document.getElementById(`note-${id}`);
    const adminNote = noteEl?.value.trim() || '';
    if (!confirm('Approve this payment and unlock the course for the student?')) return;

    try {
        const res = await api.request(`/payments/manual-receipt/${id}/approve`, {
            method: 'PUT',
            body: JSON.stringify({ adminNote })
        });
        if (res.success) {
            toast?.success('Payment approved! Course unlocked for student.');
            await loadManualPayments();
        }
    } catch (e) {
        toast?.error(e.message || 'Failed to approve payment');
    }
}

async function rejectManualPayment(id) {
    const noteEl = document.getElementById(`note-${id}`);
    const reason = noteEl?.value.trim() || prompt('Reason for rejection:') || '';
    if (!confirm('Reject this payment receipt?')) return;

    try {
        const res = await api.request(`/payments/manual-receipt/${id}/reject`, {
            method: 'PUT',
            body: JSON.stringify({ reason })
        });
        if (res.success) {
            toast?.warning('Payment receipt rejected.');
            await loadManualPayments();
        }
    } catch (e) {
        toast?.error(e.message || 'Failed to reject payment');
    }
}

// ── Course sub-tab switching ──────────────────────────────────────────────────
function showCourseSubTab(tab) {
    document.getElementById('courseSubTab-pending').style.display = tab === 'pending' ? '' : 'none';
    document.getElementById('courseSubTab-all').style.display    = tab === 'all'     ? '' : 'none';
    if (tab === 'all') loadAllCourses();
}

async function loadAllCourses() {
    const container = document.getElementById('allCoursesList');
    container.innerHTML = '<p style="color:var(--text-secondary)">Loading...</p>';
    try {
        const token = api.getAuthToken?.() || localStorage.getItem('authToken');
        const res   = await api.request('/admin/all-courses');
        if (!res.success) throw new Error(res.message);

        if (!res.courses || res.courses.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary)">No courses found</p>';
            return;
        }

        container.innerHTML = `
            <table class="users-table">
                <thead>
                    <tr><th>Course</th><th>Category</th><th>Price</th><th>Status</th><th>Lock</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${res.courses.map(c => `
                        <tr>
                            <td>
                                <strong>${c.icon || '📚'} ${c.title}</strong><br>
                                <small style="color:var(--text-secondary)">${c.instructorName || ''}</small>
                            </td>
                            <td>${c.category}</td>
                            <td>${c.price === 0 ? '🆓 Free' : `${c.price} ETB`}</td>
                            <td>
                                <span style="color:${c.status==='approved'?'#27ae60':c.status==='rejected'?'#e74c3c':'#f39c12'};font-weight:600">
                                    ${c.status}
                                </span>
                            </td>
                            <td>
                                <span style="color:${c.isLocked?'#e74c3c':'#27ae60'};font-weight:600">
                                    ${c.isLocked ? '🔒 Locked' : '🔓 Open'}
                                </span>
                            </td>
                            <td style="display:flex;gap:6px;flex-wrap:wrap">
                                <button class="btn btn-sm" onclick="showEditCourseModal('${c._id}')">✏️ Edit</button>
                                <button class="btn btn-sm" onclick="toggleCourseLock('${c._id}',this)"
                                    style="background:${c.isLocked?'rgba(39,174,96,0.1)':'rgba(231,76,60,0.1)'}">
                                    ${c.isLocked ? '🔓 Unlock' : '🔒 Lock'}
                                </button>
                                <button class="btn btn-sm btn-success" onclick="viewEnrolledStudents('${c._id}')">👥 Students</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `<p style="color:red">Failed to load courses: ${err.message}</p>`;
    }
}

async function toggleCourseLock(courseId, btn) {
    try {
        const res = await api.request(`/admin/courses/${courseId}/toggle-lock`, { method: 'PUT' });
        if (res.success) {
            toast?.success(res.message);
            await loadAllCourses();
        }
    } catch (e) { toast?.error('Failed to toggle lock'); }
}

async function viewEnrolledStudents(courseId) {
    const modal = document.getElementById('enrolledStudentsModal');
    const list  = document.getElementById('enrolledStudentsList');
    if (!modal || !list) return;
    modal.style.display = 'flex';
    list.innerHTML = '<p style="color:var(--text-secondary)">Loading...</p>';
    try {
        const res = await api.request(`/admin/courses/${courseId}/students`);
        if (!res.success || !res.enrollments || res.enrollments.length === 0) {
            list.innerHTML = '<p style="color:var(--text-secondary)">No students enrolled yet</p>';
            return;
        }
        list.innerHTML = `
            <table class="users-table">
                <thead><tr><th>Student</th><th>Email</th><th>Status</th><th>Requested</th></tr></thead>
                <tbody>
                    ${res.enrollments.map(e => `
                        <tr>
                            <td>${e.student?.fullName || '—'}</td>
                            <td style="font-size:0.82rem">${e.student?.email || '—'}</td>
                            <td style="color:${e.status==='approved'?'#27ae60':e.status==='rejected'?'#e74c3c':'#f39c12'};font-weight:600">${e.status}</td>
                            <td style="font-size:0.82rem;color:var(--text-secondary)">${new Date(e.requestedAt).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    } catch { list.innerHTML = '<p style="color:red">Failed to load students</p>'; }
}

// ── Edit Course Modal ─────────────────────────────────────────────────────────
let editCourseChapters = [];

function addEditChapter() {
    syncEditChapterData();
    editCourseChapters.push({ title: '', lessons: [] });
    renderEditChapterBuilder();
}

function removeEditChapter(idx) {
    syncEditChapterData();
    editCourseChapters.splice(idx, 1);
    renderEditChapterBuilder();
}

function addEditLesson(chapterIdx) {
    syncEditChapterData();
    editCourseChapters[chapterIdx].lessons.push({ title: '', duration: '', videoUrl: '', notes: '' });
    renderEditChapterBuilder();
}

function removeEditLesson(chapterIdx, lessonIdx) {
    syncEditChapterData();
    editCourseChapters[chapterIdx].lessons.splice(lessonIdx, 1);
    renderEditChapterBuilder();
}

function syncEditChapterData() {
    editCourseChapters.forEach((ch, ci) => {
        const titleEl = document.getElementById(`ech-title-${ci}`);
        if (titleEl) ch.title = titleEl.value;
        ch.lessons.forEach((l, li) => {
            const lt = document.getElementById(`el-title-${ci}-${li}`);
            const ld = document.getElementById(`el-dur-${ci}-${li}`);
            const lv = document.getElementById(`el-vid-${ci}-${li}`);
            const ln = document.getElementById(`el-notes-${ci}-${li}`);
            if (lt) l.title    = lt.value;
            if (ld) l.duration = ld.value;
            if (lv) l.videoUrl = lv.value;
            if (ln) l.notes    = ln.value;
        });
    });
}

function renderEditChapterBuilder() {
    const container = document.getElementById('editChaptersBuilder');
    if (!container) return;
    container.innerHTML = editCourseChapters.map((ch, ci) => `
        <div style="border:1px solid var(--border-color);border-radius:12px;overflow:hidden">
            <div style="background:rgba(102,126,234,0.08);padding:10px 14px;display:flex;align-items:center;gap:8px">
                <strong style="color:var(--text-primary);font-size:0.88rem">Chapter ${ci + 1}</strong>
                <input type="text" id="ech-title-${ci}" value="${ch.title.replace(/"/g,'&quot;')}"
                    placeholder="Chapter title..." oninput="editCourseChapters[${ci}].title=this.value"
                    style="flex:1;padding:6px 10px;border:1px solid var(--border-color);border-radius:8px;
                        background:var(--bg-primary);color:var(--text-primary);font-size:0.85rem">
                <button type="button" onclick="syncEditChapterData();addEditLesson(${ci})"
                    class="btn btn-success btn-sm" style="white-space:nowrap;font-size:0.78rem">+ Lesson</button>
                <button type="button" onclick="syncEditChapterData();removeEditChapter(${ci})"
                    class="btn btn-danger btn-sm" style="font-size:0.78rem">✕</button>
            </div>
            <div style="padding:8px 14px 14px;display:flex;flex-direction:column;gap:8px">
                ${ch.lessons.length === 0 ? '<p style="color:var(--text-secondary);font-size:0.82rem;margin:4px 0">No lessons yet</p>' : ''}
                ${ch.lessons.map((l, li) => `
                    <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;padding:10px 12px">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                            <span style="font-size:0.78rem;color:var(--text-secondary);white-space:nowrap">Lesson ${li+1}</span>
                            <input type="text" id="el-title-${ci}-${li}" value="${(l.title||'').replace(/"/g,'&quot;')}"
                                placeholder="Lesson title..." oninput="editCourseChapters[${ci}].lessons[${li}].title=this.value"
                                style="flex:1;padding:5px 8px;border:1px solid var(--border-color);border-radius:6px;
                                    background:var(--bg-secondary);color:var(--text-primary);font-size:0.82rem">
                            <button type="button" onclick="syncEditChapterData();removeEditLesson(${ci},${li})"
                                class="btn btn-danger btn-sm" style="font-size:0.72rem;padding:3px 8px">✕</button>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 2fr;gap:6px;margin-bottom:6px">
                            <input type="text" id="el-dur-${ci}-${li}" value="${(l.duration||'').replace(/"/g,'&quot;')}"
                                placeholder="Duration" oninput="editCourseChapters[${ci}].lessons[${li}].duration=this.value"
                                style="padding:5px 8px;border:1px solid var(--border-color);border-radius:6px;
                                    background:var(--bg-secondary);color:var(--text-primary);font-size:0.8rem">
                            <input type="text" id="el-vid-${ci}-${li}" value="${(l.videoUrl||'').replace(/"/g,'&quot;')}"
                                placeholder="YouTube URL" oninput="editCourseChapters[${ci}].lessons[${li}].videoUrl=this.value"
                                style="padding:5px 8px;border:1px solid var(--border-color);border-radius:6px;
                                    background:var(--bg-secondary);color:var(--text-primary);font-size:0.8rem">
                        </div>
                        <textarea id="el-notes-${ci}-${li}" rows="2"
                            placeholder="Study notes..."
                            oninput="editCourseChapters[${ci}].lessons[${li}].notes=this.value"
                            style="width:100%;padding:5px 8px;border:1px solid var(--border-color);border-radius:6px;
                                background:var(--bg-secondary);color:var(--text-primary);font-size:0.8rem;resize:vertical"
                        >${l.notes || ''}</textarea>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

async function showEditCourseModal(courseId) {
    const modal = document.getElementById('editCourseModal');
    if (!modal) return;
    modal.style.display = 'flex';
    try {
        const res = await api.getCourse(courseId);
        if (!res.success) throw new Error('Failed to load course');
        const c = res.course;

        document.getElementById('editCourseId').value    = c._id;
        document.getElementById('editTitle').value       = c.title || '';
        document.getElementById('editDescription').value = c.description || '';
        document.getElementById('editCategory').value    = c.category || 'semester1';
        document.getElementById('editLevel').value       = c.level || 'Freshman';
        document.getElementById('editDuration').value    = c.duration || '';
        document.getElementById('editPrice').value       = c.price || 0;
        document.getElementById('editIcon').value        = c.icon || '📚';
        document.getElementById('editIsPremium').value   = c.isPremium ? 'true' : 'false';
        document.getElementById('editIsLocked').value    = (c.isLocked !== false) ? 'true' : 'false';
        document.getElementById('editFreePreview').value = c.isFreePreview ? 'true' : 'false';

        editCourseChapters = (c.chapters || []).map(ch => ({
            title:   ch.title || '',
            lessons: (ch.lessons || []).map(l => ({
                title:    l.title    || '',
                duration: l.duration || '',
                videoUrl: l.videoUrl || '',
                notes:    l.notes    || ''
            }))
        }));
        renderEditChapterBuilder();
    } catch (err) {
        toast?.error('Failed to load course for editing');
        modal.style.display = 'none';
    }
}

function closeEditCourseModal() {
    const modal = document.getElementById('editCourseModal');
    if (modal) modal.style.display = 'none';
    editCourseChapters = [];
}

document.getElementById('editCourseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    syncEditChapterData();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Saving...';

    const courseId = document.getElementById('editCourseId').value;
    try {
        const data = {
            title:         document.getElementById('editTitle').value,
            description:   document.getElementById('editDescription').value,
            category:      document.getElementById('editCategory').value,
            level:         document.getElementById('editLevel').value,
            duration:      document.getElementById('editDuration').value,
            price:         parseFloat(document.getElementById('editPrice').value),
            icon:          document.getElementById('editIcon').value || '📚',
            isPremium:     document.getElementById('editIsPremium').value === 'true',
            isLocked:      document.getElementById('editIsLocked').value === 'true',
            isFreePreview: document.getElementById('editFreePreview').value === 'true',
            chapters: editCourseChapters.map((ch, ci) => ({
                title: ch.title,
                order: ci,
                lessons: ch.lessons.map((l, li) => ({
                    title:    l.title,
                    duration: l.duration,
                    videoUrl: l.videoUrl,
                    notes:    l.notes,
                    order:    li
                }))
            }))
        };

        const res = await api.request(`/courses/${courseId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (res.success) {
            toast?.success('Course updated!');
            closeEditCourseModal();
            await loadAllCourses();
        }
    } catch (err) {
        toast?.error(err.message || 'Failed to update course');
    } finally {
        btn.disabled = false; btn.textContent = 'Save Changes';
    }
});

function openReceiptLightbox(src) {
    const lb  = document.getElementById('receiptLightbox');
    const img = document.getElementById('receiptLightboxImg');
    if (!lb || !img) return;
    img.src = src;
    lb.style.display = 'flex';
}

function closeReceiptLightbox() {
    const lb = document.getElementById('receiptLightbox');
    if (lb) { lb.style.display = 'none'; }
}
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api.logout(); } catch {}
    api.removeAuthToken();
    localStorage.removeItem('currentUser');
    window.location.href = 'home.html';
});

// ── Server-side auth guard — runs on page load ────────────────────────────────
(async () => {
    // Allow all admin roles to access this page
    const user = await requireAuth?.() || JSON.parse(localStorage.getItem('currentUser'));
    if (!user) { window.location.href = 'auth-login.html'; return; }

    const adminRoles = ['super_admin','admin','content_admin','finance_admin','support_admin'];
    if (!adminRoles.includes(user.role)) {
        alert('Access denied. Admin account required.');
        window.location.href = 'home.html';
        return;
    }

    currentUser = user;
    applyRoleBasedUI();
    loadAdminData();

    // Auto-open tab from URL param (e.g. ?tab=manual-payments from email link)
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab) {
        const tabEl = document.getElementById(`tab-${urlTab}`);
        if (tabEl) {
            setTimeout(() => {
                showTab(urlTab);
                if (urlTab === 'manual-payments') loadManualPayments();
            }, 800);
        }
    }
})();
