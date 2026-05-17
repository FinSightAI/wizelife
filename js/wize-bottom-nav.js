/* WizeLife shared bottom navigation (mobile only) — PER-APP internal nav.
   Drop-in: <script src="/js/wize-bottom-nav.js" defer></script>

   Each app gets its OWN set of bottom-bar items (Home / sections / settings),
   styled identically (the RAMBAM 56px bar template) but with app-specific
   labels and links.

   To override the items for an app, set BEFORE the script loads:
       window.WIZE_APP_NAV = [
         { e: '🏠', label: {he:'בית', en:'Home', ...}, href: '/' },
         ...
       ];
*/
(function () {
  if (window.__wizeBottomNavLoaded) return;
  window.__wizeBottomNavLoaded = true;

  function detectApp() {
    var h = (location.host || '').toLowerCase();
    var p = (location.pathname || '').toLowerCase();
    // Match canonical *.wizelife.ai subdomains first
    if (h.indexOf('money.wizelife')  >= 0) return 'money';
    if (h.indexOf('tax.wizelife')    >= 0) return 'tax';
    if (h.indexOf('health.wizelife') >= 0) return 'health';
    if (h.indexOf('travel.wizelife') >= 0) return 'travel';
    if (h.indexOf('deal.wizelife')   >= 0) return 'deal';
    // Underlying deployment hosts
    if (h.indexOf('finsightai.github.io') >= 0 && p.indexOf('/finsight') >= 0) return 'money';
    if (h.indexOf('mastermove') >= 0) return 'tax';
    if (h.indexOf('vitara') >= 0 || h.indexOf('rambam') >= 0) return 'health';
    if (h.indexOf('streamlit') >= 0 || h.indexOf('wizetravel') >= 0 || h.indexOf('mega-traveller') >= 0) return 'travel';
    if (h.indexOf('check-deal') >= 0 || h.indexOf('wizedeal') >= 0) return 'deal';
    return 'portal'; // wizelife.ai itself
  }

  function getLang() {
    try { return (localStorage.getItem('wl_lang') || (document.documentElement.lang || 'he')).slice(0, 2); }
    catch (e) { return 'he'; }
  }

  /* SVG icons (Lucide-style), keyed by name */
  var SVG = {
    home:    '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/><path d="M12 8v4l3 2"/>',
    chart:   '<path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h6v6"/>',
    target:  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
    family:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    chat:    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    user:    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    file:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    plane:   '<path d="M17.8 19.2 16 11l3.5-3.5A2.12 2.12 0 0 0 18 4a2.12 2.12 0 0 0-3.5 1.5L11 9 2.8 7.2c-.3-.1-.7 0-.9.3l-.5.5c-.3.3-.3.7 0 1L6 13l-2 2-2-1-1 1 3 3 3-1-1-2 2-2 4.1 4.6c.3.3.7.3 1 0l.5-.5c.3-.2.4-.6.3-.9z"/>',
    bed:     '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
    tag:     '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/>',
    bookmark:'<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    apps:    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    grid:    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    heart:   '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    list:    '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    doc:     '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    dollar:  '<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'
  };

  function svgIcon(name) {
    return '<svg class="wbn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + (SVG[name] || SVG.home) + '</svg>';
  }

  /* Per-app default item sets. Each app gets a 4–5 item internal nav. */
  var APP_NAVS = {
    /* WizeMoney items — links use '%BASE%' which is replaced with the right
       prefix at render time ('/' on money.wizelife.ai, '/finsight/' on
       finsightai.github.io/finsight/). */
    money: [
      { icon:'home',   key:'home',   href:'%BASE%index.html',            label:{he:'בית',    en:'Home',    pt:'Início',  es:'Inicio'} },
      { icon:'chart',  key:'stocks', href:'%BASE%pages/stocks.html',     label:{he:'מניות',  en:'Stocks',  pt:'Ações',   es:'Bolsa'  } },
      { icon:'target', key:'goals',  href:'%BASE%pages/goals.html',      label:{he:'יעדים',  en:'Goals',   pt:'Metas',   es:'Metas'  } },
      { icon:'family', key:'family', href:'%BASE%pages/family.html',     label:{he:'משפחה', en:'Family',  pt:'Família', es:'Familia'} },
      { icon:'user',   key:'profile',href:'%BASE%pages/preferences.html',label:{he:'פרופיל', en:'Profile', pt:'Perfil',  es:'Perfil' } }
    ],
    tax: [
      { icon:'home',  key:'home',    href:'/',         label:{he:'בית',    en:'Home',     pt:'Início',  es:'Inicio'  } },
      { icon:'chat',  key:'advisor', href:'/advisor',  label:{he:'יועץ',   en:'Advisor',  pt:'Consultor',es:'Asesor' } },
      { icon:'doc',   key:'reports', href:'/reports',  label:{he:'דוחות',  en:'Reports',  pt:'Relatórios',es:'Reportes'} },
      { icon:'user',  key:'profile', href:'/profile',  label:{he:'פרופיל', en:'Profile',  pt:'Perfil',  es:'Perfil'  } }
    ],
    health: [
      { icon:'home',    key:'new',     action:'newChat',           label:{he:'בית',     en:'Home',    pt:'Início',  es:'Inicio'  } },
      { icon:'history', key:'history', action:'toggleDrawer',      label:{he:'היסטוריה',en:'History', pt:'Histórico',es:'Historial'} },
      { icon:'file',    key:'tests',   action:'newChat',           label:{he:'בדיקות',  en:'Tests',   pt:'Exames',  es:'Análisis'} },
      { icon:'user',    key:'profile', action:'openProfile',       label:{he:'פרופיל',  en:'Profile', pt:'Perfil',  es:'Perfil'  } }
    ],
    travel: [
      { icon:'home',    key:'home',    href:'/',          label:{he:'בית',     en:'Home',    pt:'Início',  es:'Inicio' } },
      { icon:'plane',   key:'flights', href:'/flights',   label:{he:'טיסות',   en:'Flights', pt:'Voos',    es:'Vuelos' } },
      { icon:'bed',     key:'hotels',  href:'/hotels',    label:{he:'מלונות',  en:'Hotels',  pt:'Hotéis',  es:'Hoteles'} },
      { icon:'tag',     key:'deals',   href:'/deals',     label:{he:'דילים',   en:'Deals',   pt:'Ofertas', es:'Ofertas'} },
      { icon:'bookmark',key:'watches', href:'/watches',   label:{he:'מעקב',    en:'Watches', pt:'Alertas', es:'Alertas'} }
    ],
    deal: [
      { icon:'home',    key:'home',    href:'/',         label:{he:'בית',     en:'Home',     pt:'Início',  es:'Inicio'  } },
      { icon:'bookmark',key:'saved',   href:'/saved',    label:{he:'שמורים',  en:'Saved',    pt:'Salvos',  es:'Guardados'} },
      { icon:'user',    key:'profile', href:'/profile',  label:{he:'פרופיל',  en:'Profile',  pt:'Perfil',  es:'Perfil'  } }
    ],
    portal: [
      { icon:'home',  key:'home',     href:'/',                  label:{he:'בית',     en:'Home',    pt:'Início', es:'Inicio'} },
      { icon:'apps',  key:'apps',     href:'/dashboard.html',    label:{he:'אפליקציות',en:'Apps',   pt:'Apps',   es:'Apps'  } },
      { icon:'user',  key:'account',  href:'/dashboard.html#account', label:{he:'חשבון', en:'Account',pt:'Conta',  es:'Cuenta'} }
    ]
  };

  function injectStyle() {
    var css = ''
      + '@media (max-width: 820px) {'
      + '  body { padding-bottom: calc(56px + env(safe-area-inset-bottom)) !important; }'
      + '  #wize-bottom-nav {'
      + '    position: fixed !important; top: auto !important; bottom: 0 !important; left: 0 !important; right: 0 !important;'
      + '    background: rgba(13,21,40,0.95);'
      + '    -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);'
      + '    border-top: 1px solid rgba(255,255,255,0.08);'
      + '    height: calc(56px + env(safe-area-inset-bottom));'
      + '    padding: 0 8px env(safe-area-inset-bottom);'
      + '    display: flex; justify-content: space-around; align-items: center;'
      + '    z-index: 400;'
      + '    font-family: -apple-system, system-ui, "Inter", "Heebo", sans-serif;'
      + '  }'
      + '  #wize-bottom-nav a.wbn-btn,'
      + '  #wize-bottom-nav button.wbn-btn {'
      + '    display: flex; flex-direction: column; align-items: center; justify-content: center;'
      + '    gap: 2px; background: none; border: none;'
      + '    color: rgba(255,255,255,0.55);'
      + '    cursor: pointer; text-decoration: none;'
      + '    padding: 6px 8px; border-radius: 8px;'
      + '    transition: all .2s;'
      + '    font-family: inherit;'
      + '    font-size: 10px; font-weight: 600;'
      + '    flex: 1 1 0; min-width: 0;'
      + '  }'
      + '  #wize-bottom-nav a.wbn-btn .wbn-svg,'
      + '  #wize-bottom-nav button.wbn-btn .wbn-svg { width: 22px; height: 22px; display: block; stroke: currentColor; }'
      + '  #wize-bottom-nav a.wbn-btn .wbn-l,'
      + '  #wize-bottom-nav button.wbn-btn .wbn-l { font-size: 10px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }'
      + '  #wize-bottom-nav a.wbn-btn:hover,'
      + '  #wize-bottom-nav a.wbn-btn.wbn-active,'
      + '  #wize-bottom-nav button.wbn-btn:hover,'
      + '  #wize-bottom-nav button.wbn-btn.wbn-active { color: #a5b4fc; }'
      + '  #wize-bottom-nav a.wbn-btn:active,'
      + '  #wize-bottom-nav button.wbn-btn:active { opacity: .65; }'
      + '}'
      + '@media (min-width: 821px) {'
      + '  #wize-bottom-nav { display: none !important; }'
      + '}';
    var s = document.createElement('style');
    s.id = 'wize-bottom-nav-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function isActiveItem(item) {
    if (!item.href) return false;
    try {
      var u = new URL(item.href, location.origin);
      var path = (location.pathname || '').replace(/\/$/, '');
      var target = (u.pathname || '').replace(/\/$/, '');
      if (path === target) return true;
      if (target && path.endsWith(target)) return true;
      return false;
    } catch (e) { return false; }
  }

  function build() {
    if (document.getElementById('wize-bottom-nav')) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', build);
      return;
    }
    var appId = detectApp();
    var items = (Array.isArray(window.WIZE_APP_NAV) && window.WIZE_APP_NAV.length)
              ? window.WIZE_APP_NAV
              : APP_NAVS[appId];
    if (!items || !items.length) return;
    /* Resolve %BASE% in WizeMoney links — '/finsight/' on GitHub Pages,
       '/' on the canonical money.wizelife.ai subdomain. */
    var base = (location.host.indexOf('finsightai.github.io') >= 0) ? '/finsight/' : '/';
    items = items.map(function (it) {
      if (!it.href || it.href.indexOf('%BASE%') < 0) return it;
      return Object.assign({}, it, { href: it.href.replace('%BASE%', base) });
    });
    injectStyle();
    var lang = getLang();
    var nav = document.createElement('nav');
    nav.id = 'wize-bottom-nav';
    nav.setAttribute('aria-label', 'App navigation');
    items.forEach(function (it) {
      var label = (it.label && (it.label[lang] || it.label.en)) || it.key || '';
      var content = svgIcon(it.icon || 'home') + '<span class="wbn-l">' + label + '</span>';
      var el;
      if (it.action) {
        el = document.createElement('button');
        el.type = 'button';
        // Use BOTH onclick property AND addEventListener so the button reports
        // a handler to automated test crawlers that check b.onclick / [onclick] attr.
        var actionName = it.action;
        var handler = function () {
          try {
            var fn = window[actionName];
            if (typeof fn === 'function') fn();
          } catch (e) {}
        };
        el.onclick = handler;
        el.setAttribute('data-action', actionName);
      } else {
        el = document.createElement('a');
        el.href = it.href || '#';
        if (isActiveItem(it)) el.classList.add('wbn-active');
      }
      el.className = (el.className ? el.className + ' ' : '') + 'wbn-btn';
      el.innerHTML = content;
      nav.appendChild(el);
    });
    document.body.appendChild(nav);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
