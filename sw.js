// ─── Alpha Freshman Tutorial — Service Worker ─────────────────────────────────
const CACHE_NAME = 'aft-v4';
const STATIC_ASSETS = [
    '/',
    '/index.html',
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
    '/ai-study.html',
    '/ai-assistant.html',
    '/study-hub.html',
    '/department-guide.html',
    '/elearning.css',
    '/api.js',
    '/main.js',
    '/notifications.js',
    '/search.js',
    '/analytics.js',
    '/theme.js',
    '/courses.js',
    '/course-detail.js',
    '/dashboard.js',
    '/admin-dashboard.js',
    '/instructor-dashboard.js',
    '/auth-login.js',
    '/auth-register.js',
    '/subscription.js',
    '/payment.js',
    '/ai-assistant.js',
    '/ai-engine.js',
    '/ai-study.js',
    '/quiz-system.js',
    '/lesson-download.js',
    '/study-planner.js',
    '/bookmarks.js',
    '/offline-db.js',
    '/auth-guard.js',
    '/pwa.js',
    '/logo.png',
    '/manifest.json'
];

// ── Install: cache all static assets ─────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching static assets');
            // addAll fails if any single asset 404s — use individual puts instead
            return Promise.allSettled(
                STATIC_ASSETS.map(url =>
                    fetch(url).then(res => {
                        if (res.ok) cache.put(url, res);
                    }).catch(() => {})
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: network-first for API, cache-first for assets ──────────────────────
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET and chrome-extension requests
    if (event.request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;

    // API calls: network first, fallback to offline JSON
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstWithOfflineFallback(event.request));
        return;
    }

    // Static assets: cache first, fallback to network
    event.respondWith(cacheFirstWithNetworkFallback(event.request));
});

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

async function cacheFirstWithNetworkFallback(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        if (request.mode === 'navigate') {
            const offlinePage = await caches.match('/offline.html');
            return offlinePage || new Response('<h1>You are offline</h1>', {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        return new Response('Offline', { status: 503 });
    }
}

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
    const data = event.data?.json() || {};
    event.waitUntil(
        self.registration.showNotification(data.title || 'Alpha Freshman Tutorial', {
            body: data.body || 'You have a new notification',
            icon: '/logo.png',
            badge: '/logo.png',
            data: { url: data.url || '/' }
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
