/* WizeLife first-party error tracker — privacy-preserving, no third party.
 *
 * Captures uncaught window errors + unhandled promise rejections and beacons a
 * compact, PII-stripped record to the shared `errorReport` Cloud Function
 * (→ Firestore `errorLogs`). This replaces Sentry with a first-party, cookieless
 * pipeline that fits the suite's privacy posture (no GA/Clarity/3rd-party).
 *
 * Hard rules: it can NEVER loop, throw, or slow the app — every path is guarded,
 * throttled (max per session), deduped, and fire-and-forget via sendBeacon.
 *
 * App id: set window.WIZE_APP = 'wizemoney' (etc.) before this loads, or it falls
 * back to <html data-wize-app> or the first hostname label.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.__wizeErr) return;
  window.__wizeErr = true;

  var ENDPOINT = 'https://us-central1-finzilla-7f1f9.cloudfunctions.net/errorReport';
  var APP = window.WIZE_APP
    || (document.documentElement && document.documentElement.getAttribute('data-wize-app'))
    || (location.hostname.split('.')[0] || 'unknown');
  var MAX_PER_SESSION = 8;
  var sent = 0;
  var seen = {};

  function strip(s) {
    if (typeof s !== 'string') return '';
    try {
      if (window.WizePII && typeof window.WizePII.stripIdentity === 'function') {
        var r = window.WizePII.stripIdentity(s);
        if (typeof r === 'string') s = r;
      }
    } catch (e) { /* ignore */ }
    // Belt-and-suspenders even if WizePII is absent: redact emails + long digit runs.
    return s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]').replace(/\b\d{7,}\b/g, '[num]');
  }

  function report(rec) {
    try {
      if (sent >= MAX_PER_SESSION) return;
      var key = (rec.message || '') + '|' + (rec.source || '') + '|' + (rec.line || '');
      if (seen[key]) return;
      seen[key] = 1;
      sent++;
      rec.app = APP;
      rec.url = strip(String(location.href).slice(0, 300));
      rec.message = strip(rec.message);
      rec.stack = strip(rec.stack);
      var payload = JSON.stringify(rec);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
      } else if (typeof fetch === 'function') {
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(function () {});
      }
    } catch (e) { /* the tracker must never throw */ }
  }

  window.addEventListener('error', function (e) {
    try {
      if (!e || (!e.message && !e.error)) return;
      report({
        kind: 'error',
        message: e.message || (e.error && e.error.message) || 'error',
        source: e.filename || '',
        line: e.lineno || null,
        col: e.colno || null,
        stack: (e.error && e.error.stack) || '',
      });
    } catch (x) { /* ignore */ }
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    try {
      var r = e && e.reason;
      report({
        kind: 'unhandledrejection',
        message: (r && (r.message || String(r))) || 'unhandledrejection',
        source: '',
        stack: (r && r.stack) || '',
      });
    } catch (x) { /* ignore */ }
  });
})();
