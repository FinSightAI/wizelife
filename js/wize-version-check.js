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
    try { return (localStorage.getItem('wl_lang') || 'he').slice(0, 2); }
    catch (e) { return 'he'; }
  }

  var TR = {
    he: { msg: 'גרסה חדשה זמינה', btn: 'רענן' },
    en: { msg: 'New version available', btn: 'Refresh' },
    pt: { msg: 'Nova versão disponível', btn: 'Atualizar' },
    es: { msg: 'Nueva versión disponible', btn: 'Actualizar' },
  };

  function showBanner() {
    if (document.getElementById(BANNER_ID)) return;
    var lang = getLang();
    var tr = TR[lang] || TR.he;
    var bar = document.createElement('div');
    bar.id = BANNER_ID;
    bar.setAttribute('role', 'alert');
    bar.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0',
      'z-index:2147483645',
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
      // Force a hard reload: bypass HTTP cache + SW
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            regs.forEach(function (r) { r.update(); });
          });
        }
      } catch (e) {}
      // Add a cache-busting param to force HTML re-fetch on iOS Safari (which
      // otherwise serves the cached HTML).
      var u = new URL(window.location.href);
      u.searchParams.set('_v', Date.now().toString(36));
      window.location.replace(u.toString());
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
        if (j && j.version && j.version !== LOCAL) showBanner();
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
