// ─── Lesson Download & Offline Storage ───────────────────────────────────────

class LessonDownloader {

    // ── Download lesson package (notes + quiz) to IndexedDB + file ───────────
    async downloadLesson(courseId, chapterIdx, lessonIdx) {
        const btn = document.getElementById('downloadLessonBtn');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

        try {
            // Get full course data
            let course = null;
            try {
                const res = await api.getCourse(courseId);
                if (res.success) course = res.course;
            } catch {}

            if (!course) {
                // Try offline cache
                if (typeof offlineDB !== 'undefined') {
                    course = await offlineDB.get('courses', courseId);
                }
            }

            if (!course) throw new Error('Course not found');

            const chapter = course.chapters?.[chapterIdx];
            const lesson  = chapter?.lessons?.[lessonIdx];
            if (!lesson) throw new Error('Lesson not found');

            // Generate quiz questions for this lesson
            let questions = [];
            try {
                questions = await aiEngine.generateQuiz(course, { count: 5, difficulty: 'medium' });
            } catch {}

            // Build the offline package
            const pkg = {
                _id:         `lesson-${courseId}-${chapterIdx}-${lessonIdx}`,
                courseId,
                courseTitle: course.title,
                department:  course.department || course.category,
                chapterTitle: chapter.title,
                lessonTitle:  lesson.title,
                notes:        lesson.notes || lesson.description || '',
                duration:     lesson.duration || '',
                questions,
                downloadedAt: new Date().toISOString(),
                version:      1
            };

            // Save to IndexedDB
            if (typeof offlineDB !== 'undefined') {
                await offlineDB.put('downloadedLessons', pkg);
            }

            // Also save to localStorage index
            const index = JSON.parse(localStorage.getItem('downloadedLessons') || '[]');
            const existing = index.findIndex(i => i._id === pkg._id);
            const meta = { _id: pkg._id, courseTitle: pkg.courseTitle, lessonTitle: pkg.lessonTitle, downloadedAt: pkg.downloadedAt };
            if (existing >= 0) index[existing] = meta;
            else index.unshift(meta);
            localStorage.setItem('downloadedLessons', JSON.stringify(index));

            toast?.success(`✅ "${lesson.title}" saved for offline reading!`);

            // Update button
            if (btn) {
                btn.disabled = false;
                btn.textContent = '✓ Saved Offline';
                btn.style.background = '#27ae60';
            }

            return pkg;
        } catch (err) {
            toast?.error('Failed to save lesson: ' + err.message);
            if (btn) { btn.disabled = false; btn.textContent = '💾 Save Offline'; }
            return null;
        }
    }

    // ── Check if lesson is already downloaded ─────────────────────────────────
    async isDownloaded(courseId, chapterIdx, lessonIdx) {
        const id = `lesson-${courseId}-${chapterIdx}-${lessonIdx}`;
        if (typeof offlineDB === 'undefined') return false;
        try {
            const pkg = await offlineDB.get('downloadedLessons', id);
            return !!pkg;
        } catch { return false; }
    }

    // ── Load downloaded lesson ────────────────────────────────────────────────
    async loadDownloaded(courseId, chapterIdx, lessonIdx) {
        const id = `lesson-${courseId}-${chapterIdx}-${lessonIdx}`;
        if (typeof offlineDB === 'undefined') return null;
        try { return await offlineDB.get('downloadedLessons', id); }
        catch { return null; }
    }

    // ── Get all downloaded lessons ────────────────────────────────────────────
    async getAllDownloaded() {
        if (typeof offlineDB === 'undefined') return [];
        try { return await offlineDB.getAll('downloadedLessons'); }
        catch { return []; }
    }

    // ── Delete downloaded lesson ──────────────────────────────────────────────
    async deleteDownloaded(id) {
        if (typeof offlineDB === 'undefined') return;
        try {
            const db = await offlineDB.open();
            const tx = db.transaction('downloadedLessons', 'readwrite');
            tx.objectStore('downloadedLessons').delete(id);
            // Update index
            const index = JSON.parse(localStorage.getItem('downloadedLessons') || '[]');
            localStorage.setItem('downloadedLessons', JSON.stringify(index.filter(i => i._id !== id)));
        } catch {}
    }

