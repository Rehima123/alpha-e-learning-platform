// ─── Advanced Live Search with Suggestions ────────────────────────────────────
class LiveSearch {
    constructor(inputId, onSelect) {
        this.input = document.getElementById(inputId);
        this.onSelect = onSelect;
        this.debounceTimer = null;
        this.dropdown = null;
        if (this.input) this.init();
    }

    init() {
        this.input.setAttribute('autocomplete', 'off');
        this.input.addEventListener('input', () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.search(), 300);
        });
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
            if (e.key === 'Enter') {
                const first = this.dropdown?.querySelector('.search-item');
                if (first) first.click();
            }
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest(`#${this.input.id}`) && !e.target.closest('#search-dropdown')) {
                this.close();
            }
        });
    }

    async search() {
        const q = this.input.value.trim();
        if (q.length < 2) { this.close(); return; }

        try {
            const response = await api.getCourses({ search: q });
            const results = response.success ? response.courses.slice(0, 6) : [];
            this.render(results, q);
        } catch {
            this.close();
        }
    }

    render(results, query) {
        this.close();
        if (results.length === 0) return;

        this.dropdown = document.createElement('div');
        this.dropdown.id = 'search-dropdown';
        this.dropdown.style.cssText = `
            position:absolute;top:100%;left:0;right:0;background:white;
            border-radius:0 0 12px 12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);
            z-index:1000;overflow:hidden;max-height:320px;overflow-y:auto;
        `;

        this.dropdown.innerHTML = results.map(c => `
            <div class="search-item" data-id="${c._id}" style="
                padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;
                border-bottom:1px solid #f0f0f0;transition:background 0.15s;
            " onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                <span style="font-size:1.5rem">${c.icon || '📚'}</span>
                <div>
                    <div style="font-weight:600;color:#333;font-size:0.9rem">${this.highlight(c.title, query)}</div>
                    <div style="font-size:0.78rem;color:#888">${c.category} · ${c.level} · ⭐${(c.rating||0).toFixed(1)}</div>
                </div>
                <span style="margin-left:auto;font-size:0.85rem;color:#27ae60;font-weight:600">$${c.price}</span>
            </div>
        `).join('') + `
            <div style="padding:10px 16px;text-align:center;font-size:0.82rem;color:#3498db;cursor:pointer;
                background:#f8f9fa;" onclick="window.location.href='courses.html?search=${encodeURIComponent(query)}'">
                See all results for "${query}" →
            </div>
        `;

        this.dropdown.querySelectorAll('.search-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                if (this.onSelect) this.onSelect(id);
                else window.location.href = `course-detail.html?id=${id}`;
                this.close();
            });
        });

        const wrapper = this.input.parentElement;
        wrapper.style.position = 'relative';
        wrapper.appendChild(this.dropdown);
    }

    highlight(text, query) {
        const re = new RegExp(`(${query})`, 'gi');
        return text.replace(re, '<mark style="background:#fff3cd;padding:0 2px;border-radius:2px">$1</mark>');
    }

    close() {
        this.dropdown?.remove();
        this.dropdown = null;
    }
}
