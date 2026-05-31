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

  function showBanner(newVersion) {
    if (document.getElementById(BANNER_ID)) return;
    var lang = getLang();
    var tr = TR[lang] || TR.he;
    var bar = document.createElement('div');
    bar.id = BANNER_ID;
    bar.setAttribute('role', 'alert');
    bar.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0',
      'z-index:100000',
      'background:linear-gradient(90deg,#6366f1,#8b5cf6)',
      'color:#fff', 'padding:8px 14px',
      'font:600 12px Inter,-apple-system,sans-serif',
      'text-align:center', 'box-shadow:0 2px 8px rgba(99,102,241,0.4)',
      'display:flex', 'align-items:center', 'justify-content:center', 'gap:12px',
      'animation:wize-banner-in 0.3s ease',
    ].join(';');
    bar.innerHTML =
      '<span>✨ ' + tr.msg + '</span>' +
      '<button id="wize-update-btn" style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:#fff;padding:4px 12px;border-radius:6px;font:700 11px Inter,sans-serif;cursor:pointer">' + tr.btn + ' →</button>' +
      '<button id="wize-update-dismiss" aria-label="dismiss" style="background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:16px;line-height:1;padding:0 4px">×</button>';

    // Inject animation keyframes once
    if (!document.getElementById('wize-banner-css')) {
      var st = document.createElement('style');
      st.id = 'wize-banner-css';
      st.textContent = '@keyframes wize-banner-in { from { transform:translateY(-100%) } to { transform:translateY(0) } }';
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
