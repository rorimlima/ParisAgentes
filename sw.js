// ============================================================
// Service Worker - KILL SWITCH (v4)
// This version immediately unregisters itself, deletes all caches,
// and forces the browser to reload to fetch the latest fresh code.
// ============================================================

const CACHE_NAME = 'pd-bloqueios-v4';

self.addEventListener('install', (event) => {
  console.log('[SW v4] Install - Forcing skip waiting');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW v4] Activate - DELETING ALL CACHES');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          console.log('[SW v4] Deleting cache:', name);
          return caches.delete(name);
        })
      );
    }).then(() => self.clients.claim())
      .then(() => {
        console.log('[SW v4] Forcing clients to reload');
        return self.clients.matchAll({ type: 'window' }).then(windowClients => {
          windowClients.forEach(client => {
            if ('navigate' in client) {
              client.navigate(client.url);
            }
          });
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch from network to ensure fresh code
  event.respondWith(fetch(event.request));
});
