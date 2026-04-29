// ─── Bookmark System — save/unsave lessons, offline ──────────────────────────
class BookmarkManager {
    constructor() {
        this.key = 'bookmarks';
    }

    getAll() {
        return JSON.parse(localStorage.getItem(this.key) || '[]');
    }

    isBookmarked(courseId, lessonId) {
        return this.getAll().some(b => b.courseId === courseId && b.lessonId === lessonId);
    }

    toggle(courseId, courseTitle, lessonId, lessonTitle, chapterTitle = '') {
        const bookmarks = this.getAll();
        const idx = bookmarks.findIndex(b => b.courseId === courseId && b.lessonId === lessonId);
        if (idx >= 0) {
            bookmarks.splice(idx, 1);
            localStorage.setItem(this.key, JSON.stringify(bookmarks));
            toast?.info('Bookmark removed');
            return false;
        } else {
            bookmarks.unshift({
                id: `${courseId}-${lessonId}`,
                courseId, courseTitle, lessonId, lessonTitle, chapterTitle,
                savedAt: new Date().toISOString()
            });
            localStorage.setItem(this.key, JSON.stringify(bookmarks));
            toast?.success('📌 Lesson bookmarked!');
            return true;
        }
    }

    remove(id) {
        const bookmarks = this.getAll().filter(b => b.id !== id);
        localStorage.setItem(this.key, JSON.stringify(bookmarks));
    }

    renderList(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const bookmarks = this.getAll();

        if (bookmarks.length === 0) {
            el.innerHTML = `
                <div style="text-align:center;padding:2rem;color:var(--text-secondary)">
                    <div style="font-size:2.5rem;margin-bottom:0.8rem">📌</div>
                    <p>No bookmarks yet.</p>
                    <p style="font-size:0.85rem">Click the bookmark icon on any lesson to save it here.</p>
                </div>`;
            return;
        }

        el.innerHTML = bookmarks.map(b => `
            <div style="background:var(--bg-secondary);border-radius:12px;padding:14px 16px;
                margin-bottom:10px;border:1px solid var(--border-color);
                display:flex;align-items:center;gap:12px">
                <div style="font-size:1.5rem">📌</div>
                <div style="flex:1;min-width:0">
                    <h4 style="margin:0;font-size:0.9rem;color:var(--text-primary)">${b.lessonTitle}</h4>
                    <p style="margin:2px 0 0;font-size:0.78rem;color:var(--text-secondary)">
                        ${b.courseTitle}${b.chapterTitle ? ' · ' + b.chapterTitle : ''}
                    </p>
                    <p style="margin:2px 0 0;font-size:0.72rem;color:var(--text-secondary)">
                        Saved ${new Date(b.savedAt).toLocaleDateString()}
                    </p>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0">
                    <a href="course-detail.html?id=${b.courseId}"
                        class="btn btn-sm" style="font-size:0.75rem;padding:5px 10px">Open</a>
                    <button onclick="bookmarkManager.remove('${b.id}');this.closest('div[style]').remove()"
                        class="btn btn-sm" style="font-size:0.75rem;padding:5px 10px;color:#e74c3c;border-color:#e74c3c">
                        🗑
                    </button>
                </div>
            </div>
        `).join('');
    }
}

const bookmarkManager = new BookmarkManager();
