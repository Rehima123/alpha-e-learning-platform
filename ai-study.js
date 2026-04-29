let courses = [];
let currentCourse = null;
let currentQuestions = [];
let userAnswers = [];
let quizStarted = false;
let currentTab = 'quiz';

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    updateConnectionBadge();
    window.addEventListener('online',  updateConnectionBadge);
    window.addEventListener('offline', updateConnectionBadge);

    // Load courses
    try {
        const res = await api.getCourses();
        if (res.success) {
            courses = res.courses || [];
        } else if (typeof offlineDB !== 'undefined') {
            courses = await offlineDB.getAll('courses').catch(() => []);
        }
    } catch {
        if (typeof offlineDB !== 'undefined') {
            courses = await offlineDB.getAll('courses').catch(() => []);
        }
    }

    const select = document.getElementById('courseSelect');
    courses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c._id;
        opt.textContent = `${c.icon || '📚'} ${c.title}`;
        select.appendChild(opt);
    });

    // Pre-select from URL param
    const urlId = new URLSearchParams(window.location.search).get('courseId');
    if (urlId) {
        select.value = urlId;
        currentCourse = courses.find(c => c._id === urlId);
    }

    select.addEventListener('change', () => {
        currentCourse = courses.find(c => c._id === select.value);
        resetQuiz();
    });
}

function updateConnectionBadge() {
    const badge = document.getElementById('connectionBadge');
    if (navigator.onLine) {
        badge.className = 'offline-badge online';
        badge.textContent = '🟢 Online — AI Enhanced';
    } else {
        badge.className = 'offline-badge offline';
        badge.textContent = '🟡 Offline — Local AI';
    }
}

function switchTab(tab) {
    currentTab = tab;
    ['quiz','notes','summary','mindmap'].forEach(t => {
        document.getElementById(`tab-${t}`).style.display = t === tab ? 'block' : 'none';
    });
    document.querySelectorAll('.study-tab').forEach((btn, i) => {
        btn.classList.toggle('active', ['quiz','notes','summary','mindmap'][i] === tab);
    });
}

