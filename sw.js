const CACHE = 'wizelife-v138';
const SHELL = [
  // Core flow
  '/index.html',
  '/auth.html',
  '/dashboard.html',
  '/feedback.html',
  // Sub-app landing redirects
  '/apps.html',
  '/health.html',
  '/travel.html',
  '/wizetravel.html',
  '/tax-compare.html',
  '/web-apps.html',
  '/wize-ai.html',
  // Legal
  '/privacy.html',
  '/terms.html',
  '/security.html',
  // Utility
  '/404.html',
  '/manifest.json',
  '/js/wizelife-auth.js',
  '/js/sw-register.js',
  '/js/wize-disclaimer.js',
  '/js/wize-bottom-nav.js',
  '/js/wize-onboarding.js',
  '/js/wize-share.js',
  '/js/wize-hamburger.js',
  '/assets/wizelife-icon.png',
  '/assets/wizelife-icon-192.png',
  '/assets/wizelife-icon-256.png',
];

self.addEventListener('install', e => {
  // Use individual fetch+put per asset (instead of cache.addAll) so a single
  // missing/404 file doesn't abort the whole install.
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      await Promise.allSettled(
        SHELL.map(url =>
          fetch(url, { cache: 'no-cache' })
            .then(res => res.ok && cache.put(url, res))
            .catch(() => {})
        )
      );
      return self.skipWaiting();
    })
  );
});

// Listen for the "user clicked Update" message from sw-register.js → activate immediately
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Only cache same-origin requests
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
