// ─── Alpha Freshman Tutorial — Service Worker ─────────────────────────────────
const CACHE_NAME = 'aft-v3';
const STATIC_ASSETS = [
    '/home.html',
    '/courses.html',
    '/course-detail.html',
    '/dashboard.html',
    '/auth-login.html',
    '/auth-register.html',
    '/subscription.html',
    '/payment.html',
    '/admin-dashboard.html',
    '/instructor-dashboard.html',
    '/offline.html',
    '/ai-study.html',
    '/study-hub.html',
    '/department-guide.html',
    '/elearning.css',
    '/api.js',
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
    '/pwa.js',
    '/logo.png',
    '/manifest.json'
];
const STATIC_ASSETS = [
    '/',
    '/home.html',
    '/courses.html',
    '/course-detail.html',
    '/dashboard.html',
    '/auth-login.html',
    '/auth-register.html',
    '/subscription.html',
    '/payment.html',
    '/admin-dashboard.html',
    '/instructor-dashboard.html',
    '/offline.html',
    '/ai-study.html',
    '/ai-engine.js',
    '/ai-study.js',
    '/elearning.css',
    '/api.js',
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
    '/offline-db.js',
    '/pwa.js',
    '/logo.png',
    '/manifest.json'
];

// ── Install: cache all static assets ─────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
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

    // API calls: network first, fallback to offline response
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
        // Cache successful GET API responses (courses list, single course)
        if (request.method === 'GET' && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // Offline: try cache
        const cached = await caches.match(request);
        if (cached) return cached;

        // Return offline JSON for API calls
        return new Response(JSON.stringify({
            success: false,
            offline: true,
            message: 'You are offline. Showing cached data.'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
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
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const offlinePage = await caches.match('/offline.html');
            return offlinePage || new Response('<h1>You are offline</h1>', {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        return new Response('Offline', { status: 503 });
    }
}

// ── Background sync for offline actions ──────────────────────────────────────
self.addEventListener('sync', event => {
    if (event.tag === 'sync-enrollments') {
        event.waitUntil(syncPendingEnrollments());
    }
});

async function syncPendingEnrollments() {
    // When back online, sync any pending enrollment requests stored in IndexedDB
    console.log('[SW] Syncing pending enrollments...');
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
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
