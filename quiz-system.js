// ─── Alpha Quiz System — Gamification + Offline ───────────────────────────────

class QuizSystem {
    constructor() {
        this.questions    = [];
        this.answers      = [];
        this.current      = 0;
        this.startTime    = null;
        this.timerInterval = null;
        this.courseId     = null;
        this.chapterIdx   = null;
        this.lessonTitle  = '';
    }

    // ── Points engine ─────────────────────────────────────────────────────────
    static POINTS = {
        correct:       10,
        streak3:       5,   // bonus for 3 in a row
        streak5:       15,  // bonus for 5 in a row
        speedBonus:    5,   // answered in < 10s
        perfect:       25,  // all correct
        firstTry:      3    // first attempt on this quiz
    };

    static getLevel(totalPoints) {
        if (totalPoints >= 500) return { name: 'Scholar',    icon: '🎓', color: '#764ba2' };
        if (totalPoints >= 300) return { name: 'Expert',     icon: '⭐', color: '#667eea' };
        if (totalPoints >= 150) return { name: 'Advanced',   icon: '🔥', color: '#e67e22' };
        if (totalPoints >= 50)  return { name: 'Learner',    icon: '📚', color: '#27ae60' };
        return                         { name: 'Beginner',   icon: '🌱', color: '#3498db' };
    }

    // ── Load & start quiz ─────────────────────────────────────────────────────
    async start(courseId, chapterIdx, lessonTitle, containerId) {
        this.courseId    = courseId;
        this.chapterIdx  = chapterIdx;
        this.lessonTitle = lessonTitle;
        this.current     = 0;
        this.answers     = [];
        this.startTime   = Date.now();

        // Generate questions via AI engine
        let source = { _id: courseId, title: lessonTitle, category: 'semester1' };
        try {
            const res = await api.getCourse(courseId);
            if (res.success) source = res.course;
        } catch {}

        const count = parseInt(document.getElementById('qCountSelect')?.value || '5');
        const diff  = document.getElementById('diffSelect')?.value || 'medium';

        this.questions = await aiEngine.generateQuiz(source, { count, difficulty: diff });

        this.render(containerId);
    }

    // ── Render quiz ───────────────────────────────────────────────────────────
    render(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return;

        const q = this.questions[this.current];
        const total = this.questions.length;
        const pct   = Math.round((this.current / total) * 100);
        const pts   = this._calcCurrentPoints();
        const level = QuizSystem.getLevel(this._getTotalPoints());

        el.innerHTML = `
            <div style="background:var(--bg-secondary);border-radius:20px;padding:1.8rem;
                box-shadow:0 4px 24px var(--shadow);border:1px solid var(--border-color)">

                <!-- Top bar: progress + points -->
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:8px">
                    <div style="flex:1;min-width:120px">
                        <div style="display:flex;justify-content:space-between;font-size:0.78rem;
                            color:var(--text-secondary);margin-bottom:4px">
                            <span>Question ${this.current + 1} of ${total}</span>
                            <span>${pct}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width:${pct}%"></div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px">
                        <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;
                            padding:5px 14px;border-radius:20px;font-size:0.82rem;font-weight:700">
                            ⚡ ${pts} pts
                        </div>
                        <div style="background:${level.color}22;color:${level.color};
                            padding:5px 12px;border-radius:20px;font-size:0.78rem;font-weight:700">
                            ${level.icon} ${level.name}
                        </div>
                    </div>
                </div>

                <!-- Timer -->
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem">
                    <span style="font-size:0.78rem;color:var(--text-secondary)">
                        ${q.difficulty === 'easy' ? '🟢 Easy' : q.difficulty === 'hard' ? '🔴 Hard' : '🟡 Medium'}
                    </span>
                    <span id="quizTimer" style="font-size:0.82rem;font-weight:600;color:var(--text-secondary)">⏱ 0s</span>
                </div>

                <!-- Question -->
                <div style="font-size:1.05rem;font-weight:700;color:var(--text-primary);
                    margin-bottom:1.4rem;line-height:1.5">
                    ${q.question}
                </div>

                <!-- Options -->
                <div style="display:flex;flex-direction:column;gap:10px" id="optionsBox">
                    ${q.options.map((opt, i) => `
                        <button class="quiz-opt-btn" id="opt-${i}" onclick="quizSystem.choose(${i})"
                            style="padding:13px 18px;border:2px solid var(--border-color);border-radius:12px;
                                background:var(--bg-primary);color:var(--text-primary);text-align:left;
                                cursor:pointer;font-size:0.9rem;transition:all 0.2s;display:flex;align-items:center;gap:10px">
                            <span style="width:26px;height:26px;border-radius:50%;background:var(--bg-secondary);
                                border:2px solid var(--border-color);display:flex;align-items:center;
                                justify-content:center;font-size:0.78rem;font-weight:700;flex-shrink:0">
                                ${String.fromCharCode(65 + i)}
                            </span>
                            ${opt}
                        </button>
                    `).join('')}
                </div>

                <!-- Explanation (hidden until answered) -->
                <div id="explanationBox" style="display:none;margin-top:1rem;padding:12px 16px;
                    background:rgba(102,126,234,0.08);border-radius:10px;font-size:0.85rem;
                    color:var(--text-secondary);border-left:3px solid #667eea">
                    💡 <span id="explanationText"></span>
                </div>

                <!-- Next button (hidden until answered) -->
                <div id="nextBox" style="display:none;margin-top:1.2rem;text-align:right">
                    <button onclick="quizSystem.next('${containerId}')"
                        style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;
                            border:none;padding:11px 28px;border-radius:12px;font-weight:700;
                            cursor:pointer;font-size:0.9rem">
                        ${this.current + 1 < total ? 'Next →' : '🏁 See Results'}
                    </button>
                </div>
            </div>
        `;

        this._startTimer();
    }

