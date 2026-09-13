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

// ── Extract Google Drive file ID ──────────────────────────────────────────────
function _extractDriveId(url) {
    if (!url) return null;
    const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    return null;
}

// ── Build safe embed URL ──────────────────────────────────────────────────────
function _buildEmbedUrl(videoId, autoplay) {
    const origin = encodeURIComponent(window.location.origin);
    return `https://www.youtube.com/embed/${videoId}` +
           `?controls=1` +           // Show pause/play/scrub/quality/speed controls
           `&fs=1` +                  // Allow fullscreen
           `&rel=0` +                 // No related videos from other channels
           `&modestbranding=1` +      // Minimal YouTube branding
           `&enablejsapi=1` +         // JS API for watermark interactions
           `&origin=${origin}` +      // Security origin
           `&playsinline=1` +         // Mobile inline play
           `&iv_load_policy=3` +      // No annotations
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

    // ── Detect Google Drive video ─────────────────────────────────────────────
    const isDriveVideo = videoUrl.includes('drive.google.com');
    const driveFileId  = isDriveVideo ? _extractDriveId(videoUrl) : null;

    if (!videoUrl || (!ytId && !isDriveVideo)) {
        container.innerHTML = `
            <div style="background:#1e293b;border-radius:16px;padding:3rem;text-align:center;color:#94a3b8;font-family:sans-serif">
                📄 No video for this lesson.
            </div>`;
        return;
    }

    // Check if already saved offline (YouTube only)
    let isSaved = false;
    if (ytId) {
        try { isSaved = !!(await _dbGet('videos', lessonId)); } catch {}
    }

    const embedUrl = isDriveVideo
        ? `https://drive.google.com/file/d/${driveFileId}/preview`
        : _buildEmbedUrl(ytId, autoplay);

    // ── Inject HTML ───────────────────────────────────────────────────────────
    container.innerHTML = `
    <div id="svp-root" style="position:relative;width:100%;background:#000;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5)">

        <!-- 16:9 ratio wrapper -->
        <div style="position:relative;padding-bottom:56.25%;overflow:hidden">

            <!-- Video embed (YouTube or Google Drive) — ID not exposed as plain text in DOM -->
            <iframe
                id="svp-iframe"
                src="${embedUrl}"
                title="${_escHtml(lesson.title || 'Lesson')}"
                style="position:absolute;inset:0;width:100%;height:100%;border:none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen="${isDriveVideo ? 'true' : 'false'}"
                sandbox="${isDriveVideo
                    ? 'allow-scripts allow-same-origin allow-popups allow-forms'
                    : 'allow-scripts allow-same-origin allow-presentation'}"
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

            <!-- YouTube title-bar click blocker (skipped for Drive) -->
            ${!isDriveVideo ? `<div id="svp-ytblock"
                style="position:absolute;top:0;left:0;right:0;height:44px;z-index:10;cursor:default"></div>` : ''}
        </div>

        <!-- Footer bar -->
        <div style="background:#0f172a;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
                <p style="margin:0;color:#fff;font-size:11px;font-weight:600;font-family:sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    ${_escHtml(lesson.title || '')}
                    ${isDriveVideo ? '<span style="margin-left:8px;padding:2px 8px;background:rgba(16,185,129,0.2);color:#10b981;border-radius:6px;font-size:9px;font-weight:700">☁️ Drive Video</span>' : ''}
                </p>
            </div>
            ${allowOffline && !isDriveVideo ? `
            <div id="svp-dl-area" style="display:flex;align-items:center;gap:8px;flex-shrink:0">
                ${isSaved
                    ? `<button id="svp-rm-btn" style="${_btnStyle('#ef4444','rgba(239,68,68,0.15)')}">🗑️ Remove Offline</button>`
                    : `<button id="svp-dl-btn" style="${_btnStyle('#9333ea','rgba(147,51,234,0.8)')}">💾 Save Offline</button>`
                }
            </div>` : isDriveVideo ? `
            <div style="flex-shrink:0">
                <span style="color:#10b981;font-size:10px;font-family:sans-serif">☁️ Google Drive ቪዲዮ</span>
            </div>` : ''}
            <div style="flex-shrink:0">
                <span style="color:#334155;font-size:9px;font-family:monospace;user-select:none">${_escHtml(wmText)}</span>
            </div>
        </div>

        <!-- Quality / Speed hint -->
        <div style="background:#0a0f1e;padding:5px 14px;display:flex;align-items:center;justify-content:flex-end">
            <span style="color:#64748b;font-size:10px;font-family:sans-serif">
                ${isDriveVideo
                    ? '☁️ Google Drive ቪዲዮ — "Anyone with link" ማድረግ አለቦት'
                    : '⚙️ Setting ላይ በመንካት <strong style="color:#94a3b8">Quality</strong> እና <strong style="color:#94a3b8">Speed</strong> ማስተካከል ይቻላል'
                }
            </span>
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

    // ── Offline download logic (YouTube only — Drive CORS blocks blob fetch) ──
    if (allowOffline && !isDriveVideo) {
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

// ══════════════════════════════════════════════════════════════════════════════
// SecureCourseAppDB  — matches React: new Dexie('SecureCourseAppDB')
// Stores real video/PDF blobs with keyPath:'id'
// ══════════════════════════════════════════════════════════════════════════════
const _SECURE_DB_NAME = 'SecureCourseAppDB';
let   _secureDb       = null;

function _openSecureDB() {
    if (_secureDb) return Promise.resolve(_secureDb);
    return new Promise((res, rej) => {
        const req = indexedDB.open(_SECURE_DB_NAME, 1);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('secureFiles'))
                db.createObjectStore('secureFiles', { keyPath: 'id' });
        };
        req.onsuccess = () => { _secureDb = req.result; res(_secureDb); };
        req.onerror   = () => rej(req.error);
    });
}
async function _sdbGet(id)      { const db=await _openSecureDB(); return new Promise((r,j)=>{ const q=db.transaction('secureFiles','readonly').objectStore('secureFiles').get(id); q.onsuccess=()=>r(q.result||null); q.onerror=()=>j(q.error); }); }
async function _sdbPut(rec)     { const db=await _openSecureDB(); const tx=db.transaction('secureFiles','readwrite'); tx.objectStore('secureFiles').put(rec); return new Promise((r,j)=>{ tx.oncomplete=()=>r(true); tx.onerror=()=>j(tx.error); }); }
async function _sdbDelete(id)   { const db=await _openSecureDB(); const tx=db.transaction('secureFiles','readwrite'); tx.objectStore('secureFiles').delete(id); return new Promise((r,j)=>{ tx.oncomplete=()=>r(true); tx.onerror=()=>j(tx.error); }); }
async function _sdbGetAll()     { const db=await _openSecureDB(); return new Promise((r,j)=>{ const q=db.transaction('secureFiles','readonly').objectStore('secureFiles').getAll(); q.onsuccess=()=>r(q.result||[]); q.onerror=()=>j(q.error); }); }

// ══════════════════════════════════════════════════════════════════════════════
// buildSecureVideoPlayer
// Vanilla-JS port of the React <SecureVideoPlayer> component.
// — Blob-first: loads from SecureCourseAppDB if offline copy exists
// — Falls back to Drive embed iframe (online)
// — Custom controls: Play/Pause · ±10s · Speed · Volume · Seek bar
// — Watermark overlay · right-click block · no-download attr
//
// Usage:
//   buildSecureVideoPlayer(driveFileId, title, currentUser, containerElement);
// ══════════════════════════════════════════════════════════════════════════════
async function buildSecureVideoPlayer(driveFileId, title, user, container) {
    if (!container || !driveFileId) return;

    const wmText = user
        ? ([user.fullName, user.phoneNumber || user.email].filter(Boolean).join(' | ') || 'Alpha Freshman Tutorial')
        : 'Alpha Freshman Tutorial';

    const saved   = await _sdbGet(driveFileId).catch(() => null);
    const blobUrl = (saved && saved.fileBlob) ? URL.createObjectURL(saved.fileBlob) : null;
    const offline = !!blobUrl;
    const embedUrl = `https://drive.google.com/file/d/${driveFileId}/preview`;

    container.innerHTML = `
<div id="scvp-root" style="max-width:800px;margin:0 auto;user-select:none;-webkit-user-select:none">

  <!-- Video area -->
  <div style="position:relative;background:#000;border-radius:12px;overflow:hidden">
    ${offline
        ? `<video id="scvp-video" src="${blobUrl}"
            style="width:100%;display:block;aspect-ratio:16/9;object-fit:contain"
            controlsList="nodownload noremoteplayback" disablepictureinpicture
            oncontextmenu="return false"></video>`
        : `<iframe src="${embedUrl}" id="scvp-iframe"
            style="width:100%;aspect-ratio:16/9;border:none;display:block"
            allow="autoplay" allowfullscreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>`
    }
    <!-- Watermark -->
    <div style="position:absolute;inset:0;pointer-events:none;user-select:none;z-index:20;overflow:hidden">
      <span style="position:absolute;top:10px;right:12px;color:rgba(255,255,255,0.28);
        font-size:11px;font-family:monospace;font-weight:700;
        text-shadow:0 1px 3px rgba(0,0,0,0.9)">${_escHtml(wmText)}</span>
      <span style="position:absolute;bottom:48px;left:12px;color:rgba(255,255,255,0.12);
        font-size:9px;font-family:monospace">${_escHtml(wmText)}</span>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        transform:rotate(-25deg);overflow:hidden">
        <span style="color:rgba(255,255,255,0.04);font-size:clamp(10px,2vw,18px);font-weight:700;
          letter-spacing:4px;white-space:nowrap;font-family:monospace">
          ${_escHtml(wmText)}&nbsp;&nbsp;${_escHtml(wmText)}
        </span>
      </div>
    </div>
  </div>

  ${offline ? `
  <!-- Custom controls (blob mode) -->
  <div style="background:#1e293b;padding:10px 14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <button id="scvp-play-btn" onclick="scvpPlay()"
      style="padding:6px 14px;background:#4f46e5;color:#fff;border:none;border-radius:8px;
      font-size:12px;font-weight:700;cursor:pointer">▶ Play</button>
    <button onclick="scvpSeek(-10)"
      style="padding:6px 11px;background:#334155;color:#fff;border:none;border-radius:8px;
      font-size:12px;cursor:pointer">⏪ -10s</button>
    <button onclick="scvpSeek(10)"
      style="padding:6px 11px;background:#334155;color:#fff;border:none;border-radius:8px;
      font-size:12px;cursor:pointer">+10s ⏩</button>
    <label style="font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:4px">Speed:
      <select id="scvp-speed" onchange="scvpSpeed(this.value)"
        style="background:#334155;color:#fff;border:none;border-radius:6px;padding:3px 6px;font-size:11px">
        <option value="0.5">0.5×</option>
        <option value="0.75">0.75×</option>
        <option value="1" selected>1.0×</option>
        <option value="1.25">1.25×</option>
        <option value="1.5">1.5×</option>
        <option value="2">2.0×</option>
      </select>
    </label>
    <label style="font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:4px">🔊
      <input type="range" id="scvp-vol" min="0" max="1" step="0.05" value="1"
        oninput="scvpVolume(this.value)"
        style="width:65px;accent-color:#4f46e5">
    </label>
    <span id="scvp-time" style="font-size:11px;color:#64748b;margin-left:auto;font-family:monospace">0:00 / 0:00</span>
  </div>
  <!-- Seek bar -->
  <div style="background:#0f172a;padding:4px 14px 8px">
    <input type="range" id="scvp-seek" min="0" max="100" step="0.1" value="0"
      oninput="scvpScrub(this.value)"
      style="width:100%;accent-color:#4f46e5;cursor:pointer">
  </div>` : `
  <!-- Online fallback notice -->
  <div style="background:#0f172a;padding:8px 14px;border-radius:0 0 12px 12px;
    font-size:11px;color:#64748b;text-align:center">
    ☁️ Drive ቪዲዮ — ኢንተርኔት ያስፈልጋል · ለ offline አውርዱ ↓
  </div>`}

  <!-- Download / status row -->
  <div id="scvp-dl-row" style="display:flex;align-items:center;justify-content:space-between;
    padding:10px 0;gap:10px;flex-wrap:wrap">
    ${offline
        ? `<span style="color:#10b981;font-size:12px;font-weight:700">✓ Offline ዝግጁ ነው</span>
           <button onclick="scvpRemove('${driveFileId}',this)"
             style="padding:6px 14px;background:rgba(239,68,68,0.1);color:#f87171;
             border:1px solid rgba(239,68,68,0.3);border-radius:8px;font-size:11px;
             font-weight:700;cursor:pointer">🗑️ Remove Offline</button>`
        : `<span style="color:#94a3b8;font-size:12px">ያለ ኢንተርኔት ለማየት አውርዱ</span>
           <button id="scvp-dl-btn" onclick="scvpDownload('${driveFileId}','${_escHtml(title)}')"
             style="padding:8px 18px;background:linear-gradient(135deg,#4f46e5,#7c3aed);
             color:#fff;border:none;border-radius:10px;font-size:12px;
             font-weight:700;cursor:pointer">💾 ለ Offline አውርድ</button>`
    }
  </div>
  <!-- Download progress -->
  <div id="scvp-prog-wrap" style="display:none">
    <div style="height:5px;background:#1e293b;border-radius:4px;overflow:hidden;margin-bottom:4px">
      <div id="scvp-prog-bar" style="height:100%;width:0;background:#4f46e5;transition:width 0.3s;border-radius:4px"></div>
    </div>
    <span id="scvp-prog-txt" style="font-size:11px;color:#64748b"></span>
  </div>
