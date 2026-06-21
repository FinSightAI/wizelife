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
    return s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]').replace(/\d{7,}/g, '[num]');
  }

  // Benign noise we must NOT log: aborted/cancelled promises (navigation away,
  // cancelled fetches, Firebase auth popup/redirect cancels). These are not bugs
  // and, left unfiltered, they flooded the error log (~430 "cancelled" rows) and
  // tripped the hourly "error spike" alert, masking real errors.
  var BENIGN = /^(cancell?ed|aborterror|the (user aborted a request|operation was aborted)|signal is aborted without reason|navigation cancelled)\.?$/i;

  function report(rec) {
    try {
      if (sent >= MAX_PER_SESSION) return;
      if (rec && rec.message && BENIGN.test(String(rec.message).trim())) return;
      var key = (rec.message || '') + '|' + (rec.source || '') + '|' + (rec.line || '');
      if (seen[key]) return;
      seen[key] = 1;
      sent++;
      rec.app = APP;
      rec.url = strip(String(location.href).slice(0, 300));
      rec.message = strip(rec.message);
      rec.stack = strip(rec.stack);
      var payload = JSON.stringify(rec);
      // NOTE: navigator.sendBeacon() with an application/json Blob triggers a
      // CORS *preflight* that the browser then refuses for beacons
      // ("blocked by CORS policy: Response to preflight request doesn't pass")
      // even though the errorReport function answers OPTIONS with 204 + ACAO:*.
      // Verified: raw curl/fetch preflight succeeds, sendBeacon's does not — so
      // every error report from wizelife.ai was silently dropped with a console
      // CORS error. fetch(keepalive) with the same JSON body returns 204
      // reliably, so prefer it. Fall back to text/plain sendBeacon (a CORS
      // "simple" request → no preflight) only if fetch is unavailable.
      if (typeof fetch === 'function') {
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
          mode: 'cors',
        }).catch(function () {});
      } else if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'text/plain' }));
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
// Gainer — lead capture + AI chat (consent-gated, skips auth/dashboard)
(function(){
  var blocked = /^\/(auth|dashboard|account|login|signup)/;
  if (blocked.test(location.pathname)) return;
  function load() {
    if (window.WizeConsent && !window.WizeConsent.analyticsAllowed()) return;
    ["track","chat"].forEach(function(n){
      var s=document.createElement("script");
      s.src="https://gainer-eight.vercel.app/"+n+".js";
      s.setAttribute("data-tenant","wizelife");
      s.defer=true;
      document.head.appendChild(s);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
