const urlParams   = new URLSearchParams(window.location.search);
const courseId    = urlParams.get('id');
let currentCourse = null;
let userEnrollment = null;
let activeLesson  = null; // { chapterIdx, lessonIdx }

// ── Load course ───────────────────────────────────────────────────────────────
async function loadCourseDetail() {
    if (!courseId) {
        document.getElementById('courseDetail').innerHTML =
            '<p style="text-align:center;color:red;padding:2rem">No course ID provided.</p>';
        return;
    }

    try {
        const courseResponse = await api.getCourse(courseId);
        if (!courseResponse.success) throw new Error(courseResponse.message || 'Course not found');

        currentCourse = courseResponse.course;

        // Cache for offline
        if (typeof offlineDB !== 'undefined') offlineDB.put('courses', currentCourse).catch(() => {});

        // Load enrollment if logged in
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && api.getAuthToken()) {
            try {
                const er = await api.getMyEnrollments();
                if (er.success) {
                    userEnrollment = er.enrollments.find(e => (e.course?._id || e.course) === courseId);
                }
            } catch {}
        }

        // Breadcrumb
        document.getElementById('bc-dept').textContent   = currentCourse.department || currentCourse.category;
        document.getElementById('bc-course').textContent = currentCourse.title;
        document.title = `${currentCourse.title} — Alpha Freshman Tutorial`;

        renderCourseHeader();
        renderChapterSidebar();

        // Auto-open first lesson if enrolled
        if (userEnrollment?.status === 'approved' && currentCourse.chapters?.length > 0) {
            const firstLesson = currentCourse.chapters[0]?.lessons?.[0];
            if (firstLesson) openLesson(0, 0);
        }

    } catch (error) {
        console.error('Error loading course:', error);

        // Offline fallback
        if (typeof offlineDB !== 'undefined') {
            try {
                const cached = await offlineDB.get('courses', courseId);
                if (cached) {
                    currentCourse = cached;
                    renderCourseHeader();
                    renderChapterSidebar();
                    toast?.warning('📡 Offline — showing cached course');
                    return;
                }
            } catch {}
        }

        document.getElementById('courseDetail').innerHTML = `
            <div style="text-align:center;padding:3rem">
                <p style="color:red;margin-bottom:1rem">⚠️ ${error.message}</p>
                <a href="courses.html" class="btn">← Back to Courses</a>
                <button class="btn btn-success" onclick="loadCourseDetail()" style="margin-left:10px">🔄 Retry</button>
            </div>`;
    }
}

