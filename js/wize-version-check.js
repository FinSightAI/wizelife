/*
 * wize-version-check.js — auto-update prompter
 *
 * Polls /version.json + listens to visibility-change and notifies the user
 * when a new app version is available. Critical for iOS Safari PWAs (where
 * SW background updates don't work) and as a belt-and-suspenders for all
 * other platforms.
 *
 * USAGE — each page sets BEFORE loading this script:
 *   <script>window.WIZE_APP_VERSION = '2026-05-17-1';</script>
 *   <script src="/js/wize-version-check.js" defer></script>
 *
 * version.json schema (served from each app's root):
 *   { "version": "2026-05-17-1" }
 *
 * Behaviour:
 *   - On load + every 60s + on visibility 'visible' → fetch version.json
 *   - If server version !== window.WIZE_APP_VERSION → show banner
 *   - Banner click → location.reload(true) (forces SW + HTTP refresh)
 *   - 4 languages (he/en/pt/es) via localStorage.wl_lang
 */
(function () {
  if (window.__wizeVersionCheck) return;
  window.__wizeVersionCheck = true;

  var LOCAL = window.WIZE_APP_VERSION || '';
  if (!LOCAL) return; // page didn't set version — skip silently

  var ENDPOINT = '/version.json';
  var POLL_MS = 60000;
  var BANNER_ID = 'wize-update-banner';

  // D3 — never let the update prompt compete with the first-impression hero.
  // Suppress it for the first ~120s of a SESSION (persisted in sessionStorage so
  // an in-session reload doesn't reset the grace window). Detection still runs;
  // we just defer surfacing the toast until the grace window has elapsed.
  var GRACE_MS = 120000;
  var _sessStart = (function () {
    try {
      var s = sessionStorage.getItem('wize_vc_session_start');
      if (s) return parseInt(s, 10);
      var now = Date.now();
      sessionStorage.setItem('wize_vc_session_start', String(now));
      return now;
    } catch (e) { return Date.now(); }
  })();
  function withinGrace() { return (Date.now() - _sessStart) < GRACE_MS; }

  function getLang() {
    try {
      var stored = (localStorage.getItem('wl_lang') || '').slice(0, 2);
      if (['he', 'en', 'pt', 'es'].indexOf(stored) >= 0) return stored;
      var nav = ((navigator.language || navigator.userLanguage || '').slice(0, 2)).toLowerCase();
      if (['he', 'en', 'pt', 'es'].indexOf(nav) >= 0) return nav;
      return 'en';
    } catch (e) { return 'en'; }
  }

  var TR = {
    he: { msg: 'גרסה חדשה זמינה', btn: 'רענן' },
    en: { msg: 'New version available', btn: 'Refresh' },
    pt: { msg: 'Nova versão disponível', btn: 'Atualizar' },
    es: { msg: 'Nueva versión disponible', btn: 'Actualizar' },
  };

  // D3 — make the update prompt UNOBTRUSIVE: a small dismissible TOAST anchored
  // to the bottom corner (above any mobile bottom-nav + safe-area) instead of a
  // full-width top banner that ate first-screen / hero space. The Refresh action
  // is unchanged. Update detection is unchanged.
  function showBanner(newVersion) {
    if (document.getElementById(BANNER_ID)) return;
    var lang = getLang();
    var tr = TR[lang] || TR.he;
    var dir = lang === 'he' ? 'rtl' : 'ltr';
    var bar = document.createElement('div');
    bar.id = BANNER_ID;
    bar.setAttribute('role', 'status');
    bar.setAttribute('dir', dir);
    bar.style.cssText = [
      'position:fixed',
      // Sit above a 56px mobile bottom-nav when present + the safe-area inset.
      'bottom:calc(56px + 14px + env(safe-area-inset-bottom))',
      'inset-inline-end:14px',
      'max-width:calc(100vw - 28px)',
      'z-index:100000',
      'background:linear-gradient(135deg,#6366f1,#8b5cf6)',
      'color:#fff', 'padding:9px 10px 9px 13px',
      'border-radius:12px',
      'font:600 12px Inter,-apple-system,sans-serif',
      'box-shadow:0 8px 28px rgba(99,102,241,0.45)',
      'display:flex', 'align-items:center', 'gap:10px',
      'animation:wize-toast-in 0.28s cubic-bezier(.16,1,.3,1)',
    ].join(';');
    bar.innerHTML =
      '<span style="white-space:nowrap">✨ ' + tr.msg + '</span>' +
      '<button id="wize-update-btn" style="background:rgba(255,255,255,0.22);border:1px solid rgba(255,255,255,0.4);color:#fff;padding:6px 12px;border-radius:8px;font:700 11px Inter,sans-serif;cursor:pointer;min-height:32px">' + tr.btn + ' →</button>' +
      '<button id="wize-update-dismiss" aria-label="dismiss" style="background:none;border:none;color:rgba(255,255,255,0.75);cursor:pointer;font-size:18px;line-height:1;padding:2px 4px">×</button>';

    // Inject animation keyframes once
    if (!document.getElementById('wize-banner-css')) {
      var st = document.createElement('style');
      st.id = 'wize-banner-css';
      st.textContent = '@keyframes wize-toast-in { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }'
        + '@media (prefers-reduced-motion: reduce){ #' + BANNER_ID + '{ animation:none !important } }';
      document.head.appendChild(st);
    }
    document.body.appendChild(bar);

    document.getElementById('wize-update-btn').addEventListener('click', function () {
      // 1. Tell the waiting SW to skip waiting and become active immediately.
      //    Without this the new SW stays in "waiting" state across reloads
      //    and the banner keeps reappearing.
      // 2. Store the new version in localStorage so the check after reload
      //    sees we've acknowledged it (belt-and-suspenders for the 2.5s delay).
      var acknowledged = false;
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            regs.forEach(function (r) {
              if (r.waiting) {
                r.waiting.postMessage({ type: 'SKIP_WAITING' });
                acknowledged = true;
              }
            });
          });
        }
      } catch (e) {}
      // Persist the SERVER version (not LOCAL) so a post-reload check doesn't
      // immediately re-show the banner. Bug fix 2026-05-26: was saving LOCAL
      // (old version) which made the comparison `acked === j.version` always
      // false, so the banner reappeared after every reload.
      try { localStorage.setItem('wize_acked_version', newVersion || LOCAL); } catch (e) {}
      // Delay reload slightly so postMessage has time to process, then force
      // a hard reload that bypasses HTTP cache + SW cache.
      setTimeout(function () {
        var u = new URL(window.location.href);
        u.searchParams.set('_v', Date.now().toString(36));
        window.location.replace(u.toString());
      }, 300);
    });
    document.getElementById('wize-update-dismiss').addEventListener('click', function () {
      bar.remove();
    });
  }

  var _checking = false;
  function check() {
    if (_checking) return;
    _checking = true;
    fetch(ENDPOINT + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.version && j.version !== LOCAL) {
          // Skip banner if user already clicked Refresh for this exact version
          try {
            var acked = localStorage.getItem('wize_acked_version');
            if (acked === j.version) return;
          } catch (e) {}
          // Defer surfacing during the first-impression grace window; re-check
          // exactly when it elapses so the toast still appears (once) this session.
          if (withinGrace()) {
            setTimeout(function () { if (!document.getElementById(BANNER_ID)) showBanner(j.version); }, GRACE_MS - (Date.now() - _sessStart) + 50);
            return;
          }
          showBanner(j.version);
        }
      })
      .catch(function () {})
      .then(function () { _checking = false; });
  }

  // Initial check after a small delay so initial paint isn't blocked
  setTimeout(check, 2500);
  // Periodic check
  setInterval(check, POLL_MS);
  // On tab/PWA refocus
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') check();
  });
})();
