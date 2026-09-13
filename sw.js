// ─── Alpha Freshman Tutorial — Service Worker ─────────────────────────────────
// CACHE_VERSION auto-bumped on each deploy via build timestamp
const CACHE_VERSION    = 'v' + '2026091001';  // format: v{YYYYMMDDNN}
const CACHE_NAME       = 'alpha-cache-' + CACHE_VERSION;
const VIDEO_CACHE_NAME = 'course-videos-v1';  // for .mp4 offline video caching

// ── Offline video playback guard ──────────────────────────────────────────────
// We intercept requests to youtube.com/embed/* and verify they originate from
// within the app (same origin Referer). This prevents raw embed URLs being
// opened externally from browser history or bookmarks.
const ALLOWED_EMBED_ORIGINS = [
    self.location.origin,
    'https://www.youtube.com',
    'https://youtube.com',
];

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/logo.png',
    '/home.html',
    '/courses.html',
    '/course-detail.html',
    '/dashboard.html',
    '/auth-login.html',
    '/auth-register.html',
    '/subscription.html',
    '/payment.html',
    '/payment-success.html',
    '/admin-dashboard.html',
    '/instructor-dashboard.html',
    '/offline.html',
    '/download.html',
    '/elearning.css',
    '/api.js',
    '/main.js',
    '/theme.js',
    '/courses.js',
    '/course-detail.js',
    '/dashboard.js',
    '/auth-login.js',
    '/auth-register.js',
    '/lesson-download.js',
    '/offline-db.js',
    '/video-security.js',
    '/pwa.js'
];

// ── Install: cache static assets, skip waiting so new SW activates immediately ─
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Installing cache:', CACHE_NAME);
            return Promise.allSettled(
                STATIC_ASSETS.map(url =>
                    fetch(url + '?v=' + CACHE_VERSION, { cache: 'no-store' }).then(res => {
                        if (res.ok) cache.put(url, res);
                    }).catch(() => {})
                )
            );
        }).then(() => {
            console.log('[SW] Installed. Skipping waiting...');
            return self.skipWaiting(); // activate immediately, don't wait for old SW to die
        })
    );
});

// ── Activate: delete ALL old caches, claim all clients immediately ────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            const deletes = keys
                .filter(k => k.startsWith('alpha-cache-') && k !== CACHE_NAME)
                .map(k => {
                    console.log('[SW] Deleting old cache:', k);
                    return caches.delete(k);
                });
            return Promise.all(deletes);
        }).then(() => {
            console.log('[SW] Activated:', CACHE_VERSION);
            // Notify all clients that a new version is available → trigger reload
            self.clients.matchAll({ type: 'window' }).then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
                });
            });
            return self.clients.claim();
        })
    );
});

// ── Message: client can force update check ────────────────────────────────────
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data?.type === 'GET_VERSION') {
        event.source?.postMessage({ type: 'VERSION', version: CACHE_VERSION });
    }
    // Client asks SW to verify a video ID is legitimately saved
    if (event.data?.type === 'VERIFY_OFFLINE_VIDEO') {
        // We reply with a simple ack — real verification is done via IndexedDB in the page
        event.source?.postMessage({ type: 'OFFLINE_VIDEO_ACK', id: event.data.id, ok: true });
    }
    // Client asks SW to cache a specific .mp4 URL for offline playback
    if (event.data?.type === 'CACHE_VIDEO') {
        const videoUrl = event.data.url;
        if (videoUrl) {
            caches.open(VIDEO_CACHE_NAME).then(async (cache) => {
                try {
                    const existing = await cache.match(videoUrl);
                    if (!existing) {
                        const response = await fetch(videoUrl);
                        if (response.ok) {
                            await cache.put(videoUrl, response);
                            event.source?.postMessage({ type: 'VIDEO_CACHED', url: videoUrl, ok: true });
                        }
                    } else {
                        event.source?.postMessage({ type: 'VIDEO_CACHED', url: videoUrl, ok: true, alreadyCached: true });
                    }
                } catch (err) {
                    event.source?.postMessage({ type: 'VIDEO_CACHE_ERROR', url: videoUrl, error: err.message });
                }
            });
        }
    }
    // Client asks SW to delete a cached video
    if (event.data?.type === 'DELETE_CACHED_VIDEO') {
        const videoUrl = event.data.url;
        if (videoUrl) {
            caches.open(VIDEO_CACHE_NAME).then(async (cache) => {
                await cache.delete(videoUrl);
                event.source?.postMessage({ type: 'VIDEO_DELETED', url: videoUrl });
            });
        }
    }
    // Client asks for list of cached video URLs
    if (event.data?.type === 'LIST_CACHED_VIDEOS') {
        caches.open(VIDEO_CACHE_NAME).then(async (cache) => {
            const keys = await cache.keys();
            const urls = keys.map(r => r.url);
            event.source?.postMessage({ type: 'CACHED_VIDEOS_LIST', urls });
        });
    }
});

