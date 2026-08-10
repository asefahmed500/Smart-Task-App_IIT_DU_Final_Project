const CACHE_NAME = 'smart-task-v3';
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

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((fetchResponse) => {
        // Don't cache if not a valid response or if it's an API call we don't want to cache
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
          return fetchResponse;
        }

        const responseToCache = fetchResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return fetchResponse;
      }).catch(() => {
        // If fetch fails (offline), and we don't have it in cache, return the root for SPA behavior
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
