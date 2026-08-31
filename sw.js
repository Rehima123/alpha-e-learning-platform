// ─── Alpha Freshman Tutorial — Service Worker ─────────────────────────────────
// IMPORTANT: Change CACHE_VERSION every time you deploy new code.
// This forces all mobile/PWA clients to clear old cache and fetch fresh files.
const CACHE_VERSION  = 'v7';   // ← bumped: secure video player + offline DB
const CACHE_NAME     = 'alpha-cache-' + CACHE_VERSION;

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
            console.log('[SW] Activated:', CACHE_NAME);
            return self.clients.claim(); // take control of all open tabs immediately
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
});

// ── Fetch strategy ────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET and chrome-extension requests
    if (event.request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;

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
