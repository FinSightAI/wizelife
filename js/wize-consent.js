/**
 * wize-consent.js — WizeLife cookie/analytics consent (GDPR / ePrivacy / LGPD).
 *
 * The suite stores a persistent anonymous id (wl_anon) + funnel events for usage
 * statistics. That is NOT "strictly necessary", so under ePrivacy/GDPR it needs
 * consent. This slim, NON-BLOCKING bottom banner asks once; the choice is saved
 * in localStorage `wl_consent` ('all' | 'essential'). wize-track.js only fires
 * analytics when wl_consent === 'all' (it reads the flag directly, so this works
 * regardless of script load order).
 *
 * Essential app function, sign-in, and PII-stripped error/security monitoring
 * (no persistent profiling) run regardless — that is legitimate interest.
 *
 * Exposes window.WizeConsent.analyticsAllowed() for any script to check.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.__wizeConsent) return;
  window.__wizeConsent = true;

  var KEY = 'wl_consent';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return 'essential'; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* ignore */ } }

  window.WizeConsent = {
    analyticsAllowed: function () { return get() === 'all'; },
    decision: get,
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  };

  if (get()) return; // already decided — no banner

  // Resolve the per-app brand accent ONCE, at render time. We do NOT rely on the
  // CSS `var(--accent)` resolving — this banner is appended to <body> and on some
  // apps the var isn't in scope there, so it silently fell back to indigo. Read an
  // explicit global instead. Order: window.WIZE_ACCENT → per-WIZE_APP map → indigo.
  var accent = (function () {
    try {
      // Each app flips window.WIZE_APP between an early long name (wizetravel) and a
      // late short name (travel) — include BOTH so the accent is correct whichever
      // value is live when this banner renders.
      var map = {
        wizemoney: '#10b981', money: '#10b981',
        wizetax: '#f59e0b', tax: '#f59e0b',
        wizedeal: '#8b5cf6', deal: '#8b5cf6',
        wizehealth: '#ec4899', health: '#ec4899',
        wizetravel: '#06b6d4', travel: '#06b6d4',
        wizelife: '#4f46e5'
      };
      return window.WIZE_ACCENT || map[window.WIZE_APP] || '#6366f1';
    } catch (e) { return '#6366f1'; }
  })();

  var lang = (function () {
    try {
      // Match the language the PAGE is actually showing: wl_lang, then the <html lang>
      // the page's i18n sets, then the browser. (Was navigator.language only → showed
      // Hebrew on an English page when the browser was Hebrew.)
      var l = String(localStorage.getItem('wl_lang') || document.documentElement.getAttribute('lang') || navigator.language || 'en').slice(0, 2).toLowerCase();
      return ['he', 'en', 'pt', 'es'].indexOf(l) >= 0 ? l : 'en';
    } catch (e) { return 'en'; }
  })();

  var T = {
    he: { msg: 'אנו משתמשים באחסון מקומי כדי להפעיל את האפליקציה, ובמזהה אנונימי לסטטיסטיקות שימוש (ללא צד-שלישי, ללא פרסום).', all: 'אשר הכל', ess: 'דחה', more: 'פרטיות' },
    en: { msg: 'We use local storage to run the app, and an anonymous id for usage statistics (no third parties, no ads).', all: 'Accept all', ess: 'Decline', more: 'Privacy' },
    pt: { msg: 'Usamos armazenamento local para executar o app e um id anônimo para estatísticas de uso (sem terceiros, sem anúncios).', all: 'Aceitar tudo', ess: 'Recusar', more: 'Privacidade' },
    es: { msg: 'Usamos almacenamiento local para ejecutar la app y un id anónimo para estadísticas de uso (sin terceros, sin anuncios).', all: 'Aceptar todo', ess: 'Rechazar', more: 'Privacidad' }
  };
  var t = T[lang] || T.en;
  var dir = lang === 'he' ? 'rtl' : 'ltr';

  // D4 — reserve space so the fixed bottom banner never occludes page content /
  // bottom CTAs on mobile. We add bottom padding to <body> equal to the banner
  // height (+ the iOS/Android safe-area inset), and remove it the moment the
  // user decides/dismisses. Stored on a custom property so we can subtract it
  // cleanly without clobbering any existing inline padding.
  var _prevBodyPadBottom = null;
  // D4b — when a mobile bottom-nav (#wize-bottom-nav, 56px) is on screen the banner
  // must float ABOVE it, not overlap its tap targets. Returns the visible nav height
  // (0 on desktop / when no nav), so the banner bottom + reserved body padding both
  // clear it.
  function bottomNavOffset() {
    try {
      var nav = document.getElementById('wize-bottom-nav');
      if (nav && nav.offsetParent !== null) {
        var r = nav.getBoundingClientRect();
        if (r.height > 0) return Math.ceil(r.height);
      }
    } catch (e) { /* ignore */ }
    return 0;
  }
  function reserveSpace(bar) {
    try {
      var body = document.body;
      if (!body) return;
      if (_prevBodyPadBottom === null) _prevBodyPadBottom = body.style.paddingBottom || '';
      var h = bar.getBoundingClientRect().height || bar.offsetHeight || 64;
      // banner sits (12px + any bottom-nav) above the bottom edge → reserve height + that gap + safe-area.
      body.style.paddingBottom = 'calc(' + Math.ceil(h + 12 + bottomNavOffset()) + 'px + env(safe-area-inset-bottom))';
    } catch (e) { /* ignore */ }
  }
  function releaseSpace() {
    try {
      if (document.body && _prevBodyPadBottom !== null) {
        document.body.style.paddingBottom = _prevBodyPadBottom;
        _prevBodyPadBottom = null;
      }
    } catch (e) { /* ignore */ }
  }

  function show() {
    if (document.getElementById('wl-consent')) return;
    var bar = document.createElement('div');
    bar.id = 'wl-consent';
    bar.setAttribute('dir', dir);
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', t.more);
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(' + (12 + bottomNavOffset()) + 'px + env(safe-area-inset-bottom));z-index:2147483000;'
      + 'background:rgba(15,18,32,0.97);color:#e7ebff;border:1px solid rgba(255,255,255,0.12);'
      + 'border-radius:14px;padding:10px 12px;box-shadow:0 10px 40px rgba(0,0,0,0.45);'
      + 'font:400 12px/1.4 Inter,-apple-system,system-ui,sans-serif;display:flex;gap:8px;'
      + 'align-items:center;flex-wrap:nowrap;max-width:720px;margin:0 auto;backdrop-filter:blur(10px)';

    var msg = document.createElement('div');
    msg.style.cssText = 'flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis';
    var a = document.createElement('a');
    a.href = 'https://wizelife.ai/privacy.html';
    a.target = '_blank'; a.rel = 'noopener';
    a.style.color = '#a5b4fc';
    a.textContent = t.more;
    msg.textContent = t.msg + ' ';
    msg.appendChild(a);

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:8px;flex-shrink:0';
    function mk(label, primary, val) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'border:0;border-radius:9px;padding:8px 12px;min-height:44px;white-space:nowrap;'
        + 'font:600 12px Inter,sans-serif;cursor:pointer;flex-shrink:0;'
        + (primary ? ('background:' + accent + ';color:#fff') : 'background:rgba(255,255,255,0.10);color:#e7ebff;border:1px solid rgba(255,255,255,0.30)');
      b.addEventListener('click', function () {
        set(val);
        releaseSpace();
        window.removeEventListener('resize', onResize);
        try { bar.remove(); } catch (e) { /* ignore */ }
        try { window.dispatchEvent(new Event('wl-consent-changed')); } catch (e) { /* ignore */ }
      });
      return b;
    }
    btns.appendChild(mk(t.ess, false, 'essential'));
    btns.appendChild(mk(t.all, true, 'all'));
    bar.appendChild(msg);
    bar.appendChild(btns);
    (document.body || document.documentElement).appendChild(bar);

    // Reserve space AFTER layout so the measured height is accurate (the banner
    // wraps to 2 rows on narrow phones). Re-measure on resize/orientation change.
    function onResize() { reserveSpace(bar); }
    requestAnimationFrame(function () { reserveSpace(bar); });
    window.addEventListener('resize', onResize);
  }

  if (document.body) show();
  else document.addEventListener('DOMContentLoaded', show);
})();
