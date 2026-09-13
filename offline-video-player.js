// ─── OfflineVideoPlayer (Vanilla JS) ─────────────────────────────────────────
// Reads YouTube video metadata saved in AlphaOfflineDB → IndexedDB
// Renders a secure YouTube embed (no raw blob — YouTube CORS prevents that)
// Also handles: watermark, no-download, no-right-click
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

/**
 * Render an offline-aware video player into a container element.
 *
 * @param {string}  lessonId   - The lesson ID used as IndexedDB key
 * @param {Element} container  - DOM element to inject the player into
 * @param {object}  [opts]     - { fallbackUrl, lessonTitle }
 */
async function renderOfflineVideoPlayer(lessonId, container, opts = {}) {
    if (!container) return;

    const user = _getUser();
    const wmText = user
        ? [user.fullName, user.phoneNumber || user.email].filter(Boolean).join(' | ') || 'Alpha Freshman Tutorial'
        : 'Alpha Freshman Tutorial';

    // ── Try to load from IndexedDB first ─────────────────────────────────────
    let record = null;
    try {
        const db = await _openOfflineDB();
        record   = await _dbGet(db, 'videos', lessonId);
    } catch (_) {}

    const youtubeId = record?.youtubeId || _extractYTId(opts.fallbackUrl || '');

    // ── STATE: Not saved offline + no fallback URL ────────────────────────────
    if (!youtubeId) {
        container.innerHTML = `
            <div style="background:#1e293b;border-radius:16px;padding:3rem;
                text-align:center;color:#94a3b8;font-family:sans-serif">
                <div style="font-size:2.5rem;margin-bottom:12px">📵</div>
                <p style="font-weight:600;font-size:0.95rem;color:#f59e0b;margin:0 0 6px">
                    ይህ ቪዲዮ ገና አልወረደም
                </p>
                <p style="font-size:0.82rem;margin:0;opacity:0.7">
                    ኢንተርኔት ሲኖርዎ "💾 Save Offline" ይጫኑ፣ ከዚያ offline ማየት ይቻላል።
                </p>
            </div>`;
        return;
    }

    // ── Build secure embed URL ────────────────────────────────────────────────
    const origin    = encodeURIComponent(window.location.origin);
    const embedUrl  = `https://www.youtube.com/embed/${youtubeId}` +
        `?controls=1` +          // Show pause/play/scrub/quality/speed
        `&fs=1` +                 // Allow fullscreen
        `&rel=0` +                // No unrelated recommendations
        `&modestbranding=1` +     // Minimal branding
        `&enablejsapi=1` +        // JS API
        `&origin=${origin}` +     // Security
        `&playsinline=1` +        // Mobile inline
        `&iv_load_policy=3`;      // No annotations

    const savedAt = record?.savedAt
        ? new Date(record.savedAt).toLocaleDateString('am-ET')
        : '';

    const isOnline = navigator.onLine;
    const statusBadge = record
        ? `<span style="background:rgba(39,174,96,0.15);color:#27ae60;padding:3px 10px;
            border-radius:12px;font-size:11px;font-weight:700">
            ✅ Saved Offline${savedAt ? ' · ' + savedAt : ''}
           </span>`
        : `<span style="background:rgba(243,156,18,0.15);color:#b7770d;padding:3px 10px;
            border-radius:12px;font-size:11px;font-weight:700">
            🌐 Streaming
           </span>`;

    // ── Inject HTML ───────────────────────────────────────────────────────────
    container.innerHTML = `
    <div id="ovp-root" style="position:relative;width:100%;background:#000;
        border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5)">

        <!-- 16:9 wrapper -->
        <div style="position:relative;padding-bottom:56.25%;overflow:hidden">

            <!-- YouTube embed -->
            <iframe
                id="ovp-iframe"
                src="${embedUrl}"
                title="${_esc(opts.lessonTitle || 'Lesson Video')}"
                style="position:absolute;inset:0;width:100%;height:100%;border:none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowfullscreen="false"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                loading="lazy"
            ></iframe>

            <!-- Drifting watermark -->
            <div id="ovp-wm"
                style="position:absolute;pointer-events:none;user-select:none;
                    z-index:20;top:8%;left:5%;
                    transition:top 1.2s ease-in-out,left 1.2s ease-in-out">
                <span style="color:rgba(255,255,255,0.22);font-size:11px;font-family:monospace;
                    font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,0.9);white-space:nowrap">
                    ${_esc(wmText)}
                </span>
            </div>

            <!-- Corner watermarks -->
            <div style="position:absolute;top:4px;left:4px;pointer-events:none;user-select:none;z-index:20">
                <span style="color:rgba(255,255,255,0.10);font-size:9px;font-family:monospace">${_esc(wmText)}</span>
            </div>
            <div style="position:absolute;top:4px;right:4px;pointer-events:none;user-select:none;z-index:20">
                <span style="color:rgba(255,255,255,0.10);font-size:9px;font-family:monospace">${_esc(wmText)}</span>
            </div>
            <div style="position:absolute;bottom:4px;left:4px;pointer-events:none;user-select:none;z-index:20">
                <span style="color:rgba(255,255,255,0.10);font-size:9px;font-family:monospace">${_esc(wmText)}</span>
            </div>
            <div style="position:absolute;bottom:4px;right:4px;pointer-events:none;user-select:none;z-index:20">
                <span style="color:rgba(255,255,255,0.10);font-size:9px;font-family:monospace">${_esc(wmText)}</span>
            </div>

            <!-- Diagonal ghost watermark -->
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                pointer-events:none;user-select:none;z-index:10;overflow:hidden;transform:rotate(-25deg)">
                <span style="color:rgba(255,255,255,0.04);font-size:clamp(10px,2.5vw,20px);
                    font-weight:700;letter-spacing:4px;white-space:nowrap">
                    ${_esc(wmText)}&nbsp;&nbsp;${_esc(wmText)}
                </span>
            </div>

            <!-- YouTube title bar click blocker -->
            <div style="position:absolute;top:0;left:0;right:0;height:44px;z-index:10;cursor:default"></div>
        </div>

        <!-- Footer bar -->
        <div style="background:#0f172a;padding:8px 14px;display:flex;
            align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                ${statusBadge}
                ${!isOnline && !record ? `
                <span style="color:#ef4444;font-size:11px">📵 Offline — video not saved</span>` : ''}
            </div>
            <div id="ovp-save-area" style="flex-shrink:0"></div>
        </div>

        <!-- Quality / Speed hint -->
        <div style="background:#0a0f1e;padding:5px 14px;display:flex;align-items:center;justify-content:flex-end">
            <span style="color:#64748b;font-size:10px;font-family:sans-serif">
                ⚙️ Setting ላይ በመንካት <strong style="color:#94a3b8">Quality</strong> እና <strong style="color:#94a3b8">Speed</strong> ማስተካከል ይቻላል
            </span>
        </div>
    </div>`;

    // ── Disable right-click ───────────────────────────────────────────────────
    document.getElementById('ovp-root')?.addEventListener('contextmenu', (e) => {
        e.preventDefault(); return false;
    });

    // ── Start drifting watermark ──────────────────────────────────────────────
    const _WM_POS = [
        { top: '8%',  left: '5%'  }, { top: '8%',  left: '60%' },
        { top: '30%', left: '40%' }, { top: '55%', left: '10%' },
        { top: '55%', left: '65%' }, { top: '78%', left: '30%' },
    ];
    let wmIdx = 0;
    const wmEl = document.getElementById('ovp-wm');
    const _drift = () => {
        wmIdx = (wmIdx + 1) % _WM_POS.length;
        if (wmEl) { wmEl.style.top = _WM_POS[wmIdx].top; wmEl.style.left = _WM_POS[wmIdx].left; }
    };
    const wmTimer = setInterval(_drift, 4000);

    // ── Save / Remove offline button ──────────────────────────────────────────
    const saveArea = document.getElementById('ovp-save-area');
    const _renderSaveBtn = (saved) => {
        if (!saveArea) return;
        saveArea.innerHTML = saved
            ? `<button id="ovp-rm" style="${_btnStyle('#ef4444','rgba(239,68,68,0.15)')}">🗑️ Remove Offline</button>`
            : `<button id="ovp-dl" style="${_btnStyle('#9333ea','rgba(147,51,234,0.8)')}">💾 Save Offline</button>`;

        document.getElementById('ovp-dl')?.addEventListener('click', async () => {
            const fallback = opts.fallbackUrl || '';
            if (!fallback) { if (typeof toast !== 'undefined') toast.error('No video URL to save'); return; }
            document.getElementById('ovp-dl').textContent = '⏳ Saving...';
            document.getElementById('ovp-dl').disabled = true;
            await downloadVideoForOffline(fallback, lessonId, opts.lessonTitle);
            _renderSaveBtn(true);
        });

        document.getElementById('ovp-rm')?.addEventListener('click', async () => {
            await removeVideoOffline(lessonId);
            _renderSaveBtn(false);
            if (typeof toast !== 'undefined') toast.warning('🗑️ Removed from offline storage');
        });
    };

    _renderSaveBtn(!!record);

    // Cleanup drift timer when player removed
    new MutationObserver((_, obs) => {
        const root = document.getElementById('ovp-root');
        if (!root || !document.contains(root)) {
            clearInterval(wmTimer); obs.disconnect();
        }
    }).observe(document.body, { childList: true, subtree: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _openOfflineDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('AlphaOfflineDB', 2);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('videos'))  db.createObjectStore('videos');
            if (!db.objectStoreNames.contains('lessons')) db.createObjectStore('lessons');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

function _dbGet(db, store, key) {
    return new Promise((res, rej) => {
        const req = db.transaction(store, 'readonly').objectStore(store).get(key);
        req.onsuccess = () => res(req.result || null);
        req.onerror   = () => rej(req.error);
    });
}

function _extractYTId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return m ? m[1] : null;
}

function _getUser() {
    try { return JSON.parse(localStorage.getItem('currentUser') || '{}'); }
    catch { return {}; }
}

function _esc(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _btnStyle(color, bg) {
    return [`background:${bg}`,`color:${color}`,'border:none','border-radius:10px',
        'padding:5px 12px','font-size:11px','font-weight:700',
        'font-family:sans-serif','cursor:pointer','white-space:nowrap'].join(';');
}

// ── Expose globally ───────────────────────────────────────────────────────────
window.renderOfflineVideoPlayer = renderOfflineVideoPlayer;
