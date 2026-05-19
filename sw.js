// ============================================================
// Service Worker - Paris Dakar Veículos Bloqueados PWA
// Cache-first strategy for app shell, network-first for API
// ============================================================

const CACHE_NAME = 'pd-bloqueios-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/db.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // CDN dependencies
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install - Pre-cache all critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching app shell...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache failed for some assets:', err);
        // Don't block install if CDN assets fail
        return caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll([
            '/',
            '/index.html',
            '/style.css',
            '/app.js',
            '/db.js',
            '/manifest.json',
            '/icon-192.png',
            '/icon-512.png'
          ]);
        });
      })
  );
});

// Activate - Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Cache-first for assets, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Network-first for Supabase API calls
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for everything else (app shell + CDN)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached, but update in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }
        // If not in cache, fetch from network and cache it
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
  );
});
