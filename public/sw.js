/**
 * UNLCKD Pro Service Worker
 * Provides reliable offline shell caching for React SPA, fonts, and static assets
 * Excludes Firestore, Auth, Payment, and AI endpoints
 */

const CACHE_VERSION = 'unlckd-pro-shell-v1.0.0';
const STATIC_CACHE_NAME = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `runtime-${CACHE_VERSION}`;

// Pre-cached critical assets for instant offline shell
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  'https://unlckdprotrainer.com/assets/unlckd-pro-logo.png',
  'https://unlckdprotrainer.com/assets/unlckd-athletes-cutout.png'
];

// Domains/patterns that MUST bypass Service Worker cache (handled by Firestore SDK or live API only)
const EXCLUDED_URL_PATTERNS = [
  /firestore\.googleapis\.com/,
  /\.firebaseio\.com/,
  /google\.firestore\.v1/,
  /identitytoolkit\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  /generativelanguage\.googleapis\.com/,
  /api\.stripe\.com/,
  /\/api\/audit-link/
];

self.addEventListener('install', (event) => {
  // Pre-cache static shell assets
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('SW: Precache asset partial failure (will cache on demand):', err);
      });
    }).then(() => {
      // Allow new service worker to wait until user chooses to refresh, unless skipWaiting requested
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  // Clean up outdated static & runtime caches from previous versions
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            (cacheName.startsWith('static-unlckd-') || cacheName.startsWith('runtime-unlckd-') || cacheName.startsWith('unlckd-')) &&
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== RUNTIME_CACHE_NAME
          ) {
            console.info('SW: Purging legacy cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // Never cache excluded endpoints (Firestore, Auth, Gemini, Stripe, AI endpoints)
  for (const pattern of EXCLUDED_URL_PATTERNS) {
    if (pattern.test(url.href)) {
      return;
    }
  }

  // 1. Navigation Requests (HTML Page / React SPA Routes): Network first with cached index.html fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline, serve cached index.html so React Router / SPA loads smoothly
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) {
            return cachedIndex;
          }
          const cachedRoot = await caches.match('/');
          if (cachedRoot) {
            return cachedRoot;
          }
          return new Response(
            '<!DOCTYPE html><html><head><title>UNLCKD Pro (Offline)</title></head><body style="background:#080808;color:#fff;font-family:sans-serif;text-align:center;padding:40px;"><h2>UNLCKD Pro Offline</h2><p>Please open UNLCKD while connected once to cache the full athlete hub.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, Images, Google Fonts, Logos): Stale-While-Revalidate or Cache-First
  const isStaticAsset = 
    url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('unlckdprotrainer.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch fresh copy in background to keep cache updated
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(RUNTIME_CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {
              // Expected offline state, ignored
            });
          return cachedResponse;
        }

        // If not in cache, fetch from network and cache
        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque' && !url.hostname.includes('fonts')) {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
            return networkResponse;
          })
          .catch(() => {
            // Return empty response for broken images when offline
            if (request.destination === 'image') {
              return new Response('', { status: 408, headers: { 'Content-Type': 'image/png' } });
            }
            return new Response('Offline resource unavailable', { status: 503 });
          });
      })
    );
  }
});
