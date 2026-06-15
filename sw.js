const CACHE = 'wizelife-v204';
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
  '/js/wize-track-beacon.js',
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
        // Clone SYNCHRONOUSLY before returning res to the page. If we cloned
        // inside the `.then(c => c.put(e.request, res.clone()))` callback,
        // the page may have already started reading `res` body by the time
        // the cache.open() promise resolves — making the response uncloneable
        // and throwing "Response body is already used".
        // Bug surfaced 2026-05-19 on payslip-extractor.js → pdf.js → Tesseract
        // chain when the SW corrupted the script load.
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      // NETWORK-FIRST: serve the fresh network response so new deploys reach
      // clients immediately; fall back to cache only when offline (the .catch
      // above). Was `cached || fresh` (stale-while-revalidate) which could pin
      // users to a stale shell across deploys.
      return fresh;
    })
  );
});