</div>`;

    // ── Wire video events ─────────────────────────────────────────────────────
    if (offline) {
        const vid  = document.getElementById('scvp-video');
        const seek = document.getElementById('scvp-seek');
        const time = document.getElementById('scvp-time');
        const fmt  = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

        vid.addEventListener('timeupdate', () => {
            if (seek && vid.duration) seek.value = (vid.currentTime / vid.duration) * 100;
            if (time) time.textContent = `${fmt(vid.currentTime)} / ${fmt(vid.duration||0)}`;
        });
        vid.addEventListener('play',  () => { const b=document.getElementById('scvp-play-btn'); if(b) b.textContent='⏸ Pause'; });
        vid.addEventListener('pause', () => { const b=document.getElementById('scvp-play-btn'); if(b) b.textContent='▶ Play'; });
        vid.addEventListener('contextmenu', e => e.preventDefault());
    }
    document.getElementById('scvp-root')?.addEventListener('contextmenu', e => e.preventDefault());

    // Apply diagonal red-stripe security watermark on the video container
    const scvpRoot = document.getElementById('scvp-root');
    if (scvpRoot) applySecurityWatermark(scvpRoot, user);
}

// ── scvp global handlers ──────────────────────────────────────────────────────
window.scvpPlay   = ()    => { const v=document.getElementById('scvp-video'); if(v){ v.paused?v.play():v.pause(); }};
window.scvpSeek   = (d)   => { const v=document.getElementById('scvp-video'); if(v) v.currentTime=Math.max(0,v.currentTime+d); };
window.scvpSpeed  = (s)   => { const v=document.getElementById('scvp-video'); if(v) v.playbackRate=parseFloat(s); };
window.scvpVolume = (s)   => { const v=document.getElementById('scvp-video'); if(v) v.volume=parseFloat(s); };
window.scvpScrub  = (val) => { const v=document.getElementById('scvp-video'); if(v&&v.duration) v.currentTime=(parseFloat(val)/100)*v.duration; };

window.scvpRemove = async (id, btn) => {
    if (!confirm('Offline ቅጂ ይሰረዝ?')) return;
    await _sdbDelete(id).catch(()=>{});
    if (typeof toast !== 'undefined') toast.success('🗑️ Removed from offline storage');
    const row = document.getElementById('scvp-dl-row');
    if (row) row.innerHTML = '<span style="color:#64748b;font-size:12px">Removed. Reload lesson.</span>';
};

window.scvpDownload = async (driveFileId, title) => {
    const btn  = document.getElementById('scvp-dl-btn');
    const wrap = document.getElementById('scvp-prog-wrap');
    const bar  = document.getElementById('scvp-prog-bar');
    const txt  = document.getElementById('scvp-prog-txt');

    if (btn)  { btn.disabled=true; btn.textContent='⏳ Downloading...'; }
    if (wrap) wrap.style.display='block';
    if (bar)  bar.style.width='15%';
    if (txt)  txt.textContent='Drive ጋር እየተገናኘ ነው...';

    try {
        // Use the /uc?export=download endpoint for actual blob download
        const directUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
        if (bar) bar.style.width='35%';
        if (txt) txt.textContent='Downloading video...';

        const response = await fetch(directUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        if (bar) bar.style.width='65%';
        if (txt) txt.textContent='Saving to secure storage...';

        const blob = await response.blob();

        await _sdbPut({
            id:          driveFileId,
            title:       title,
            fileType:    'video',
            fileBlob:    blob,
            downloadedAt: new Date()
        });

        if (bar) bar.style.width='100%';
        if (txt) txt.textContent='✅ Saved!';

        setTimeout(() => {
            if (typeof toast !== 'undefined') toast.success('✅ ቪዲዮው በምስጢር ተወርዷል! ያለ ኢንተርኔት ማየት ይቻላል።');
            // Swap download button to "Offline Ready"
            const row = document.getElementById('scvp-dl-row');
            if (row) row.innerHTML = `
                <span style="color:#10b981;font-size:12px;font-weight:700">✓ Offline ዝግጁ ነው</span>
                <button onclick="scvpRemove('${driveFileId}',this)"
                  style="padding:6px 14px;background:rgba(239,68,68,0.1);color:#f87171;
                  border:1px solid rgba(239,68,68,0.3);border-radius:8px;
                  font-size:11px;font-weight:700;cursor:pointer">🗑️ Remove Offline</button>`;
            if (wrap) wrap.style.display='none';
        }, 800);

    } catch (err) {
        console.error('[scvpDownload]', err);
        if (txt) txt.textContent = '❌ Download failed: ' + err.message;
        if (bar) { bar.style.width='100%'; bar.style.background='#ef4444'; }
        if (btn) { btn.disabled=false; btn.textContent='🔄 Retry'; }
        if (typeof toast !== 'undefined')
            toast.error('ቪዲዮ ማውረድ አልተቻለም — Drive "Anyone with link" ማድረጉን ያረጋግጡ።');
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// buildSecureDocViewer — v2 with Google Docs Viewer + diagonal watermark
// ══════════════════════════════════════════════════════════════════════════════
async function buildSecureDocViewer(driveFileId, title, container) {
    if (!container || !driveFileId) return;

    const user    = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const saved   = await _sdbGet(driveFileId).catch(() => null);
    const blobUrl = (saved && saved.fileBlob) ? URL.createObjectURL(saved.fileBlob) : null;
    const offline = !!blobUrl;

    // Google Docs Viewer works for PDFs served from Drive
    const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
    const docsViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(directDownloadUrl)}&embedded=true`;
    const viewUrl = offline ? blobUrl : docsViewerUrl;

    container.innerHTML = `
<div id="scdv-root" style="border:1px solid var(--border-color,#334155);border-radius:12px;
    overflow:hidden;user-select:none;-webkit-user-select:none;position:relative">
  <div style="background:#0f172a;padding:10px 16px;display:flex;
    align-items:center;justify-content:space-between">
    <h4 style="margin:0;color:white;font-size:0.88rem;font-weight:700">
      📄 ${_escHtml(title)}
    </h4>
    ${offline
        ? '<span style="color:#10b981;font-size:11px;font-weight:700">✓ Offline</span>'
        : '<span style="color:#64748b;font-size:11px">☁️ Online</span>'}
  </div>

  <div style="position:relative">
    <iframe src="${viewUrl}"
      style="width:100%;height:520px;border:none;display:block"
      oncontextmenu="return false"
      title="${_escHtml(title)}">
    </iframe>
    <!-- Red stripe diagonal watermark overlay over the doc -->
    <div id="scdv-wm" style="
      position:absolute;top:0;left:0;width:100%;height:100%;
      pointer-events:none;opacity:0.18;
      background:repeating-linear-gradient(-45deg,transparent,transparent 100px,rgba(255,0,0,0.08) 100px,rgba(255,0,0,0.08) 200px);
      display:flex;flex-direction:column;justify-content:center;align-items:center;
      font-weight:bold;color:#cc0000;font-size:13px;z-index:10;
      user-select:none;text-align:center;white-space:pre-line;
      text-shadow:0 1px 3px rgba(0,0,0,0.5);font-family:monospace;
    ">${_escHtml(user ? (user.fullName || '') + (user.email ? '\n(' + user.email + ')' : user.phoneNumber ? '\n(' + user.phoneNumber + ')' : '') : 'CONFIDENTIAL')}\nUNAUTHORIZED RECORDING PROHIBITED</div>
  </div>

  <div style="background:#0f172a;padding:10px 16px;display:flex;
    align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
    ${offline
        ? `<span style="color:#10b981;font-size:12px;font-weight:700">✓ Offline ዝግጁ ነው</span>
           <button onclick="scdvRemove('${driveFileId}')"
             style="padding:6px 14px;background:rgba(239,68,68,0.1);color:#f87171;
             border:1px solid rgba(239,68,68,0.3);border-radius:8px;
             font-size:11px;font-weight:700;cursor:pointer">🗑️ Remove Offline</button>`
        : `<span style="color:#94a3b8;font-size:12px">ፋይሉን ያለ ኢንተርኔት ለማየት አውርዱ</span>
           <button id="scdv-dl-btn" onclick="scdvDownload('${driveFileId}','${_escHtml(title)}')"
             style="padding:8px 18px;background:linear-gradient(135deg,#0891b2,#0e7490);
             color:#fff;border:none;border-radius:10px;font-size:12px;
             font-weight:700;cursor:pointer">📥 ፋይሉን አውርድ (Offline)</button>`
    }
  </div>
  <div id="scdv-prog-wrap" style="display:none;padding:6px 16px 10px;background:#0f172a">
    <div style="height:4px;background:#1e293b;border-radius:4px;overflow:hidden;margin-bottom:4px">
      <div id="scdv-prog-bar" style="height:100%;width:0;background:#0891b2;transition:width 0.3s;border-radius:4px"></div>
    </div>
    <span id="scdv-prog-txt" style="font-size:11px;color:#64748b"></span>
  </div>
</div>`;

    document.getElementById('scdv-root')?.addEventListener('contextmenu', e => e.preventDefault());
}

// ── scdv global handlers ──────────────────────────────────────────────────────
window.scdvRemove = async (id) => {
    if (!confirm('Offline ፋይሉ ይሰረዝ?')) return;
    await _sdbDelete(id).catch(()=>{});
    if (typeof toast !== 'undefined') toast.success('🗑️ Document removed from offline storage');
};

window.scdvDownload = async (driveFileId, title) => {
    const btn  = document.getElementById('scdv-dl-btn');
    const wrap = document.getElementById('scdv-prog-wrap');
    const bar  = document.getElementById('scdv-prog-bar');
    const txt  = document.getElementById('scdv-prog-txt');

    if (btn)  { btn.disabled=true; btn.textContent='⏳ Downloading...'; }
    if (wrap) wrap.style.display='block';
    if (bar)  bar.style.width='20%';
    if (txt)  txt.textContent='ፋይሉን እያወረደ ነው...';

    try {
        const res = await fetch(`https://drive.google.com/uc?export=download&id=${driveFileId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (bar) bar.style.width='65%';
        const blob = await res.blob();
        await _sdbPut({ id: driveFileId, title, fileType: 'document', fileBlob: blob, downloadedAt: new Date() });
        if (bar) bar.style.width='100%';
        if (txt) txt.textContent='✅ Saved!';
        setTimeout(() => {
            if (typeof toast !== 'undefined') toast.success('✅ ፋይሉ በአፕሊኬሽኑ ውስጥ ተቀምጧል!');
            if (wrap) wrap.style.display='none';
            // Refresh viewer with blob
            const frame = document.querySelector('#scdv-root iframe');
            if (frame) {
                const url = URL.createObjectURL(blob);
                frame.src = url;
            }
        }, 600);
    } catch (err) {
        if (txt) txt.textContent = '❌ ' + err.message;
        if (btn) { btn.disabled=false; btn.textContent='🔄 Retry'; }
        if (typeof toast !== 'undefined')
            toast.error('ፋይሉን ማውረድ አልተቻለም — Drive access ክፍት ይሁን።');
    }
};

