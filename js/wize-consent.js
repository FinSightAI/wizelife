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

  var lang = (function () {
    try {
      var l = (localStorage.getItem('wl_lang') || (navigator.language || 'en').slice(0, 2)).toLowerCase();
      return ['he', 'en', 'pt', 'es'].indexOf(l) >= 0 ? l : 'en';
    } catch (e) { return 'en'; }
  })();

  var T = {
    he: { msg: 'אנו משתמשים באחסון מקומי כדי להפעיל את האפליקציה, ובמזהה אנונימי לסטטיסטיקות שימוש (ללא צד-שלישי, ללא פרסום).', all: 'אשר הכל', ess: 'חיוני בלבד', more: 'פרטיות' },
    en: { msg: 'We use local storage to run the app, and an anonymous id for usage statistics (no third parties, no ads).', all: 'Accept all', ess: 'Essential only', more: 'Privacy' },
    pt: { msg: 'Usamos armazenamento local para executar o app e um id anônimo para estatísticas de uso (sem terceiros, sem anúncios).', all: 'Aceitar tudo', ess: 'Apenas essencial', more: 'Privacidade' },
    es: { msg: 'Usamos almacenamiento local para ejecutar la app y un id anónimo para estadísticas de uso (sin terceros, sin anuncios).', all: 'Aceptar todo', ess: 'Solo esencial', more: 'Privacidad' }
  };
  var t = T[lang] || T.en;
  var dir = lang === 'he' ? 'rtl' : 'ltr';

  function show() {
    if (document.getElementById('wl-consent')) return;
    var bar = document.createElement('div');
    bar.id = 'wl-consent';
    bar.setAttribute('dir', dir);
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', t.more);
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;'
      + 'background:rgba(15,18,32,0.97);color:#e7ebff;border:1px solid rgba(255,255,255,0.12);'
      + 'border-radius:14px;padding:12px 14px;box-shadow:0 10px 40px rgba(0,0,0,0.45);'
      + 'font:400 13px/1.5 Inter,-apple-system,system-ui,sans-serif;display:flex;gap:12px;'
      + 'align-items:center;flex-wrap:wrap;max-width:720px;margin:0 auto;backdrop-filter:blur(10px)';

    var msg = document.createElement('div');
    msg.style.cssText = 'flex:1;min-width:200px';
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
      b.style.cssText = 'border:0;border-radius:9px;padding:9px 14px;min-height:40px;'
        + 'font:600 13px Inter,sans-serif;cursor:pointer;'
        + (primary ? 'background:#6366f1;color:#fff' : 'background:rgba(255,255,255,0.08);color:#cdd5f5');
      b.addEventListener('click', function () {
        set(val);
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
  }

  if (document.body) show();
  else document.addEventListener('DOMContentLoaded', show);
})();
