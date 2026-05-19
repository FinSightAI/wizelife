/**
 * wize-sentry.js — Shared Sentry browser SDK loader.
 *
 * Reads DSN + app name from <meta> tags in the document head:
 *   <meta name="wl-sentry-dsn" content="https://...@o0.ingest.sentry.io/...">
 *   <meta name="wl-sentry-app" content="wizemoney">  // optional, defaults to hostname
 *
 * If no DSN is set → script is a no-op (safe in dev / before DSN provisioned).
 *
 * Usage:
 *   <script src="/js/wize-sentry.js" defer></script>
 *
 * Mirror this file to each sub-app: FinSight, WizeLife landing, Vitara, etc.
 * Canonical location: TOTALIST/wizelife/js/wize-sentry.js
 */
(function () {
  'use strict';

  function getMeta(name) {
    const el = document.querySelector('meta[name="' + name + '"]');
    return el ? el.getAttribute('content') : null;
  }

  const dsn = getMeta('wl-sentry-dsn');
  if (!dsn) return; // DSN not provisioned — silently skip.

  const app = getMeta('wl-sentry-app') || location.hostname.split('.')[0] || 'wizelife';
  // Heuristic: production = behind wizelife.ai or a Vercel/Render prod URL.
  const isProd = /\bwizelife\.ai\b|\.vercel\.app|\.onrender\.com|\.github\.io/.test(location.host)
                 && !/localhost|127\.0\.0\.1/.test(location.host);
  const env = isProd ? 'production' : 'development';

  // Load Sentry from CDN (bundle ~50KB gzipped, cached forever).
  // Pinned major version for stability — bump deliberately.
  const SENTRY_CDN = 'https://browser.sentry-cdn.com/8.55.0/bundle.tracing.min.js';

  function init() {
    if (!window.Sentry) return;
    window.Sentry.init({
      dsn: dsn,
      environment: env,
      // 10% perf sampling — enough for visibility, cheap on quota
      tracesSampleRate: 0.10,
      // 100% of error sessions, 10% of normal sessions for replay
      // (Replay is gated by Sentry plan tier — falls back gracefully)
      replaysSessionSampleRate: 0.0,  // disable normal-session replay (saves quota)
      replaysOnErrorSampleRate: 1.0,  // capture replays only when an error fires
      release: app + '@' + (getMeta('wl-version') || 'unknown'),
      // Don't ship local-dev noise to Sentry
      beforeSend(event) {
        if (env !== 'production') return null;
        // Drop known noise: cancelled XHR, network reload after SW update.
        const msg = (event.exception && event.exception.values && event.exception.values[0]?.value) || '';
        if (/cancelled|aborted|NetworkError|Load failed/i.test(msg)) return null;
        return event;
      },
      ignoreErrors: [
        'ResizeObserver loop',         // Chrome benign warning
        'Non-Error promise rejection', // Firebase quirk
        'ChunkLoadError',              // SW update mid-navigation
        /Failed to fetch/i,            // generic, often network blip
      ],
    });
    // Tag user if SSO already populated localStorage
    try {
      const sso = JSON.parse(localStorage.getItem('wl_sso') || '{}');
      if (sso.uid || sso.nick) {
        window.Sentry.setUser({ id: sso.uid, username: sso.nick, plan: sso.plan || 'free' });
      }
    } catch (_) {}
  }

  // Load + init
  const s = document.createElement('script');
  s.src = SENTRY_CDN;
  s.crossOrigin = 'anonymous';
  s.async = true;
  s.onload = init;
  s.onerror = () => console.warn('[wize-sentry] CDN failed to load — errors will not be reported.');
  document.head.appendChild(s);
})();
