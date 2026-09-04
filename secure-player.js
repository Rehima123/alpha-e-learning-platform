/**
 * secure-player.js — Alpha Freshman Tutorial
 * ─────────────────────────────────────────────────────────────────────────────
 * Vanilla JS Secure Video Player for course-detail.html (non-React pages).
 *
 * Provides:
 *  1. buildSecurePlayer(lesson, user, container)
 *     — Renders a YouTube embed with watermark, no right-click, no raw URL.
 *  2. Dynamic watermark that drifts across the player every 4 s.
 *  3. PrintScreen / screenshot key blocking.
 *  4. Screen-capture visibility-change heuristic shield.
 *  5. In-app offline save (IndexedDB via offlineDB helper).
 *
 * Usage (from course-detail.js):
 *   import { buildSecurePlayer } from './secure-player.js';
 *   buildSecurePlayer(lesson, currentUser, document.getElementById('lessonViewer'));
 */

'use strict';

// ── IndexedDB helpers (mirrors src/utils/offlineDB.js for vanilla context) ────
const _DB_NAME    = 'alpha-offline-db';
const _DB_VERSION = 2;

function _openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(_DB_NAME, _DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('videos'))
                db.createObjectStore('videos',  { keyPath: 'id'  });
            if (!db.objectStoreNames.contains('courses'))
                db.createObjectStore('courses', { keyPath: '_id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

async function _dbPut(store, record) {
    const db = await _openDB();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(record);
    return new Promise((res, rej) => { tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); });
}

async function _dbGet(store, key) {
    const db  = await _openDB();
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    return new Promise((res, rej) => { req.onsuccess = () => res(req.result || null); req.onerror = () => rej(req.error); });
}

async function _dbDelete(store, key) {
    const db = await _openDB();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    return new Promise((res, rej) => { tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); });
}

// ── Extract YouTube video ID ──────────────────────────────────────────────────
function _extractYTId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];
    for (const re of patterns) {
        const m = url.match(re);
        if (m) return m[1];
    }
    return null;
}

// ── Build safe embed URL ──────────────────────────────────────────────────────
function _buildEmbedUrl(videoId, autoplay) {
    const origin = encodeURIComponent(window.location.origin);
    return `https://www.youtube.com/embed/${videoId}` +
           `?rel=0&modestbranding=1&disablekb=1&fs=0` +
           `&iv_load_policy=3&origin=${origin}&enablejsapi=1` +
           (autoplay ? '&autoplay=1' : '');
}

// ── Watermark position pool ───────────────────────────────────────────────────
const _WM_POSITIONS = [
    { top: '8%',  left: '5%'  },
    { top: '8%',  left: '60%' },
    { top: '30%', left: '40%' },
    { top: '55%', left: '10%' },
    { top: '55%', left: '65%' },
    { top: '78%', left: '30%' },
];

// ── Global screen-capture shield listeners (installed once) ───────────────────
let _shieldInstalled = false;
let _activeShield    = null;

function _installScreenShield() {
    if (_shieldInstalled) return;
    _shieldInstalled = true;

    const activateShield = (msg) => {
        if (_activeShield) {
            clearTimeout(_activeShield._timer);
        } else {
            _activeShield = document.createElement('div');
            _activeShield.style.cssText = [
                'position:fixed','inset:0','z-index:99999',
                'background:rgba(0,0,0,0.97)',
                'display:flex','flex-direction:column',
                'align-items:center','justify-content:center',
                'color:white','font-family:sans-serif',
                'pointer-events:none','user-select:none',
            ].join(';');
            _activeShield.innerHTML = `
                <div style="font-size:2.5rem;margin-bottom:12px">⛔</div>
                <p style="font-weight:700;font-size:0.95rem;margin:0">Screen capture is not permitted.</p>
                <p id="_wm_txt" style="font-size:0.75rem;opacity:0.5;margin:6px 0 0;font-family:monospace"></p>
            `;
            document.body.appendChild(_activeShield);
        }

        // Show user identity in shield
        const wm = _activeShield.querySelector('#_wm_txt');
        if (wm) wm.textContent = msg || '';

        _activeShield._timer = setTimeout(() => {
            _activeShield?.remove();
            _activeShield = null;
        }, 3000);
    };

    // PrintScreen + Mac screenshot combos
    document.addEventListener('keydown', (e) => {
        const isPrint = e.key === 'PrintScreen';
        const isMac   = e.metaKey && e.shiftKey && ['3','4','5'].includes(e.key);
        const isWin   = e.metaKey && e.shiftKey && e.key === 's';
        if (isPrint || isMac || isWin) {
            e.preventDefault();
            const u = _getCurrentUser();
            activateShield(u);
        }
    }, true);

    // Visibility-change heuristic
    let _lastHidden = 0;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            _lastHidden = Date.now();
        } else {
            const elapsed = Date.now() - _lastHidden;
            if (elapsed > 0 && elapsed < 800) {
                const u = _getCurrentUser();
                activateShield(u);
            }
        }
    });
}

