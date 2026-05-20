// ============================================================
// Service Worker - Network First (v5)
// Always fetches from network, no forced reload that could
// interrupt login flow or cause race conditions.
// ============================================================

const SW_VERSION = 'v5';

self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Install - Skipping waiting`);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activate - Cleaning old caches`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          console.log(`[SW ${SW_VERSION}] Deleting cache:`, name);
          return caches.delete(name);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch from network (no caching)
  event.respondWith(fetch(event.request));
});
