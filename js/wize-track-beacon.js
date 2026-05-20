/**
 * wize-track-beacon.js — universal funnel tracker for apps that CAN'T use the
 * Firebase compat SDK (Next.js / React sub-apps: WizeTax, WizeDeal, WizeTravel,
 * WizeHealth). Exposes the SAME `WizeTrack` API as wize-track.js, so wiring code
 * is identical — but instead of writing to Firestore directly it POSTs to the
 * `logEvent` Cloud Function (which validates + writes server-side).
 *
 * Usage (any stack — drop a <script> tag, or import the file):
 *   <script src="https://wizelife.ai/js/wize-track-beacon.js"></script>
 *   WizeTrack.init('wizetax');
 *   WizeTrack.activation({ action: 'got_answer' });
 *
 * Analyze at https://wizelife.ai/funnel.html (admin only).
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://us-central1-finzilla-7f1f9.cloudfunctions.net/logEvent';
  var APP = 'wizelife';
  var ANON_KEY = 'wl_anon';
  var SESSION_KEY = 'wl_session';

  function rid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function ls(get, key, val) {
    try { if (get) return localStorage.getItem(key); localStorage.setItem(key, val); }
    catch (e) { return null; }
  }
  function ss(get, key, val) {
    try { if (get) return sessionStorage.getItem(key); sessionStorage.setItem(key, val); }
    catch (e) { return null; }
  }
  function anonId() {
    var v = ls(true, ANON_KEY); if (!v) { v = rid(); ls(false, ANON_KEY, v); } return v || 'nols';
  }
  function sessionId() {
    var v = ss(true, SESSION_KEY); if (!v) { v = rid(); ss(false, SESSION_KEY, v); } return v || 'noss';
  }
  function lang() {
    try { return localStorage.getItem('wl_lang') || 'he'; } catch (e) { return 'he'; }
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function sanitize(m) {
    var out = {};
    if (!m || typeof m !== 'object') return out;
    Object.keys(m).slice(0, 8).forEach(function (k) {
      var v = m[k];
      if (typeof v === 'string') v = v.slice(0, 60);
      if (v === null || ['string', 'number', 'boolean'].indexOf(typeof v) >= 0) out[String(k).slice(0, 30)] = v;
    });
    return out;
  }

  function send(event, meta, uid) {
    if (!event) return Promise.resolve();
    try {
      var body = JSON.stringify({
        app: APP,
        event: String(event).slice(0, 40),
        uid: (typeof uid === 'string') ? uid.slice(0, 128) : null,
        anonId: anonId(),
        sessionId: sessionId(),
        day: today(),
        lang: lang(),
        path: (location.pathname || '').slice(0, 120),
        meta: sanitize(meta)
      });
      return fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,   // survive page unload (e.g. tool navigation)
        mode: 'cors'
      }).catch(function () { /* never surface */ });
    } catch (e) {
      return Promise.resolve();
    }
  }

  window.WizeTrack = {
    init: function (appId, uid) { if (appId) { APP = String(appId).slice(0, 24); } this._uid = (typeof uid === 'string') ? uid : null; send('page_view', null, this._uid); return this; },
    track: function (event, meta) { return send(event, meta, this._uid); },
    signup: function (meta) { return send('signup', meta, this._uid); },
    login: function (meta) { return send('login', meta, this._uid); },
    toolOpen: function (meta) { return send('tool_open', meta, this._uid); },
    activation: function (meta) { return send('activation', meta, this._uid); }
  };
})();
