const CACHE_NAME = 'smart-task-v7';
// NOTE: do NOT precache /globals.css, /manifest.json or /dashboard —
// Next.js serves CSS from hashed /_next/static paths, there is no
// app/manifest.ts, and /dashboard 302-redirects per role, so all three
// rejected cache.addAll() and broke the install.
const ASSETS_TO_CACHE = [
  '/',
  '/login',
  '/signup',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Resolve each asset individually so a single 404 can't abort the
      // whole install (which previously left the service worker unactivated).
      return Promise.all(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch(() => {
            /* ignore individual cache misses */
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for caching
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // NEVER intercept API, auth, or Next.js internal requests — these must
  // always hit the network (caching /api/auth/socket-token returned a stale
  // JWT from a previous session, breaking socket auth on role switch).
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/') ||
    url.pathname.includes('/auth/') ||
    url.pathname === '/manifest.json'
  ) {
    return; // Let the browser handle normally (network-only, no caching)
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // For page navigations: network-first so fresh data (newly created
      // users, tasks, etc.) always shows. Cache is only the offline fallback.
      if (event.request.mode === 'navigate') {
        return fetch(event.request)
          .then((fetchResponse) => {
            if (fetchResponse && fetchResponse.status === 200) {
              const clone = fetchResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            }
            return fetchResponse
          })
          .catch(() =>
            cached ||
            caches.match('/').then((r) => r || new Response('', { status: 503, headers: { 'Content-Type': 'text/html' } }))
          )
      }

      // For static assets: cache-first (they're hashed/immutable)
      if (cached) {
        return cached
      }

      return fetch(event.request).then((fetchResponse) => {
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
          return fetchResponse
        }
        const responseToCache = fetchResponse.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })
        return fetchResponse
      }).catch(() => {
        // Always resolve to a Response — returning undefined to respondWith()
        // throws "Failed to convert value to 'Response'".
        if (event.request.mode === 'navigate') {
          return caches.match('/').then((r) => r || new Response('', { status: 503, headers: { 'Content-Type': 'text/html' } }))
        }
        return new Response('', { status: 404 })
      })
    })
  );
});
