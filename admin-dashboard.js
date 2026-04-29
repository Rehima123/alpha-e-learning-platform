// ── Auth guard — verified server-side at bottom of file ──────────────────────
let currentUser = JSON.parse(localStorage.getItem('currentUser'));

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
            loadUsers()
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

        const statusColor = { pending: '#f39c12', approved: '#27ae60', rejected: '#e74c3c' };
        const statusIcon  = { pending: '⏳', approved: '✅', rejected: '❌' };

        container.innerHTML = `
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
                    ${response.enrollments.map(e => `
                        <tr>
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

document.getElementById('createCourseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
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
            isFreePreview: document.getElementById('newFreePreview').value === 'true'
        };

        const res = await api.createCourse(data);
        if (res.success) {
            // Auto-approve since admin is creating
            await api.approveCourse(res.course._id);
            toast?.success('Course created and published!');
            closeCreateCourseModal();
            e.target.reset();
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
    try {
        const response = await api.getAllUsers();
        if (!response.success || response.users.length === 0) {
            container.innerHTML = '<p>No users found</p>'; return;
        }
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
                            <td><span class="role-badge role-${u.role}">${u.role}</span></td>
                            <td>${u.subscription?.plan || 'free'}</td>
                            <td>${u.isActive ? '<span style="color:#27ae60">✓ Active</span>' : '<span style="color:#e74c3c">✗ Inactive</span>'}</td>
                            <td style="font-size:0.82rem;color:var(--text-secondary)">${new Date(u.createdAt).toLocaleDateString()}</td>
                            <td>
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

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api.logout(); } catch {}
    api.removeAuthToken();
    localStorage.removeItem('currentUser');
    window.location.href = 'home.html';
});

// ── Server-side auth guard — runs on page load ────────────────────────────────
(async () => {
    const user = await requireAdmin();
    if (!user) return;
    currentUser = user;
    loadAdminData();
})();