    // ── Export lesson as printable HTML file ──────────────────────────────────
    exportAsHTML(pkg) {
        const questionsHTML = (pkg.questions || []).map((q, i) => `
            <div style="margin-bottom:20px;padding:16px;background:#f8f9fa;border-radius:8px">
                <p style="font-weight:bold;margin:0 0 10px">${i + 1}. ${q.question}</p>
                ${q.options.map((opt, oi) => `
                    <div style="padding:6px 10px;margin:4px 0;border-radius:6px;
                        background:${oi === q.answer ? '#e8f5e9' : 'white'};
                        border:1px solid ${oi === q.answer ? '#27ae60' : '#dee2e6'}">
                        ${String.fromCharCode(65 + oi)}. ${opt}
                        ${oi === q.answer ? ' ✓' : ''}
                    </div>
                `).join('')}
                ${q.explanation ? `<p style="font-size:0.85rem;color:#666;margin:8px 0 0">💡 ${q.explanation}</p>` : ''}
            </div>
        `).join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${pkg.lessonTitle} — Alpha Freshman Tutorial</title>
<style>
  body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333;line-height:1.7}
  h1{color:#667eea;border-bottom:3px solid #667eea;padding-bottom:10px}
  h2{color:#764ba2;margin-top:30px}
  h3{color:#333;margin-top:20px}
  .meta{background:#f0f4ff;padding:12px 16px;border-radius:8px;font-size:0.9rem;margin-bottom:24px}
  .notes{background:#fafafa;padding:20px;border-radius:8px;border-left:4px solid #667eea;margin-bottom:30px}
  blockquote{border-left:4px solid #667eea;padding:8px 16px;background:#f0f4ff;border-radius:0 8px 8px 0;margin:12px 0}
  @media print{body{margin:20px}}
</style>
</head>
<body>
  <h1>📚 ${pkg.lessonTitle}</h1>
  <div class="meta">
    <strong>Course:</strong> ${pkg.courseTitle} &nbsp;|&nbsp;
    <strong>Chapter:</strong> ${pkg.chapterTitle} &nbsp;|&nbsp;
    <strong>Duration:</strong> ${pkg.duration || 'N/A'} &nbsp;|&nbsp;
    <strong>Downloaded:</strong> ${new Date(pkg.downloadedAt).toLocaleDateString()}
  </div>

  <h2>📝 Study Notes</h2>
  <div class="notes">
    ${(pkg.notes || 'No notes available.')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>')}
  </div>

  ${pkg.questions?.length > 0 ? `
  <h2>🧠 Practice Quiz (${pkg.questions.length} Questions)</h2>
  ${questionsHTML}
  ` : ''}

  <hr style="margin-top:40px">
  <p style="text-align:center;color:#888;font-size:0.85rem">
    © 2026 Alpha Freshman Tutorial · Developed by Rehima Ali
  </p>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${pkg.lessonTitle.replace(/\s+/g, '-').toLowerCase()}.html`;
        a.click();
        toast?.success('Lesson exported as HTML!');
    }

    // ── Render downloaded lessons list ────────────────────────────────────────
    async renderDownloadedList(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return;

        const lessons = await this.getAllDownloaded();

        if (lessons.length === 0) {
            el.innerHTML = `
                <div style="text-align:center;padding:2rem;color:var(--text-secondary)">
                    <div style="font-size:2.5rem;margin-bottom:0.8rem">📥</div>
                    <p>No lessons saved yet.</p>
                    <p style="font-size:0.85rem">Open any lesson and click "Save Offline" to access it without internet.</p>
                </div>`;
            return;
        }

        el.innerHTML = lessons.map(pkg => `
            <div style="background:var(--bg-secondary);border-radius:12px;padding:14px 16px;
                margin-bottom:10px;border:1px solid var(--border-color);
                display:flex;align-items:center;gap:12px">
                <div style="font-size:2rem">📄</div>
                <div style="flex:1;min-width:0">
                    <h4 style="margin:0;font-size:0.9rem;color:var(--text-primary)">${pkg.lessonTitle}</h4>
                    <p style="margin:2px 0 0;font-size:0.78rem;color:var(--text-secondary)">
                        ${pkg.courseTitle} · ${new Date(pkg.downloadedAt).toLocaleDateString()}
                        ${pkg.questions?.length ? ` · ${pkg.questions.length} quiz questions` : ''}
                    </p>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0">
                    <button onclick="lessonDownloader.exportAsHTML(${JSON.stringify(pkg).replace(/"/g, '&quot;')})"
                        class="btn btn-sm" style="font-size:0.75rem;padding:5px 10px">
                        📥 Export
                    </button>
                    <button onclick="lessonDownloader.deleteDownloaded('${pkg._id}');this.closest('div[style]').remove()"
                        class="btn btn-sm" style="font-size:0.75rem;padding:5px 10px;background:#fde8e8;color:#e74c3c;border-color:#e74c3c">
                        🗑
                    </button>
                </div>
            </div>
        `).join('');
    }
}

const lessonDownloader = new LessonDownloader();