// ── Expose new functions globally ─────────────────────────────────────────────
window.buildSecureVideoPlayer = buildSecureVideoPlayer;
window.buildSecureDocViewer   = buildSecureDocViewer;
window._sdbGetAll             = _sdbGetAll;   // used by offline.html
window._sdbDelete             = _sdbDelete;   // used by offline.html

// ══════════════════════════════════════════════════════════════════════════════
// applySecurityWatermark — Enhanced diagonal red-stripe pattern watermark
// Matches the React version: repeating-linear-gradient background + name text
// Can be called on any container element (video wrapper, doc viewer, etc.)
//
// Usage: applySecurityWatermark(containerElement, currentUser)
// ══════════════════════════════════════════════════════════════════════════════
function applySecurityWatermark(container, user) {
    // Remove any existing watermark first
    const existing = container.querySelector('.alpha-security-watermark');
    if (existing) existing.remove();

    const studentInfo = user
        ? `${user.fullName || ''}${user.email ? ' (' + user.email + ')' : user.phoneNumber ? ' (' + user.phoneNumber + ')' : ''}`
        : 'CONFIDENTIAL CONTENT';

    const wm = document.createElement('div');
    wm.className = 'alpha-security-watermark';
    wm.style.cssText = [
        'position:absolute',
        'top:0', 'left:0',
        'width:100%', 'height:100%',
        'pointer-events:none',
        'opacity:0.22',
        // Diagonal red stripe pattern — visible even in screen recordings
        'background:repeating-linear-gradient(-45deg,transparent,transparent 120px,rgba(255,0,0,0.1) 120px,rgba(255,0,0,0.1) 240px)',
        'display:flex',
        'flex-direction:column',
        'justify-content:center',
        'align-items:center',
        'font-weight:bold',
        'color:#ff2222',
        'font-size:14px',
        'z-index:9999',
        'user-select:none',
        '-webkit-user-select:none',
        'text-align:center',
        'white-space:pre-line',
        'text-shadow:0 1px 3px rgba(0,0,0,0.8)',
        'font-family:monospace',
        'letter-spacing:1px',
    ].join(';');

    wm.textContent = `${studentInfo}\nUNAUTHORIZED RECORDING IS PROHIBITED`;

    // Ensure container has relative positioning
    const pos = window.getComputedStyle(container).position;
    if (pos === 'static') container.style.position = 'relative';
    container.appendChild(wm);
}

// Expose globally
window.applySecurityWatermark = applySecurityWatermark;