// ── Course header ─────────────────────────────────────────────────────────────
function renderCourseHeader() {
    const c = currentCourse;
    const isEnrolled = userEnrollment?.status === 'approved';
    const isPending  = userEnrollment?.status === 'pending';
    const isRejected = userEnrollment?.status === 'rejected';
    const isFree     = !c.isPremium || c.price === 0;
    const hasActiveSub = JSON.parse(localStorage.getItem('currentUser'))?.subscription?.plan === 'monthly'
                      || JSON.parse(localStorage.getItem('currentUser'))?.subscription?.plan === 'annual';
    const canAccess  = isFree || isEnrolled || hasActiveSub;
    const progress   = userEnrollment?.progress || 0;
    const totalLessons = c.chapters?.reduce((s, ch) => s + (ch.lessons?.length || 0), 0)
                      || c.totalLessons || c.lessons?.length || 0;
    const totalChapters = c.chapters?.length || 0;

    document.getElementById('courseDetail').innerHTML = `
        <div style="background:var(--bg-secondary);border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;
            box-shadow:0 2px 12px var(--shadow)">
            <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
                <div style="font-size:3.5rem;line-height:1">${c.icon || '📚'}</div>
                <div style="flex:1;min-width:200px">
                    <!-- Department path -->
                    <div style="font-size:0.78rem;color:#667eea;font-weight:600;margin-bottom:6px">
                        ${c.department || c.category} › ${c.title}
                    </div>
                    <h1 style="font-size:1.4rem;font-weight:800;color:var(--text-primary);margin:0 0 8px">${c.title}</h1>
                    <p style="color:var(--text-secondary);font-size:0.88rem;margin:0 0 12px">${c.description}</p>

                    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px">
                        <span>👤 ${c.instructorName || 'Unknown'}</span>
                        <span>📚 ${totalChapters} chapters · ${totalLessons} lessons</span>
                        <span>⭐ ${(c.rating||0).toFixed(1)}</span>
                        <span>👥 ${(c.enrolledStudents||0).toLocaleString()} students</span>
                        <span>⏱️ ${c.duration}</span>
                    </div>

                    ${isEnrolled ? `
                        <div style="margin-bottom:12px">
                            <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">
                                <span>Your progress</span><span>${Math.round(progress)}%</span>
                            </div>
                            <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
                        </div>` : ''}

                    <div style="display:flex;gap:10px;flex-wrap:wrap">
                        ${!JSON.parse(localStorage.getItem('currentUser')) ? `
                            <a href="auth-login.html" class="btn btn-large">🔐 Login to Enroll</a>
                        ` : isEnrolled ? `
                            <button class="btn btn-large btn-success" onclick="scrollToChapters()">▶ Continue Learning</button>
                        ` : isPending ? `
                            <div style="background:rgba(243,156,18,0.1);border:1px solid #f39c12;border-radius:10px;padding:12px 16px;font-size:0.88rem">
                                ⏳ Enrollment pending admin approval
                            </div>
                        ` : isRejected ? `
                            <div style="background:rgba(231,76,60,0.1);border:1px solid #e74c3c;border-radius:10px;padding:12px 16px;font-size:0.88rem">
                                ❌ Enrollment rejected. <a href="subscription.html" style="color:#3498db">Get Premium</a>
                            </div>
                        ` : `
                            <button class="btn btn-large" id="enrollBtn">
                                ${isFree ? '🎓 Enroll Free' : '📋 Request Enrollment'}
                            </button>
                            ${!isFree ? `<a href="subscription.html" class="btn btn-large btn-success">⭐ Get Premium</a>` : ''}
                        `}
                        <a href="ai-study.html?courseId=${courseId}" class="btn" style="font-size:0.85rem">🤖 AI Study Tools</a>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('enrollBtn')?.addEventListener('click', enrollCourse);
}

// ── Chapter sidebar ───────────────────────────────────────────────────────────
function renderChapterSidebar() {
    const c = currentCourse;
    const chapters = c.chapters || [];
    const isEnrolled = userEnrollment?.status === 'approved';
    const isFree     = !c.isPremium || c.price === 0;
    const canAccess  = isFree || isEnrolled;

    if (chapters.length === 0) {
        // Fallback: render flat lessons
        renderFlatLessons();
        return;
    }

    document.getElementById('courseLayout').style.display = '';

    const completedLessons = userEnrollment?.completedLessons || [];
    let totalLessons = 0;
    chapters.forEach(ch => totalLessons += ch.lessons?.length || 0);

    const sidebar = document.getElementById('chapterSidebar');
    sidebar.innerHTML = `
        <div style="background:var(--bg-secondary);border-radius:16px;overflow:hidden;
            border:1px solid var(--border-color);box-shadow:0 2px 12px var(--shadow)">
            <div style="padding:16px 20px;border-bottom:1px solid var(--border-color);
                background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.08))">
                <h3 style="margin:0;font-size:0.95rem;font-weight:700;color:var(--text-primary)">
                    📖 Course Content
                </h3>
                <p style="margin:4px 0 0;font-size:0.78rem;color:var(--text-secondary)">
                    ${chapters.length} chapters · ${totalLessons} lessons
                </p>
            </div>
            ${chapters.map((ch, ci) => {
                const chDone = (ch.lessons || []).filter(l =>
                    completedLessons.includes(l._id || l.title)
                ).length;
                const chTotal = ch.lessons?.length || 0;
                const isOpen  = ci === 0;

                return `
                <div class="chapter-block" id="chapter-${ci}">
                    <div class="chapter-header ${isOpen ? 'open' : ''}" onclick="toggleChapter(${ci})">
                        <div class="chapter-title-row">
                            <div class="chapter-num">${ci + 1}</div>
                            <div class="chapter-info">
                                <h4>${ch.title}</h4>
                                <p>${chDone}/${chTotal} lessons done</p>
                            </div>
                        </div>
                        <div class="chapter-meta">
                            ${chDone === chTotal && chTotal > 0
                                ? '<span style="color:#27ae60;font-size:0.8rem;font-weight:600">✓</span>'
                                : `<span style="font-size:0.75rem;color:var(--text-secondary)">${chTotal} lessons</span>`
                            }
                            <span class="chapter-arrow ${isOpen ? 'open'  : ''}" id="arrow-${ci}">▼</span>
                        </div>
                    </div>
                    <div class="chapter-lessons ${isOpen ? 'open' : ''}" id="lessons-${ci}">
                        ${(ch.lessons || []).map((lesson, li) => {
                            const lessonId  = lesson._id || lesson.title;
                            const isDone    = completedLessons.includes(lessonId);
                            const isActive  = activeLesson?.chapterIdx === ci && activeLesson?.lessonIdx === li;
                            const unlocked  = canAccess || (c.isFreePreview && ci === 0 && li < 2);

                            return `
                            <div class="lesson-row ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}"
                                id="lrow-${ci}-${li}"
                                onclick="${unlocked ? `openLesson(${ci},${li})` : 'showLockedMsg()'}">
                                <div class="lesson-num ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}">
                                    ${isDone ? '✓' : `${li + 1}`}
                                </div>
                                <div class="lesson-info-col">
                                    <h5>${lesson.title}</h5>
                                    <span>${lesson.duration || ''} ${c.isFreePreview && ci === 0 && li < 2 ? '· Free Preview' : ''}</span>
                                </div>
                                ${unlocked
                                    ? `<span style="color:#667eea;font-size:0.8rem">${isDone ? '↩' : '▶'}</span>`
                                    : `<span class="lesson-lock">🔒</span>`
                                }
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;

    // Show empty viewer prompt
    if (!activeLesson) {
        document.getElementById('lessonViewer').innerHTML = `
            <div style="background:var(--bg-secondary);border-radius:16px;padding:3rem;text-align:center;
                border:1px solid var(--border-color);box-shadow:0 2px 12px var(--shadow)">
                <div style="font-size:3rem;margin-bottom:1rem">👈</div>
                <h3 style="color:var(--text-primary);margin-bottom:0.5rem">Select a lesson to start</h3>
                <p style="color:var(--text-secondary);font-size:0.9rem">
                    Choose any lesson from the chapter list on the left
                </p>
            </div>`;
    }
}

// ── Toggle chapter open/close ─────────────────────────────────────────────────
function toggleChapter(ci) {
    const lessons = document.getElementById(`lessons-${ci}`);
    const arrow   = document.getElementById(`arrow-${ci}`);
    const header  = document.querySelector(`#chapter-${ci} .chapter-header`);
    const isOpen  = lessons.classList.contains('open');

    lessons.classList.toggle('open', !isOpen);
    arrow.classList.toggle('open', !isOpen);
    header.classList.toggle('open', !isOpen);
}

// ── Open a lesson ─────────────────────────────────────────────────────────────
function openLesson(chapterIdx, lessonIdx) {
    // Remove previous active
    if (activeLesson) {
        const prev = document.getElementById(`lrow-${activeLesson.chapterIdx}-${activeLesson.lessonIdx}`);
        prev?.classList.remove('active');
        const prevNum = prev?.querySelector('.lesson-num');
        prevNum?.classList.remove('active');
    }

    activeLesson = { chapterIdx, lessonIdx };

    // Mark active in sidebar
    const row = document.getElementById(`lrow-${chapterIdx}-${lessonIdx}`);
    row?.classList.add('active');
    row?.querySelector('.lesson-num')?.classList.add('active');

    // Open the chapter if closed
    const lessons = document.getElementById(`lessons-${chapterIdx}`);
    if (!lessons?.classList.contains('open')) toggleChapter(chapterIdx);

    const chapter = currentCourse.chapters[chapterIdx];
    const lesson  = chapter.lessons[lessonIdx];
    const completedLessons = userEnrollment?.completedLessons || [];
    const lessonId = lesson._id || lesson.title;
    const isDone   = completedLessons.includes(lessonId);
    const totalInChapter = chapter.lessons.length;
    const hasNext  = lessonIdx + 1 < totalInChapter || chapterIdx + 1 < currentCourse.chapters.length;
    const hasPrev  = lessonIdx > 0 || chapterIdx > 0;

    document.getElementById('lessonViewer').innerHTML = `
        <div class="lesson-viewer">
            <!-- Header -->
            <div class="lesson-viewer-header">
                <div>
                    <div style="font-size:0.78rem;color:#667eea;font-weight:600;margin-bottom:4px">
                        ${chapter.title} › Lesson ${lessonIdx + 1}
                    </div>
                    <h2>${lesson.title}</h2>
                </div>
                ${isDone ? `<span style="background:#e8f5e9;color:#27ae60;padding:5px 14px;border-radius:20px;font-size:0.8rem;font-weight:700">✓ Completed</span>` : ''}
            </div>

            <!-- Meta -->
            <div class="lesson-viewer-meta">
                <span>⏱️ ${lesson.duration || 'N/A'}</span>
                <span>📖 Lesson ${lessonIdx + 1} of ${totalInChapter}</span>
                ${lesson.videoUrl ? '<span>🎬 Video available</span>' : '<span>📄 Reading lesson</span>'}
            </div>

            <!-- Video (if available) -->
            ${lesson.videoUrl ? `
                <div style="aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;margin-bottom:1.5rem">
                    <iframe src="${lesson.videoUrl}" style="width:100%;height:100%;border:none"
                        allowfullscreen title="${lesson.title}"></iframe>
                </div>
            ` : `
                <div style="aspect-ratio:16/9;background:linear-gradient(135deg,rgba(102,126,234,0.1),rgba(118,75,162,0.1));
                    border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem">
                    <div style="text-align:center">
                        <div style="font-size:3rem;margin-bottom:8px">📖</div>
                        <p style="color:var(--text-secondary);font-size:0.9rem">Reading Lesson</p>
                    </div>
                </div>
            `}

            <!-- Study Notes -->
            <div style="margin-bottom:1.5rem">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                    <h3 style="color:var(--text-primary);margin:0;font-size:1rem">📝 Study Notes</h3>
                    <button onclick="toggleNotes()" class="btn btn-sm" id="notesToggleBtn" style="font-size:0.78rem;padding:5px 12px">
                        Hide Notes
                    </button>
                </div>
                <div class="lesson-notes" id="lessonNotesBox">
                    ${renderNotes(lesson.notes || lesson.description || 'No notes available for this lesson.')}
                </div>
            </div>

            <!-- My Notes (personal) -->
            <div style="margin-bottom:1.5rem">
                <h3 style="color:var(--text-primary);margin:0 0 8px;font-size:1rem">✏️ My Personal Notes</h3>
                <textarea id="personalNotes" rows="4"
                    style="width:100%;padding:12px;border:1px solid var(--border-color);border-radius:10px;
                        background:var(--bg-primary);color:var(--text-primary);font-size:0.88rem;resize:vertical"
                    placeholder="Write your own notes here..."
                    onchange="savePersonalNotes()"
                >${localStorage.getItem(`note-${courseId}-${lessonId}`) || ''}</textarea>
            </div>

            <!-- Actions -->
            <div class="lesson-actions">
                ${hasPrev ? `<button class="btn" onclick="prevLesson()">← Previous</button>` : ''}
                ${!isDone && userEnrollment?.status === 'approved' ? `
                    <button class="btn btn-success" onclick="markComplete('${lessonId}')" id="markBtn">
                        ✓ Mark Complete
                    </button>
                ` : isDone ? `
                    <button class="btn" style="background:#e8f5e9;color:#27ae60;border-color:#27ae60" disabled>
                        ✓ Completed
                    </button>
                ` : ''}
                <button class="btn btn-success" onclick="startQuizForLesson(${chapterIdx})"
                    style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none">
                    🧠 Start Quiz
                </button>
                ${hasNext ? `<button class="btn btn-success" onclick="nextLesson()">Next →</button>` : ''}
            </div>
        </div>
    `;

    // Scroll viewer into view on mobile
    if (window.innerWidth < 900) {
        document.getElementById('lessonViewer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ── Notes toggle ──────────────────────────────────────────────────────────────
function toggleNotes() {
    const box = document.getElementById('lessonNotesBox');
    const btn = document.getElementById('notesToggleBtn');
    const hidden = box.style.display === 'none';
    box.style.display = hidden ? 'block' : 'none';
    btn.textContent   = hidden ? 'Hide Notes' : 'Show Notes';
}

// ── Render markdown-like notes ────────────────────────────────────────────────
function renderNotes(text) {
    if (!text) return '<p style="color:var(--text-secondary)">No notes available.</p>';
    return text
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
}

// ── Personal notes save ───────────────────────────────────────────────────────
function savePersonalNotes() {
    if (!activeLesson) return;
    const chapter = currentCourse.chapters[activeLesson.chapterIdx];
    const lesson  = chapter.lessons[activeLesson.lessonIdx];
    const lessonId = lesson._id || lesson.title;
    const text = document.getElementById('personalNotes')?.value || '';
    localStorage.setItem(`note-${courseId}-${lessonId}`, text);
}

// ── Mark lesson complete ──────────────────────────────────────────────────────
async function markComplete(lessonId) {
    if (!userEnrollment) return;
    const btn = document.getElementById('markBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
        const completed = [...(userEnrollment.completedLessons || [])];
        if (!completed.includes(lessonId)) completed.push(lessonId);

        const totalLessons = currentCourse.chapters?.reduce((s, ch) => s + (ch.lessons?.length || 0), 0) || 1;
        const progress = Math.round((completed.length / totalLessons) * 100);

        const res = await api.updateProgress(userEnrollment._id, { progress, completedLessons: completed });
        if (res.success) {
            userEnrollment.completedLessons = completed;
            userEnrollment.progress = progress;
            toast?.success('Lesson marked complete! ✓');

            // Update sidebar row
            const row = document.getElementById(`lrow-${activeLesson.chapterIdx}-${activeLesson.lessonIdx}`);
            row?.classList.add('done');
            const num = row?.querySelector('.lesson-num');
            if (num) { num.classList.add('done'); num.textContent = '✓'; }

            // Re-render viewer to show completed state
            openLesson(activeLesson.chapterIdx, activeLesson.lessonIdx);
        }
    } catch (err) {
        toast?.error('Failed to save progress');
        if (btn) { btn.disabled = false; btn.textContent = '✓ Mark Complete'; }
    }
}

// ── Navigation ────────────────────────────────────────────────────────────────
function nextLesson() {
    if (!activeLesson) return;
    const { chapterIdx, lessonIdx } = activeLesson;
    const chapter = currentCourse.chapters[chapterIdx];

    if (lessonIdx + 1 < chapter.lessons.length) {
        openLesson(chapterIdx, lessonIdx + 1);
    } else if (chapterIdx + 1 < currentCourse.chapters.length) {
        openLesson(chapterIdx + 1, 0);
    }
}

function prevLesson() {
    if (!activeLesson) return;
    const { chapterIdx, lessonIdx } = activeLesson;

    if (lessonIdx > 0) {
        openLesson(chapterIdx, lessonIdx - 1);
    } else if (chapterIdx > 0) {
        const prevChapter = currentCourse.chapters[chapterIdx - 1];
        openLesson(chapterIdx - 1, prevChapter.lessons.length - 1);
    }
}

function scrollToChapters() {
    document.getElementById('courseLayout')?.scrollIntoView({ behavior: 'smooth' });
}

// ── Start quiz for chapter ────────────────────────────────────────────────────
function startQuizForLesson(chapterIdx) {
    window.location.href = `ai-study.html?courseId=${courseId}&chapter=${chapterIdx}`;
}

// ── Locked message ────────────────────────────────────────────────────────────
function showLockedMsg() {
    toast?.warning('🔒 Enroll in this course to access this lesson');
}

// ── Flat lessons fallback (no chapters) ──────────────────────────────────────
function renderFlatLessons() {
    const c = currentCourse;
    const isEnrolled = userEnrollment?.status === 'approved';
    const isFree     = !c.isPremium || c.price === 0;
    const canAccess  = isFree || isEnrolled;
    const completedLessons = userEnrollment?.completedLessons || [];

    document.getElementById('courseLayout').style.display = '';
    document.getElementById('chapterSidebar').innerHTML = `
        <div style="background:var(--bg-secondary);border-radius:16px;overflow:hidden;
            border:1px solid var(--border-color)">
            <div style="padding:16px 20px;border-bottom:1px solid var(--border-color)">
                <h3 style="margin:0;font-size:0.95rem;font-weight:700;color:var(--text-primary)">📖 Lessons</h3>
            </div>
            ${(c.lessons || []).map((lesson, li) => {
                const lessonId = lesson._id || lesson.title;
                const isDone   = completedLessons.includes(lessonId);
                const unlocked = canAccess || (c.isFreePreview && li < 2);
                return `
                <div class="lesson-row ${isDone ? 'done' : ''}"
                    onclick="${unlocked ? `openFlatLesson(${li})` : 'showLockedMsg()'}">
                    <div class="lesson-num ${isDone ? 'done' : ''}">${isDone ? '✓' : li + 1}</div>
                    <div class="lesson-info-col">
                        <h5>${lesson.title}</h5>
                        <span>${lesson.duration || ''}</span>
                    </div>
                    ${unlocked ? '<span style="color:#667eea;font-size:0.8rem">▶</span>' : '<span class="lesson-lock">🔒</span>'}
                </div>`;
            }).join('')}
        </div>`;
}

// ── Enroll ────────────────────────────────────────────────────────────────────
async function enrollCourse() {
    const btn = document.getElementById('enrollBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
    try {
        const res = await api.requestEnrollment(courseId);
        if (res.success) {
            toast?.success('Enrollment request submitted! Waiting for admin approval.');
            await loadCourseDetail();
        }
    } catch (err) {
        toast?.error(err.message || 'Failed to request enrollment.');
        if (btn) { btn.disabled = false; btn.textContent = '📋 Request Enrollment'; }
    }
}

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api.logout(); } catch {}
    api.removeAuthToken();
    localStorage.removeItem('currentUser');
    window.location.href = 'home.html';
});

loadCourseDetail();