    // ── Choose answer ─────────────────────────────────────────────────────────
    choose(optIdx) {
        const q = this.questions[this.current];
        const elapsed = Math.round((Date.now() - this._qStart) / 1000);
        const isCorrect = optIdx === q.answer;

        // Disable all buttons
        document.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);

        // Style correct / wrong
        const correctBtn = document.getElementById(`opt-${q.answer}`);
        const chosenBtn  = document.getElementById(`opt-${optIdx}`);

        if (correctBtn) {
            correctBtn.style.borderColor = '#27ae60';
            correctBtn.style.background  = 'rgba(39,174,96,0.1)';
            correctBtn.style.color       = '#27ae60';
        }
        if (!isCorrect && chosenBtn) {
            chosenBtn.style.borderColor = '#e74c3c';
            chosenBtn.style.background  = 'rgba(231,76,60,0.1)';
            chosenBtn.style.color       = '#e74c3c';
        }

        // Points for this answer
        let pts = 0;
        if (isCorrect) {
            pts += QuizSystem.POINTS.correct;
            if (elapsed < 10) pts += QuizSystem.POINTS.speedBonus;
            // Streak bonus
            const streak = this._currentStreak(isCorrect);
            if (streak >= 5) pts += QuizSystem.POINTS.streak5;
            else if (streak >= 3) pts += QuizSystem.POINTS.streak3;
        }

        this.answers.push({ optIdx, isCorrect, elapsed, pts });

        // Show explanation
        const expBox  = document.getElementById('explanationBox');
        const expText = document.getElementById('explanationText');
        if (expBox && expText && q.explanation) {
            expText.textContent = q.explanation;
            expBox.style.display = 'block';
        }

        // Show next button
        const nextBox = document.getElementById('nextBox');
        if (nextBox) nextBox.style.display = 'block';

        // Points popup
        if (pts > 0) this._showPointsPopup(pts);

