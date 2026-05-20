/**
 * wize-track.js — first-party funnel / activation event logging.
 *
 * Privacy-first by design: NO third-party analytics, NO PII. Events are written
 * to the Firestore `events` collection (App Check enforced, admin-only reads).
 * This is the missing "funnel" layer on top of Cloudflare's pageview analytics
 * — it answers: of N visitors, how many sign up, open a tool, reach the "aha"
 * action, and return.
 *
 * Requires the Firebase compat SDK (firebase.firestore / firebase.auth) already
 * loaded on the page — same setup as wizelife-auth.js.
 *
 * Usage (drop-in, after firebase + config are loaded):
 *   <script src="https://wizelife.ai/js/wize-track.js"></script>
 *   WizeTrack.init('wizemoney');                 // app id + logs a page_view
 *   WizeTrack.track('tool_open', { tool: 'stocks' });
 *   WizeTrack.signup();                          // after successful signup
 *   WizeTrack.activation({ action: 'ran_comparison' });   // the "aha" moment
 *
 * Analyze the results at:  https://wizelife.ai/funnel.html  (admin only)
 */
(function () {
  'use strict';

  var APP = 'wizelife';
  var ANON_KEY = 'wl_anon';
  var SESSION_KEY = 'wl_session';

  function rid() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) { /* fall through */ }
    return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // Stable anonymous id (no PII) — lets us follow a visitor from landing →
  // signup without knowing who they are.
  function anonId() {
    try {
      var v = localStorage.getItem(ANON_KEY);
      if (!v) { v = rid(); localStorage.setItem(ANON_KEY, v); }
      return v;
    } catch (e) { return 'nols'; }
  }

  // Per-tab session id — resets when the tab/session ends.
  function sessionId() {
    try {
      var v = sessionStorage.getItem(SESSION_KEY);
      if (!v) { v = rid(); sessionStorage.setItem(SESSION_KEY, v); }
      return v;
    } catch (e) { return 'noss'; }
  }

  function db() {
    try { return (window.firebase && firebase.firestore) ? firebase.firestore() : null; }
    catch (e) { return null; }
  }

  function currentUid() {
    try { var u = firebase.auth().currentUser; return u ? u.uid : null; }
    catch (e) { return null; }
  }

  function today() {
    // Local date as YYYY-MM-DD — lexicographically sortable, good for range
    // queries + per-day grouping in the dashboard.
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  // Only allow short scalar meta — never free-text / PII. Caps keys + lengths.
  function sanitizeMeta(m) {
    var out = {};
    if (!m || typeof m !== 'object') return out;
    Object.keys(m).slice(0, 8).forEach(function (k) {
      var v = m[k];
      if (typeof v === 'string') v = v.slice(0, 60);
      if (v === null || ['string', 'number', 'boolean'].indexOf(typeof v) >= 0) {
        out[String(k).slice(0, 30)] = v;
      }
    });
    return out;
  }

  var WizeTrack = {
    /** Set the app id and log the initial page_view. Call once per page. */
    init: function (appId) {
      if (appId) APP = String(appId).slice(0, 24);
      this.track('page_view');
      return this;
    },

    /** Log any funnel event. Fire-and-forget; never throws, never blocks UI. */
    track: function (event, meta) {
      var d = db();
      if (!d || !event) return Promise.resolve();
      try {
        var doc = {
          app: APP,
          event: String(event).slice(0, 40),
          uid: currentUid(),
          anonId: anonId(),
          sessionId: sessionId(),
          ts: firebase.firestore.FieldValue.serverTimestamp(),
          day: today(),
          lang: (function () { try { return localStorage.getItem('wl_lang') || 'he'; } catch (e) { return 'he'; } })(),
          path: (location.pathname || '').slice(0, 120),
          meta: sanitizeMeta(meta)
        };
        return d.collection('events').add(doc).catch(function () { /* never surface */ });
      } catch (e) {
        return Promise.resolve();
      }
    },

    /** Convenience: account created. */
    signup: function (meta) { return this.track('signup', meta); },
    /** Convenience: returning sign-in. */
    login: function (meta) { return this.track('login', meta); },
    /** Convenience: a tool/feature was opened. */
    toolOpen: function (meta) { return this.track('tool_open', meta); },
    /** Convenience: the "aha" — user completed a meaningful, value-delivering action. */
    activation: function (meta) { return this.track('activation', meta); }
  };

  window.WizeTrack = WizeTrack;
})();