// ── Fetch strategy ────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET and chrome-extension requests
    if (event.request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;

    // ── .mp4 video files: Cache API offline playback ────────────────────────
    // Cache-first for saved videos, network-and-cache for new requests
    if (url.pathname.endsWith('.mp4') || event.request.destination === 'video') {
        event.respondWith(
            caches.open(VIDEO_CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(event.request);
                if (cachedResponse) {
                    // Serve from cache — enables offline playback
                    return cachedResponse;
                }
                // Not cached: fetch from network and cache for future offline use
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    return new Response('Video not available offline.', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
            })
        );
        return;
    }

    // ── Block YouTube embed requests that don't originate from our app ──────
    // Prevents someone copy-pasting the embed URL directly into the browser.
    if (url.hostname.includes('youtube.com') && url.pathname.startsWith('/embed/')) {
        const referer = event.request.referrer || ''
        const fromApp = referer.startsWith(self.location.origin)
        if (!fromApp) {
            event.respondWith(
                new Response(
                    '<html><body style="background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>⛔ Video can only be played inside Alpha Freshman Tutorial.</p></body></html>',
                    { status: 403, headers: { 'Content-Type': 'text/html' } }
                )
            )
            return
        }
    }

    // API calls: always network first — never serve stale API responses
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstWithOfflineFallback(event.request));
        return;
    }

    // HTML pages: network first (so deploys are always fresh), fallback to cache
    if (url.pathname.endsWith('.html') || url.pathname === '/' || !url.pathname.includes('.')) {
        event.respondWith(networkFirstWithCacheFallback(event.request));
        return;
    }

    // JS/CSS/images: cache first, but update cache in background (stale-while-revalidate)
    event.respondWith(staleWhileRevalidate(event.request));
});

// Network first → cache fallback (for HTML pages — always fresh on reload)
async function networkFirstWithCacheFallback(request) {
    try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        const offlinePage = await caches.match('/offline.html');
        return offlinePage || new Response('<h1>You are offline</h1>', {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Network first → offline JSON fallback (for /api/ calls)
async function networkFirstWithOfflineFallback(request) {
    try {
        const response = await fetch(request);
        if (request.method === 'GET' && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({
            success: false, offline: true,
            message: 'You are offline. Showing cached data.'
        }), { headers: { 'Content-Type': 'application/json' } });
    }
}

// Stale-while-revalidate (for JS/CSS/images — fast + stays up to date)
async function staleWhileRevalidate(request) {
    const cache  = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => null);

    return cached || fetchPromise || new Response('Offline', { status: 503 });
}

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
    const data = event.data?.json() || {};
    event.waitUntil(
        self.registration.showNotification(data.title || 'Alpha Freshman Tutorial', {
            body:  data.body || 'You have a new notification',
            icon:  '/logo.png',
            badge: '/logo.png',
            data:  { url: data.url || '/' }
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