        clearInterval(this.timerInterval);
    }

    // ── Next question ─────────────────────────────────────────────────────────
    next(containerId) {
        this.current++;
        if (this.current < this.questions.length) {
            this._qStart = Date.now();
            this.render(containerId);
        } else {
            this.showResults(containerId);
        }
    }

    // ── Results screen ────────────────────────────────────────────────────────
    async showResults(containerId) {
        clearInterval(this.timerInterval);

        const correct   = this.answers.filter(a => a.isCorrect).length;
        const total     = this.questions.length;
        const pct       = Math.round((correct / total) * 100);
        const totalPts  = this.answers.reduce((s, a) => s + a.pts, 0);
        const timeTaken = Math.round((Date.now() - this.startTime) / 1000);
        const isPerfect = correct === total;
        const bonusPts  = isPerfect ? QuizSystem.POINTS.perfect : 0;
        const finalPts  = totalPts + bonusPts;

        // Save result
        await this._saveResult({ correct, total, pct, finalPts, timeTaken });

        const level    = QuizSystem.getLevel(this._getTotalPoints() + finalPts);
        const prevPts  = this._getTotalPoints();
        this._addPoints(finalPts);
        const newPts   = this._getTotalPoints();

        const el = document.getElementById(containerId);
        el.innerHTML = `
            <div style="background:var(--bg-secondary);border-radius:20px;padding:2rem;
                box-shadow:0 4px 24px var(--shadow);text-align:center">

                <!-- Score ring -->
                <svg width="140" height="140" viewBox="0 0 36 36" style="margin:0 auto 1rem;display:block">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border-color)" stroke-width="3"/>
                    <circle cx="18" cy="18" r="15.9" fill="none"
                        stroke="${pct >= 70 ? '#27ae60' : pct >= 50 ? '#f39c12' : '#e74c3c'}"
                        stroke-width="3" stroke-linecap="round"
                        stroke-dasharray="${pct} ${100 - pct}"
                        transform="rotate(-90 18 18)"
                        style="transition:stroke-dasharray 1s ease"/>
                    <text x="18" y="16" text-anchor="middle" font-size="7" font-weight="bold"
                        fill="${pct >= 70 ? '#27ae60' : pct >= 50 ? '#f39c12' : '#e74c3c'}">${pct}%</text>
                    <text x="18" y="22" text-anchor="middle" font-size="3.5" fill="var(--text-secondary)">
                        ${correct}/${total}
                    </text>
                </svg>

                <div style="font-size:2.5rem;margin-bottom:0.5rem">
                    ${pct === 100 ? '🏆' : pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '📚'}
                </div>
                <h2 style="color:var(--text-primary);margin:0 0 0.4rem">
                    ${pct === 100 ? 'Perfect Score!' : pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good Job!' : 'Keep Studying!'}
                </h2>
                <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:1.5rem">
                    ${correct} correct · ${total - correct} wrong · ${timeTaken}s
                </p>

                <!-- Points earned -->
                <div style="background:linear-gradient(135deg,rgba(102,126,234,0.1),rgba(118,75,162,0.1));
                    border-radius:14px;padding:1.2rem;margin-bottom:1.5rem">
                    <div style="font-size:1.8rem;font-weight:800;color:#667eea">+${finalPts} pts</div>
                    ${isPerfect ? `<div style="font-size:0.8rem;color:#764ba2;font-weight:600">🎯 Perfect bonus: +${bonusPts} pts</div>` : ''}
                    <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:6px">
                        Total: ${newPts} pts · Level: ${level.icon} ${level.name}
                    </div>
                    <!-- XP bar -->
                    <div style="margin-top:10px">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width:${Math.min((newPts % 100), 100)}%;
                                background:linear-gradient(90deg,#667eea,#764ba2)"></div>
                        </div>
                        <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:3px">
                            ${newPts % 100}/100 XP to next level
                        </div>
                    </div>
                </div>

                <!-- Per-question review -->
                <div style="text-align:left;margin-bottom:1.5rem">
                    <h4 style="color:var(--text-primary);margin:0 0 10px;font-size:0.9rem">Question Review</h4>
                    ${this.questions.map((q, i) => {
                        const a = this.answers[i];
                        return `
                        <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;
                            border-bottom:1px solid var(--border-color)">
                            <span style="font-size:1rem;flex-shrink:0">${a?.isCorrect ? '✅' : '❌'}</span>
                            <div style="flex:1;min-width:0">
                                <p style="font-size:0.82rem;color:var(--text-primary);margin:0">${q.question}</p>
                                ${!a?.isCorrect ? `
                                    <p style="font-size:0.75rem;color:#27ae60;margin:3px 0 0">
                                        ✓ ${q.options[q.answer]}
                                    </p>` : ''}
                            </div>
                            <span style="font-size:0.75rem;color:var(--text-secondary);flex-shrink:0">
                                ${a?.pts > 0 ? `+${a.pts}` : '0'} pts
                            </span>
                        </div>`;
                    }).join('')}
                </div>

                <!-- Action buttons -->
                <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
                    <button onclick="quizSystem.retry('${containerId}')"
                        class="btn">🔄 Retry</button>
                    <button onclick="quizSystem.downloadResult()"
                        class="btn btn-success">💾 Save Result</button>
                    <a href="ai-study.html?courseId=${this.courseId}" class="btn">
                        📝 More Practice
                    </a>
                </div>
            </div>
        `;
    }

    // ── Retry ─────────────────────────────────────────────────────────────────
    retry(containerId) {
        this.current  = 0;
        this.answers  = [];
        this.startTime = Date.now();
        this._qStart   = Date.now();
        this.render(containerId);
    }

    // ── Save result to IndexedDB ──────────────────────────────────────────────
    async _saveResult(result) {
        const record = {
            _id:        `quiz-result-${Date.now()}`,
            courseId:   this.courseId,
            lessonTitle: this.lessonTitle,
            ...result,
            date:       new Date().toISOString(),
            questions:  this.questions,
            answers:    this.answers
        };
        try {
            if (typeof offlineDB !== 'undefined') {
                await offlineDB.put('quizResults', record);
            }
        } catch {}
        // Also save to localStorage as backup
        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        history.unshift({ ...record, questions: undefined, answers: undefined });
        if (history.length > 50) history.pop();
        localStorage.setItem('quizHistory', JSON.stringify(history));
    }

    // ── Download result as text ───────────────────────────────────────────────
    downloadResult() {
        const correct  = this.answers.filter(a => a.isCorrect).length;
        const total    = this.questions.length;
        const pct      = Math.round((correct / total) * 100);
        const pts      = this.answers.reduce((s, a) => s + a.pts, 0);

        let text = `QUIZ RESULT — Alpha Freshman Tutorial\n`;
        text += `${'='.repeat(45)}\n`;
        text += `Lesson:  ${this.lessonTitle}\n`;
        text += `Date:    ${new Date().toLocaleString()}\n`;
        text += `Score:   ${correct}/${total} (${pct}%)\n`;
        text += `Points:  +${pts}\n\n`;
        text += `QUESTIONS & ANSWERS\n${'─'.repeat(45)}\n`;

        this.questions.forEach((q, i) => {
            const a = this.answers[i];
            text += `\nQ${i + 1}: ${q.question}\n`;
            q.options.forEach((opt, oi) => {
                const mark = oi === q.answer ? '✓' : oi === a?.optIdx && !a?.isCorrect ? '✗' : ' ';
                text += `  [${mark}] ${String.fromCharCode(65 + oi)}. ${opt}\n`;
            });
            if (q.explanation) text += `    💡 ${q.explanation}\n`;
        });

        text += `\n${'='.repeat(45)}\n© 2026 Alpha Freshman Tutorial — Developed by Rehima Ali`;

        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `quiz-${this.lessonTitle.replace(/\s+/g, '-').toLowerCase()}.txt`;
        a.click();
        toast?.success('Quiz result downloaded!');
    }

    // ── Points helpers ────────────────────────────────────────────────────────
    _getTotalPoints() {
        return parseInt(localStorage.getItem('totalPoints') || '0');
    }
    _addPoints(pts) {
        const current = this._getTotalPoints();
        localStorage.setItem('totalPoints', current + pts);
    }
    _calcCurrentPoints() {
        return this.answers.reduce((s, a) => s + (a.pts || 0), 0);
    }
    _currentStreak(isCorrect) {
        if (!isCorrect) return 0;
        let streak = 1;
        for (let i = this.answers.length - 1; i >= 0; i--) {
            if (this.answers[i].isCorrect) streak++;
            else break;
        }
        return streak;
    }

    // ── Timer ─────────────────────────────────────────────────────────────────
    _startTimer() {
        this._qStart = Date.now();
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            const el = document.getElementById('quizTimer');
            if (el) el.textContent = `⏱ ${Math.round((Date.now() - this._qStart) / 1000)}s`;
        }, 1000);
    }

    // ── Points popup ──────────────────────────────────────────────────────────
    _showPointsPopup(pts) {
        const popup = document.createElement('div');
        popup.textContent = `+${pts} pts!`;
        popup.style.cssText = `
            position:fixed;top:80px;right:20px;z-index:9999;
            background:linear-gradient(135deg,#667eea,#764ba2);color:white;
            padding:10px 20px;border-radius:30px;font-weight:800;font-size:1rem;
            animation:pointsPop 1.5s ease forwards;pointer-events:none;
        `;
        if (!document.getElementById('pointsPopStyle')) {
            const s = document.createElement('style');
            s.id = 'pointsPopStyle';
            s.textContent = `@keyframes pointsPop{0%{opacity:0;transform:translateY(0) scale(0.5)}
                30%{opacity:1;transform:translateY(-20px) scale(1.1)}
                70%{opacity:1;transform:translateY(-30px) scale(1)}
                100%{opacity:0;transform:translateY(-50px) scale(0.9)}}`;
            document.head.appendChild(s);
        }
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 1500);
    }
}

const quizSystem = new QuizSystem();
