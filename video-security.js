// ─── Video Security Module ────────────────────────────────────────────────────
// Feature 2: Dynamic Video Watermarking
// Feature 3: YouTube Link Protection
// Feature 4: Encrypted Offline Video Storage (IndexedDB)
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ── Disable right-click globally on lesson pages ──────────────────────────────
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('#videoWrapper') || e.target.closest('iframe')) {
        e.preventDefault();
        return false;
    }
});

// Disable drag on video area
document.addEventListener('dragstart', (e) => {
    if (e.target.closest('#videoWrapper')) e.preventDefault();
});

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 2 — Dynamic Video Watermark
// ═══════════════════════════════════════════════════════════════════════════════
let _watermarkTimer = null;

function startVideoWatermark() {
    const overlay = document.getElementById('videoWatermark');
    if (!overlay) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!user.email) return; // no watermark for unauthenticated

    const name   = user.fullName  || 'Student';
    const email  = user.email     || '';
    const uid    = (user.id || user._id || '').toString().slice(-8);

    // Stop any existing animation
    if (_watermarkTimer) clearInterval(_watermarkTimer);

    function createWatermarkEl() {
        const el = document.createElement('div');
        el.style.cssText = `
            position: absolute;
            opacity: 0.32;
            color: #ffffff;
            font-size: clamp(10px, 1.4vw, 14px);
            font-family: monospace;
            font-weight: 600;
            line-height: 1.5;
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            white-space: nowrap;
            pointer-events: none;
            user-select: none;
            -webkit-user-select: none;
            transition: top 2s ease, left 2s ease;
            will-change: top, left;
        `;
        el.innerHTML = `${name}<br>${email}<br>ID:${uid}`;
        return el;
    }

    // Remove old watermarks
    overlay.innerHTML = '';
    const wm = createWatermarkEl();
    overlay.appendChild(wm);

    function moveWatermark() {
        const wrapper = document.getElementById('videoWrapper');
        if (!wrapper || !wm) return;

        const maxX = Math.max(0, wrapper.offsetWidth  - 200);
        const maxY = Math.max(0, wrapper.offsetHeight - 60);

        const x = Math.floor(Math.random() * maxX);
        const y = Math.floor(Math.random() * maxY);

        wm.style.left = x + 'px';
        wm.style.top  = y + 'px';
    }

    // Initial position
    moveWatermark();

    // Move every 6–10 seconds
    const interval = 6000 + Math.random() * 4000;
    _watermarkTimer = setInterval(moveWatermark, interval);
}

function stopVideoWatermark() {
    if (_watermarkTimer) {
        clearInterval(_watermarkTimer);
        _watermarkTimer = null;
    }
    const overlay = document.getElementById('videoWatermark');
    if (overlay) overlay.innerHTML = '';
}

// Auto-start watermark when video wrapper appears in DOM
const _wmObserver = new MutationObserver(() => {
    if (document.getElementById('videoWrapper')) {
        startVideoWatermark();
    } else {
        stopVideoWatermark();
    }
});
_wmObserver.observe(document.body, { childList: true, subtree: true });


// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — YouTube URL Abstraction (Frontend side)
// ═══════════════════════════════════════════════════════════════════════════════
// Fetch secure video token from backend before loading iframe
async function loadSecureVideo(lessonId, courseId, iframeEl) {
    if (!lessonId || !iframeEl) return;

    try {
        const res = await api.request(`/courses/video-token/${lessonId}?courseId=${courseId}`);
        if (res.success && res.embedUrl) {
            iframeEl.src = res.embedUrl +
                '?rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&fs=0&playsinline=1&color=white';
            startVideoWatermark();
        } else {
            iframeEl.closest('#videoWrapper').innerHTML =
                '<div style="color:#e74c3c;padding:2rem;text-align:center">🔒 Video not accessible</div>';
        }
    } catch (err) {
        console.warn('[VideoSecurity] Token fetch failed, using direct embed fallback');
        // iframeEl keeps the fallback src set in course-detail.js
        startVideoWatermark();
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — Encrypted Offline Video Storage (IndexedDB)
// ═══════════════════════════════════════════════════════════════════════════════
const OFFLINE_VIDEO_DB   = 'alpha-offline-videos';
const OFFLINE_VIDEO_STORE = 'videos';
const OFFLINE_DB_VERSION  = 1;

// Simple XOR-based obfuscation key (not cryptographic — just prevents casual access)
const _OBF_KEY = 'AFT-2026-SECURE-VIDEO-KEY';

function _xorObfuscate(buffer) {
    const key    = new TextEncoder().encode(_OBF_KEY);
    const data   = new Uint8Array(buffer);
    const output = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        output[i] = data[i] ^ key[i % key.length];
    }
    return output.buffer;
}

function openOfflineVideoDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(OFFLINE_VIDEO_DB, OFFLINE_DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(OFFLINE_VIDEO_STORE)) {
                db.createObjectStore(OFFLINE_VIDEO_STORE, { keyPath: 'lessonId' });
            }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror   = (e) => reject(e.target.error);
    });
}

// Save video to IndexedDB (obfuscated blob)
async function saveVideoOffline(lessonId, videoUrl, progressCb) {
    try {
        const response = await fetch(videoUrl);
        if (!response.ok) throw new Error('Failed to fetch video');

        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length') || 0;

        let received = 0;
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            if (progressCb && contentLength) {
                progressCb(Math.round((received / contentLength) * 100));
            }
        }

        // Combine chunks
        const total  = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
            total.set(chunk, offset);
            offset += chunk.length;
        }

        // Obfuscate before storing
        const obfuscated = _xorObfuscate(total.buffer);
        const blob = new Blob([obfuscated]);

        const db = await openOfflineVideoDB();
        await new Promise((res, rej) => {
            const tx = db.transaction(OFFLINE_VIDEO_STORE, 'readwrite');
            tx.objectStore(OFFLINE_VIDEO_STORE).put({
                lessonId,
                blob,
                savedAt: Date.now(),
                size:    blob.size
            });
            tx.oncomplete = res;
            tx.onerror    = rej;
        });

        return { success: true, size: blob.size };
    } catch (err) {
        console.error('[OfflineVideo] Save failed:', err);
        return { success: false, error: err.message };
    }
}

// Load video from IndexedDB → return temporary Blob URL
async function loadVideoOffline(lessonId) {
    try {
        const db = await openOfflineVideoDB();
        const record = await new Promise((res, rej) => {
            const tx = db.transaction(OFFLINE_VIDEO_STORE, 'readonly');
            const req = tx.objectStore(OFFLINE_VIDEO_STORE).get(lessonId);
            req.onsuccess = () => res(req.result);
            req.onerror   = () => rej(req.error);
        });

        if (!record) return null;

        // Deobfuscate
        const buf = await record.blob.arrayBuffer();
        const deobf = _xorObfuscate(buf);
        const videoBlob = new Blob([deobf], { type: 'video/mp4' });

        // Create temporary in-memory URL (not accessible from file system)
        const blobUrl = URL.createObjectURL(videoBlob);
        return blobUrl;
    } catch (err) {
        console.error('[OfflineVideo] Load failed:', err);
        return null;
    }
}

// Check if video is saved offline
async function isVideoOffline(lessonId) {
    try {
        const db = await openOfflineVideoDB();
        const record = await new Promise((res, rej) => {
            const tx = db.transaction(OFFLINE_VIDEO_STORE, 'readonly');
            const req = tx.objectStore(OFFLINE_VIDEO_STORE).get(lessonId);
            req.onsuccess = () => res(req.result);
            req.onerror   = () => rej(req.error);
        });
        return !!record;
    } catch {
        return false;
    }
}

