// ─── Progress Analytics with Canvas Charts ───────────────────────────────────
class ProgressChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas?.getContext('2d');
    }

    drawDonut(percent, label, color = '#3498db') {
        if (!this.ctx) return;
        const { canvas, ctx } = this;
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const r = Math.min(cx, cy) - 20;
        const start = -Math.PI / 2;
        const end = start + (percent / 100) * 2 * Math.PI;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.strokeStyle = '#e8ecef';
        ctx.lineWidth = 18;
        ctx.stroke();

        // Progress ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, start, end);
        ctx.strokeStyle = color;
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Center text
        ctx.fillStyle = '#333';
        ctx.font = `bold ${r * 0.45}px Segoe UI`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(percent)}%`, cx, cy - 10);

        ctx.fillStyle = '#888';
        ctx.font = `${r * 0.22}px Segoe UI`;
        ctx.fillText(label, cx, cy + r * 0.35);
    }

    drawBar(data, labels, color = '#3498db') {
        if (!this.ctx) return;
        const { canvas, ctx } = this;
        const pad = 40, barW = (canvas.width - pad * 2) / data.length - 8;
        const maxVal = Math.max(...data, 1);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        data.forEach((val, i) => {
            const x = pad + i * ((canvas.width - pad * 2) / data.length) + 4;
            const barH = ((canvas.height - pad * 2) * val) / maxVal;
            const y = canvas.height - pad - barH;

            // Bar
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
            ctx.fill();

            // Label
            ctx.fillStyle = '#888';
            ctx.font = '11px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i], x + barW / 2, canvas.height - 10);

            // Value
            ctx.fillStyle = '#333';
            ctx.font = 'bold 11px Segoe UI';
            ctx.fillText(val, x + barW / 2, y - 6);
        });
    }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
async function renderLeaderboard(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-secondary)">Loading leaderboard...</div>`;

    try {
        const response = await api.request('/users/leaderboard');
        const users = response.success ? response.users : [];

        if (users.length === 0) {
            el.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:20px">No data yet</p>`;
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];
        el.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:8px">
                ${users.slice(0, 10).map((u, i) => `
                    <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;
                        background:${i < 3 ? 'linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.08))' : 'var(--bg-secondary)'};
                        border-radius:10px;border:1px solid var(--border-color);">
                        <span style="font-size:1.3rem;min-width:28px;text-align:center">
                            ${medals[i] || `#${i + 1}`}
                        </span>
                        <div style="flex:1">
                            <div style="font-weight:600;color:var(--text-primary);font-size:0.9rem">${u.fullName}</div>
                            <div style="font-size:0.75rem;color:var(--text-secondary)">${u.completedCourses || 0} courses completed</div>
                        </div>
                        <div style="text-align:right">
                            <div style="font-weight:700;color:#667eea;font-size:0.95rem">${u.points || 0} pts</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch {
        el.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:20px">Leaderboard coming soon</p>`;
    }
}

// ─── Live Platform Stats ──────────────────────────────────────────────────────
async function animateCounter(el, target, duration = 1500) {
    if (!el) return;
    const start = 0;
    const step = target / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = Math.floor(current).toLocaleString();
        if (current >= target) clearInterval(timer);
    }, 16);
}

async function loadLiveStats() {
    try {
        const response = await api.getAdminStats();
        if (response.success) {
            const s = response.stats;
            animateCounter(document.getElementById('stat-users'), s.totalUsers || 0);
            animateCounter(document.getElementById('stat-courses'), s.totalCourses || 0);
            animateCounter(document.getElementById('stat-instructors'), s.totalInstructors || 0);
        }
    } catch {
        // fallback static values
        animateCounter(document.getElementById('stat-users'), 1200);
        animateCounter(document.getElementById('stat-courses'), 22);
        animateCounter(document.getElementById('stat-instructors'), 15);
    }
}