function _getCurrentUser() {
    try {
        const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return [u.fullName, u.phoneNumber || u.email].filter(Boolean).join(' | ') || 'Alpha Freshman Tutorial';
    } catch {
        return 'Alpha Freshman Tutorial';
    }
}

// ── Main builder ──────────────────────────────────────────────────────────────
/**
 * Renders a secure video player into `container`.
 *
 * @param {object} lesson    - { title, videoUrl, _id, duration }
 * @param {object} user      - currentUser from localStorage (can be null)
 * @param {Element} container - DOM element to inject into
 * @param {object} [opts]    - { autoplay: bool, allowOffline: bool }
 */
async function buildSecurePlayer(lesson, user, container, opts = {}) {
    const { autoplay = false, allowOffline = true } = opts;

    if (!container) return;

    // Compute watermark text
    const wmText = user
        ? [user.fullName, user.phoneNumber || user.email].filter(Boolean).join(' | ') || 'Alpha Freshman Tutorial'
        : 'Alpha Freshman Tutorial';

    const videoUrl = lesson?.videoUrl || '';
    const ytId     = _extractYTId(videoUrl);
    const lessonId = lesson?._id || lesson?.title || 'unknown';

    if (!videoUrl || !ytId) {
        container.innerHTML = `
            <div style="background:#1e293b;border-radius:16px;padding:3rem;text-align:center;color:#94a3b8;font-family:sans-serif">
                📄 No video for this lesson.
            </div>`;
        return;
    }

    // Check if already saved offline
    let isSaved = false;
    try { isSaved = !!(await _dbGet('videos', lessonId)); } catch {}

    const embedUrl = _buildEmbedUrl(ytId, autoplay);

    // ── Inject HTML ───────────────────────────────────────────────────────────
    container.innerHTML = `
    <div id="svp-root" style="position:relative;width:100%;background:#000;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5)">

        <!-- 16:9 ratio wrapper -->
        <div style="position:relative;padding-bottom:56.25%;overflow:hidden">

            <!-- YouTube embed — ID not exposed as plain text in DOM -->
            <iframe
                id="svp-iframe"
                src="${embedUrl}"
                title="${_escHtml(lesson.title || 'Lesson')}"
                style="position:absolute;inset:0;width:100%;height:100%;border:none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowfullscreen="false"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                loading="lazy"
            ></iframe>

            <!-- Drifting watermark -->
            <div id="svp-wm-drift"
                style="position:absolute;pointer-events:none;user-select:none;z-index:20;transition:top 1.2s ease-in-out,left 1.2s ease-in-out">
                <span style="color:rgba(255,255,255,0.22);font-size:11px;font-family:monospace;font-weight:700;
                    letter-spacing:2px;text-shadow:0 1px 4px rgba(0,0,0,0.9);white-space:nowrap">
                    ${_escHtml(wmText)}
                </span>
            </div>

            <!-- Fixed corner watermarks -->
            <div style="position:absolute;top:4px;left:4px;pointer-events:none;user-select:none;z-index:20">
                <span style="color:rgba(255,255,255,0.10);font-size:9px;font-family:monospace;white-space:nowrap">${_escHtml(wmText)}</span>
            </div>
            <div style="position:absolute;top:4px;right:4px;pointer-events:none;user-select:none;z-index:20">
                <span style="color:rgba(255,255,255,0.10);font-size:9px;font-family:monospace;white-space:nowrap">${_escHtml(wmText)}</span>
            </div>
            <div style="position:absolute;bottom:4px;left:4px;pointer-events:none;user-select:none;z-index:20">
                <span style="color:rgba(255,255,255,0.10);font-size:9px;font-family:monospace;white-space:nowrap">${_escHtml(wmText)}</span>
            </div>
            <div style="position:absolute;bottom:4px;right:4px;pointer-events:none;user-select:none;z-index:20">
                <span style="color:rgba(255,255,255,0.10);font-size:9px;font-family:monospace;white-space:nowrap">${_escHtml(wmText)}</span>
            </div>

            <!-- Diagonal ghost watermark (shows in screen recordings) -->
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                pointer-events:none;user-select:none;z-index:10;overflow:hidden;transform:rotate(-25deg)">
                <span style="color:rgba(255,255,255,0.04);font-size:clamp(10px,2.5vw,20px);font-weight:700;
                    letter-spacing:4px;white-space:nowrap">
                    ${_escHtml(wmText)}&nbsp;&nbsp;${_escHtml(wmText)}
                </span>
            </div>

            <!-- YouTube title-bar click blocker -->
            <div id="svp-ytblock"
                style="position:absolute;top:0;left:0;right:0;height:44px;z-index:10;cursor:default"></div>
        </div>

        <!-- Footer bar -->
        <div style="background:#0f172a;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
                <p style="margin:0;color:#fff;font-size:11px;font-weight:600;font-family:sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    ${_escHtml(lesson.title || '')}
                </p>
            </div>
            ${allowOffline ? `
            <div id="svp-dl-area" style="display:flex;align-items:center;gap:8px;flex-shrink:0">
                ${isSaved
                    ? `<button id="svp-rm-btn" style="${_btnStyle('#ef4444','rgba(239,68,68,0.15)')}">🗑️ Remove Offline</button>`
                    : `<button id="svp-dl-btn" style="${_btnStyle('#9333ea','rgba(147,51,234,0.8)')}">💾 Save Offline</button>`
                }
            </div>` : ''}
            <div style="flex-shrink:0">
                <span style="color:#334155;font-size:9px;font-family:monospace;user-select:none">${_escHtml(wmText)}</span>
            </div>
        </div>

        <!-- Progress bar (hidden by default) -->
        <div id="svp-prog-wrap" style="display:none;background:#0f172a;padding:0 14px 8px">
            <div style="height:4px;background:#1e293b;border-radius:4px;overflow:hidden">
                <div id="svp-prog-bar" style="height:100%;width:0%;background:#3b82f6;border-radius:4px;transition:width 0.3s"></div>
            </div>
            <p id="svp-prog-txt" style="margin:4px 0 0;color:#64748b;font-size:10px;font-family:sans-serif">Saving…</p>
        </div>

        <!-- Toast -->
        <div id="svp-toast" style="display:none;position:absolute;top:10px;left:50%;transform:translateX(-50%);
            padding:7px 16px;border-radius:12px;font-size:11px;font-weight:700;color:#fff;
            font-family:sans-serif;white-space:nowrap;z-index:50;pointer-events:none"></div>
    </div>`;

    // ── Disable right-click ───────────────────────────────────────────────────
    const root = document.getElementById('svp-root');
    root.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
    document.getElementById('svp-ytblock')?.addEventListener('click', (e) => e.preventDefault());

    // ── Start drifting watermark ──────────────────────────────────────────────
    let wmIdx = 0;
    const wmEl = document.getElementById('svp-wm-drift');
    const _moveWm = () => {
        wmIdx = (wmIdx + 1) % _WM_POSITIONS.length;
        const p = _WM_POSITIONS[wmIdx];
        if (wmEl) { wmEl.style.top = p.top; wmEl.style.left = p.left; }
    };
    _moveWm();
    const wmTimer = setInterval(_moveWm, 4000);
    // Stop timer if container is removed
    new MutationObserver((_, obs) => {
        if (!document.contains(root)) { clearInterval(wmTimer); obs.disconnect(); }
    }).observe(document.body, { childList: true, subtree: true });

    // ── Install screen shield (once per page) ─────────────────────────────────
    _installScreenShield();

    // ── Offline download logic ────────────────────────────────────────────────
    if (allowOffline) {
        const dlArea   = document.getElementById('svp-dl-area');
        const progWrap = document.getElementById('svp-prog-wrap');
        const progBar  = document.getElementById('svp-prog-bar');
        const progTxt  = document.getElementById('svp-prog-txt');

        const showToast = (msg, color = '#16a34a') => {
            const t = document.getElementById('svp-toast');
            if (!t) return;
            t.textContent = msg;
            t.style.background = color;
            t.style.display = 'block';
            setTimeout(() => { if (t) t.style.display = 'none'; }, 3500);
        };

        const renderDlArea = (saved) => {
            if (!dlArea) return;
            dlArea.innerHTML = saved
                ? `<button id="svp-rm-btn" style="${_btnStyle('#ef4444','rgba(239,68,68,0.15)')}">🗑️ Remove Offline</button>`
                : `<button id="svp-dl-btn" style="${_btnStyle('#9333ea','rgba(147,51,234,0.8)')}">💾 Save Offline</button>`;
            bindDlButtons(saved);
        };

        const bindDlButtons = (saved) => {
            document.getElementById('svp-dl-btn')?.addEventListener('click', async () => {
                if (progWrap) progWrap.style.display = 'block';

                let prog = 0;
                const timer = setInterval(() => {
                    prog = Math.min(prog + Math.floor(Math.random() * 18) + 8, 88);
                    if (progBar) progBar.style.width = prog + '%';
                    if (progTxt) progTxt.textContent = `Saving… ${prog}%`;
                }, 280);

                try {
                    await _dbPut('videos', {
                        id:        lessonId,
                        title:     lesson.title,
                        course:    lesson.course || '',
                        youtubeId: ytId,
                        thumbnail: lesson.thumbnail || '🎬',
                        savedBy:   user?._id || user?.uid || 'guest',
                        savedAt:   Date.now(),
                        secure:    true,
                    });
                    clearInterval(timer);
                    if (progBar) progBar.style.width = '100%';
                    if (progTxt) progTxt.textContent = 'Saved!';
                    setTimeout(() => { if (progWrap) progWrap.style.display = 'none'; }, 1000);
                    showToast('✅ Saved for offline viewing');
                    renderDlArea(true);
                } catch (err) {
                    clearInterval(timer);
                    if (progWrap) progWrap.style.display = 'none';
                    showToast('❌ Save failed: ' + err.message, '#dc2626');
                }
            });

            document.getElementById('svp-rm-btn')?.addEventListener('click', async () => {
                try {
                    await _dbDelete('videos', lessonId);
                    showToast('🗑️ Removed from offline storage');
                    renderDlArea(false);
                } catch {}
            });
        };

        bindDlButtons(isSaved);
    }
}

// ── HTML escape helper ────────────────────────────────────────────────────────
function _escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ── Button style helper ───────────────────────────────────────────────────────
function _btnStyle(textColor, bg) {
    return [
        `background:${bg}`,
        `color:${textColor}`,
        'border:none',
        'border-radius:10px',
        'padding:5px 12px',
        'font-size:11px',
        'font-weight:700',
        'font-family:sans-serif',
        'cursor:pointer',
        'white-space:nowrap',
    ].join(';');
}

// ── Export ────────────────────────────────────────────────────────────────────
// Works as ES module (Vite) or plain script global
if (typeof module !== 'undefined') {
    module.exports = { buildSecurePlayer };
} else {
    window.buildSecurePlayer = buildSecurePlayer;
}