// Delete offline video (free storage)
async function deleteVideoOffline(lessonId) {
    try {
        const db = await openOfflineVideoDB();
        await new Promise((res, rej) => {
            const tx = db.transaction(OFFLINE_VIDEO_STORE, 'readwrite');
            tx.objectStore(OFFLINE_VIDEO_STORE).delete(lessonId);
            tx.oncomplete = res;
            tx.onerror    = rej;
        });
        return true;
    } catch {
        return false;
    }
}

// Get all offline videos (for storage management UI)
async function getAllOfflineVideos() {
    try {
        const db = await openOfflineVideoDB();
        return await new Promise((res, rej) => {
            const tx = db.transaction(OFFLINE_VIDEO_STORE, 'readonly');
            const req = tx.objectStore(OFFLINE_VIDEO_STORE).getAll();
            req.onsuccess = () => res(req.result || []);
            req.onerror   = () => rej(req.error);
        });
    } catch {
        return [];
    }
}

// ── Download button for lessons (shows in lesson viewer) ─────────────────────
async function renderOfflineButton(lessonId, videoUrl, container) {
    if (!container || !lessonId || !videoUrl) return;

    const offline = await isVideoOffline(lessonId);

    container.innerHTML = offline
        ? `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="color:#27ae60;font-size:0.82rem;font-weight:600">✅ Available Offline</span>
            <button onclick="playOfflineVideo('${lessonId}')" class="btn btn-success btn-sm">▶ Play Offline</button>
            <button onclick="removeOfflineVideo('${lessonId}',this.closest('div'),'${videoUrl}')" class="btn btn-sm" style="color:#e74c3c">🗑 Remove</button>
           </div>`
        : `<button onclick="downloadVideoOffline('${lessonId}','${videoUrl}',this)" class="btn btn-sm">
            📥 Save for Offline
           </button>`;
}

async function downloadVideoOffline(lessonId, videoUrl, btn) {
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = '⏳ Downloading 0%...';

    const result = await saveVideoOffline(lessonId, videoUrl, (pct) => {
        btn.textContent = `⏳ Downloading ${pct}%...`;
    });

    if (result.success) {
        btn.textContent = '✅ Saved!';
        const kb = Math.round(result.size / 1024);
        setTimeout(() => {
            btn.closest('div') && renderOfflineButton(lessonId, videoUrl, btn.closest('div'));
        }, 1000);
        if (typeof toast !== 'undefined') toast.success(`Video saved offline (${kb} KB)`);
    } else {
        btn.disabled = false;
        btn.textContent = '❌ Failed — Retry';
        if (typeof toast !== 'undefined') toast.error('Failed to save video offline: ' + result.error);
    }
}

async function playOfflineVideo(lessonId) {
    const blobUrl = await loadVideoOffline(lessonId);
    if (!blobUrl) {
        if (typeof toast !== 'undefined') toast.error('Offline video not found');
        return;
    }
    // Replace iframe with HTML5 video using blob URL
    const wrapper = document.getElementById('videoWrapper');
    if (wrapper) {
        const old = wrapper.querySelector('iframe');
        if (old) {
            const video = document.createElement('video');
            video.src = blobUrl;
            video.controls = true;
            video.style.cssText = 'width:100%;height:100%;background:#000';
            video.oncontextmenu = () => false;
            // Revoke blob URL when done to prevent external access
            video.onended = () => URL.revokeObjectURL(blobUrl);
            old.replaceWith(video);
            video.play().catch(() => {});
            startVideoWatermark();
        }
    }
}

async function removeOfflineVideo(lessonId, container, videoUrl) {
    await deleteVideoOffline(lessonId);
    renderOfflineButton(lessonId, videoUrl, container);
    if (typeof toast !== 'undefined') toast.warning('Offline video removed');
}

// Expose to global scope for inline onclick handlers
window.downloadVideoOffline = downloadVideoOffline;
window.playOfflineVideo     = playOfflineVideo;
window.removeOfflineVideo   = removeOfflineVideo;
window.startVideoWatermark  = startVideoWatermark;
window.loadSecureVideo      = loadSecureVideo;
window.renderOfflineButton  = renderOfflineButton;
