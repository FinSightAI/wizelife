/* WizeLife shared bottom navigation (mobile only)
   Drop-in: <script src="https://wizelife.ai/js/wize-bottom-nav.js" defer></script>
   - Visible only on viewports ≤ 768px
   - Adds 70px bottom padding to <body> so content isn't covered
   - Highlights the current app
   - Forwards SSO (wl_token / wl_nick / wl_plan) + lang via URL params
*/
(function () {
  if (window.__wizeBottomNavLoaded) return;
  window.__wizeBottomNavLoaded = true;

  var APPS = [
    { id: 'money',  url: 'https://finsightai.github.io/finsight/', e: '💰',
      label: { he: 'כסף',     en: 'Money',  pt: 'Dinheiro', es: 'Dinero'  } },
    { id: 'tax',    url: 'https://mastermove.vercel.app/advisor',  e: '📊',
      label: { he: 'מס',       en: 'Tax',    pt: 'Imposto',  es: 'Impuesto'} },
    { id: 'health', url: 'https://vitara.onrender.com/',            e: '❤️',
      label: { he: 'בריאות',   en: 'Health', pt: 'Saúde',    es: 'Salud'   } },
    { id: 'travel', url: 'https://nodedai.streamlit.app/',          e: '✈️',
      label: { he: 'טיולים',   en: 'Travel', pt: 'Viagem',   es: 'Viaje'   } },
    { id: 'deal',   url: 'https://check-deal.vercel.app/',          e: '🛒',
      label: { he: 'דילים',    en: 'Deals',  pt: 'Ofertas',  es: 'Ofertas' } }
  ];

  function detectCurrent() {
    var h = (location.host || '').toLowerCase();
    var p = (location.pathname || '').toLowerCase();
    if (h.indexOf('finsightai.github.io') >= 0 && p.indexOf('/finsight') >= 0) return 'money';
    if (h.indexOf('mastermove') >= 0) return 'tax';
    if (h.indexOf('vitara') >= 0 || h.indexOf('rambam') >= 0) return 'health';
    if (h.indexOf('streamlit') >= 0 || h.indexOf('wizetravel') >= 0 || h.indexOf('mega-traveller') >= 0) return 'travel';
    if (h.indexOf('check-deal') >= 0 || h.indexOf('wizedeal') >= 0) return 'deal';
    return null; // wizelife.ai itself
  }

  function getLang() {
    try {
      return localStorage.getItem('wl_lang')
          || (document.documentElement.lang || 'he').slice(0, 2);
    } catch (e) { return 'he'; }
  }

  function ssoUrl(base) {
    try {
      var sso = {};
      try { sso = JSON.parse(localStorage.getItem('wl_sso') || '{}'); } catch (e) {}
      var params = new URLSearchParams();
      if (sso.token) params.set('wl_token', sso.token);
      if (sso.nick) params.set('wl_nick', sso.nick);
      var plan = sso.plan || localStorage.getItem('wl_plan');
      if (plan) params.set('wl_plan', plan);
      params.set('lang', getLang());
      var qs = params.toString();
      if (!qs) return base;
      return base + (base.indexOf('?') >= 0 ? '&' : '?') + qs;
    } catch (e) { return base; }
  }

  function injectStyle() {
    /* Visual = identical to RAMBAM/WizeHealth original bottom-nav */
    var css = ''
      + '@media (max-width: 820px) {'
      + '  body { padding-bottom: calc(56px + env(safe-area-inset-bottom)) !important; }'
      + '  #wize-bottom-nav {'
      /* explicitly reset top — page-level nav{top:0} would otherwise win and pin our bar to the top */
      + '    position: fixed !important; top: auto !important; bottom: 0 !important; left: 0 !important; right: 0 !important;'
      + '    background: rgba(13,21,40,0.95);'
      + '    -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);'
      + '    border-top: 1px solid rgba(255,255,255,0.08);'
      + '    height: calc(56px + env(safe-area-inset-bottom));'
      + '    padding: 0 10px env(safe-area-inset-bottom);'
      + '    display: flex; justify-content: space-around; align-items: center;'
      + '    z-index: 400;'
      + '    font-family: -apple-system, system-ui, "Inter", "Heebo", sans-serif;'
      + '  }'
      + '  #wize-bottom-nav a.wbn-btn {'
      + '    display: flex; flex-direction: column; align-items: center; justify-content: center;'
      + '    gap: 2px; background: none; border: none;'
      + '    color: rgba(255,255,255,0.55);'
      + '    cursor: pointer;'
      + '    text-decoration: none;'
      + '    padding: 6px 12px; border-radius: 8px;'
      + '    transition: all .2s;'
      + '    font-family: inherit;'
      + '    font-size: 10px; font-weight: 600;'
      + '    flex: 1 1 0; min-width: 0;'
      + '  }'
      + '  #wize-bottom-nav a.wbn-btn .wbn-e { font-size: 20px; line-height: 1; }'
      + '  #wize-bottom-nav a.wbn-btn .wbn-l { font-size: 10px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }'
      + '  #wize-bottom-nav a.wbn-btn:hover,'
      + '  #wize-bottom-nav a.wbn-btn.wbn-active { color: #a5b4fc; }'
      + '  #wize-bottom-nav a.wbn-btn:active { opacity: .65; }'
      + '}'
      + '@media (min-width: 821px) {'
      + '  #wize-bottom-nav { display: none !important; }'
      + '}';
    var s = document.createElement('style');
    s.id = 'wize-bottom-nav-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function build() {
    if (document.getElementById('wize-bottom-nav')) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', build);
      return;
    }
    injectStyle();
    var lang = getLang();
    var cur = detectCurrent();
    var nav = document.createElement('nav');
    nav.id = 'wize-bottom-nav';
    nav.setAttribute('aria-label', 'WizeLife apps');
    APPS.forEach(function (a) {
      var link = document.createElement('a');
      link.href = ssoUrl(a.url);
      link.className = 'wbn-btn' + (a.id === cur ? ' wbn-active' : '');
      var label = (a.label[lang] || a.label.en);
      link.innerHTML =
        '<span class="wbn-e" aria-hidden="true">' + a.e + '</span>' +
        '<span class="wbn-l">' + label + '</span>';
      nav.appendChild(link);
    });
    document.body.appendChild(nav);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