// ── QUIZ ──────────────────────────────────────────────────────────────────────
async function startQuiz() {
    if (!currentCourse) {
        toast?.warning('Please select a course first');
        return;
    }

    const btn = document.getElementById('generateQuizBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Generating...';

    const count      = parseInt(document.getElementById('questionCount').value);
    const difficulty = document.getElementById('difficultySelect').value;

    try {
        // Fetch full course data for better questions
        let source = currentCourse;
        try {
            const res = await api.getCourse(currentCourse._id);
            if (res.success) source = res.course;
        } catch {}

        currentQuestions = await aiEngine.generateQuiz(source, { count, difficulty });
        userAnswers = new Array(currentQuestions.length).fill(null);
        quizStarted = true;

        renderQuiz();
        document.getElementById('resetBtn').style.display = 'inline-block';
        toast?.success(`Generated ${currentQuestions.length} questions!`);
    } catch (err) {
        toast?.error('Failed to generate quiz. Please try again.');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = '🎯 Generate Quiz';
    }
}

function renderQuiz() {
    const container = document.getElementById('quizContainer');
    document.getElementById('quizResult').style.display = 'none';

    container.innerHTML = currentQuestions.map((q, qi) => `
        <div class="quiz-card" id="qcard-${qi}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem">
                <span style="font-size:0.8rem;color:var(--text-secondary);font-weight:600">
                    Question ${qi + 1} of ${currentQuestions.length}
                </span>
                <span style="font-size:0.75rem;padding:3px 10px;border-radius:12px;font-weight:600;
                    background:${q.difficulty === 'easy' ? '#e8f5e9' : q.difficulty === 'hard' ? '#fde8e8' : '#fff3e0'};
                    color:${q.difficulty === 'easy' ? '#27ae60' : q.difficulty === 'hard' ? '#e74c3c' : '#f39c12'}">
                    ${q.difficulty || 'medium'}
                </span>
            </div>
            <div class="quiz-question">${q.question}</div>
            <div class="quiz-options">
                ${q.options.map((opt, oi) => `
                    <button class="quiz-option" id="opt-${qi}-${oi}"
                        onclick="selectAnswer(${qi}, ${oi})"
                        ${userAnswers[qi] !== null ? 'disabled' : ''}>
                        <strong>${String.fromCharCode(65 + oi)}.</strong> ${opt}
                    </button>
                `).join('')}
            </div>
            <div class="quiz-explanation" id="exp-${qi}">
                💡 ${q.explanation || 'Review the course material for more details.'}
            </div>
        </div>
    `).join('') + `
        <button class="btn btn-large btn-success" onclick="submitQuiz()"
            id="submitBtn" style="width:100%;margin-top:1rem;display:none">
            ✅ Submit Quiz
        </button>
    `;

    // Restore previous answers
    userAnswers.forEach((ans, qi) => {
        if (ans !== null) applyAnswerStyle(qi, ans);
    });

    checkAllAnswered();
}

function selectAnswer(qi, oi) {
    if (userAnswers[qi] !== null) return;
    userAnswers[qi] = oi;
    applyAnswerStyle(qi, oi);
    checkAllAnswered();
}

function applyAnswerStyle(qi, oi) {
    const q = currentQuestions[qi];
    const opts = document.querySelectorAll(`[id^="opt-${qi}-"]`);
    opts.forEach(btn => btn.disabled = true);

    const selected = document.getElementById(`opt-${qi}-${oi}`);
    const correct  = document.getElementById(`opt-${qi}-${q.answer}`);

    if (oi === q.answer) {
        selected.classList.add('correct');
    } else {
        selected.classList.add('wrong');
        correct.classList.add('reveal');
    }

    // Show explanation
    const exp = document.getElementById(`exp-${qi}`);
    if (exp) exp.style.display = 'block';
}

function checkAllAnswered() {
    const allDone = userAnswers.every(a => a !== null);
    const btn = document.getElementById('submitBtn');
    if (btn) btn.style.display = allDone ? 'block' : 'none';
}

function submitQuiz() {
    const score = userAnswers.filter((ans, i) => ans === currentQuestions[i].answer).length;
    const total = currentQuestions.length;
    const pct   = Math.round((score / total) * 100);

    const result = document.getElementById('quizResult');
    result.style.display = 'block';
    result.innerHTML = `
        <div class="quiz-card" style="text-align:center">
            <svg class="score-ring" viewBox="0 0 36 36">
                <circle class="bg" cx="18" cy="18" r="15.9"/>
                <circle class="fill" cx="18" cy="18" r="15.9"
                    stroke-dasharray="${pct} ${100 - pct}"
                    transform="rotate(-90 18 18)"/>
            </svg>
            <h2 style="color:var(--text-primary);margin:0 0 0.5rem">${pct}%</h2>
            <p style="color:var(--text-secondary);margin-bottom:1rem">
                ${score} out of ${total} correct
            </p>
            <div style="font-size:2rem;margin-bottom:0.5rem">
                ${pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}
            </div>
            <p style="font-weight:600;color:${pct >= 60 ? '#27ae60' : '#e74c3c'}">
                ${pct >= 80 ? 'Excellent! You mastered this topic.' :
                  pct >= 60 ? 'Good job! Review the missed questions.' :
                  'Keep studying! Try again after reviewing the material.'}
            </p>
            <div style="display:flex;gap:10px;justify-content:center;margin-top:1.5rem;flex-wrap:wrap">
                <button class="btn btn-success" onclick="resetQuiz()">🔄 Try Again</button>
                <button class="btn" onclick="generateNotes('bullet');switchTab('notes')">📝 Get Study Notes</button>
            </div>
        </div>
    `;

    result.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('submitBtn').style.display = 'none';
}

function resetQuiz() {
    currentQuestions = [];
    userAnswers = [];
    quizStarted = false;
    document.getElementById('quizContainer').innerHTML = '';
    document.getElementById('quizResult').style.display = 'none';
    document.getElementById('resetBtn').style.display = 'none';
}

// ── NOTES ─────────────────────────────────────────────────────────────────────
async function generateNotes(style) {
    if (!currentCourse) {
        toast?.warning('Please select a course first');
        return;
    }

    const containerId = style === 'bullet' ? 'notesContainer' :
                        style === 'summary' ? 'summaryContainer' : 'mindmapContainer';
    const container = document.getElementById(containerId);
    container.innerHTML = '<p style="color:var(--text-secondary);padding:1rem">⏳ Generating...</p>';

    try {
        let source = currentCourse;
        try {
            const res = await api.getCourse(currentCourse._id);
            if (res.success) source = res.course;
        } catch {}

        const notes = await aiEngine.generateNotes(source, { style });
        container.innerHTML = renderMarkdown(notes);

        // Add download button
        container.insertAdjacentHTML('beforeend', `
            <div style="display:flex;gap:10px;margin-top:1.5rem;flex-wrap:wrap">
                <button class="btn btn-success" onclick="downloadNotes('${style}')">
                    💾 Download Notes
                </button>
                <button class="btn" onclick="copyNotes('${style}')">
                    📋 Copy to Clipboard
                </button>
            </div>
        `);

        toast?.success('Notes generated!');
    } catch (err) {
        container.innerHTML = '<p style="color:red">Failed to generate notes. Please try again.</p>';
        console.error(err);
    }
}

function renderMarkdown(text) {
    return `<div class="notes-output">${
        text
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^- (.+)$/gm, '• $1')
            .replace(/^> (.+)$/gm, '<em style="color:var(--text-secondary)">$1</em>')
            .replace(/\n/g, '<br>')
    }</div>`;
}

function downloadNotes(style) {
    const containerId = style === 'bullet' ? 'notesContainer' :
                        style === 'summary' ? 'summaryContainer' : 'mindmapContainer';
    const text = document.querySelector(`#${containerId} .notes-output`)?.innerText || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentCourse?.title || 'notes'}-${style}.txt`;
    a.click();
}

async function copyNotes(style) {
    const containerId = style === 'bullet' ? 'notesContainer' :
                        style === 'summary' ? 'summaryContainer' : 'mindmapContainer';
    const text = document.querySelector(`#${containerId} .notes-output`)?.innerText || '';
    try {
        await navigator.clipboard.writeText(text);
        toast?.success('Copied to clipboard!');
    } catch {
        toast?.warning('Could not copy. Please select and copy manually.');
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

init();
