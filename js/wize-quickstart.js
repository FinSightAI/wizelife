/**
 * wize-quickstart.js — shared "first actions" overlay across WizeLife sub-apps.
 *
 * Canonical location: TOTALIST/wizelife/js/wize-quickstart.js
 * Mirrored to: finance dashboard, RAMBAM/public, Check Deal/public,
 *              tax master/frontend/public, wizetravel-app/public.
 *
 * Usage: <script>window.WIZE_APP='tax';</script><script src=".../wize-quickstart.js" defer></script>
 *
 * Trigger order on first visit:
 *   1) wize-onboarding flow runs (existing) → sets wl_ob_<app>
 *   2) ~1.5s later, this script shows the quick-start overlay
 *   3) User clicks an action → dismissed forever (wl_qs_<app>)
 *
 * Skips entirely on WizeMoney (FinSight has its own Onboarding overlay in index.html).
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // ---------- per-app config ----------
  // Action URLs are RELATIVE to each app's origin so they work in both prod & local.
  const CFG = {
    tax: {
      color: '#f59e0b',
      brand: 'WizeTax',
      steps: [
        { icon: '💬', href: '/advisor',  k: 'chat'    },
        { icon: '📊', href: '/reports',  k: 'reports' },
        { icon: '👤', href: '/profile',  k: 'profile' },
        { icon: '🧮', href: '/',         k: 'simulator' },
      ],
    },
    travel: {
      color: '#3b82f6',
      brand: 'WizeTravel',
      steps: [
        { icon: '🏨', href: '/hotels',  k: 'hotels'  },
        { icon: '✈️', href: '/flights', k: 'flights' },
        { icon: '🔔', href: '/watches', k: 'alerts'  },
        { icon: '🤖', href: '/ai',      k: 'ai'      },
      ],
    },
    health: {
      color: '#ef4444',
      brand: 'WizeHealth',
      steps: [
        { icon: '💬', href: '/',           k: 'chat'   },
        { icon: '📁', href: '/data.html',  k: 'mydata' },
        { icon: '👨‍👩‍👧', href: '/share.html', k: 'family' },
      ],
    },
    deal: {
      color: '#a855f7',
      brand: 'WizeDeal',
      steps: [
        { icon: '🔍', href: '/',        k: 'compare' },
        { icon: '💾', href: '/saved',   k: 'saved'   },
        { icon: '📤', href: '/share',   k: 'share'   },
        { icon: '👤', href: '/profile', k: 'profile' },
      ],
    },
  };

  const TR = {
    he: {
      title:  'בואו נתחיל ב-{brand} 👋',
      sub:    'בחר את הפעולה הראשונה שלך:',
      later:  'אחר כך',
      tax:     { chat: 'שאל יועץ AI', reports: 'הדו"חות שלי', profile: 'הגדר פרופיל', simulator: 'סימולטור מס' },
      travel:  { hotels: 'חפש מלון', flights: 'חפש טיסה', alerts: 'הגדר התראת מחיר', ai: 'יועץ נסיעות AI' },
      health:  { chat: 'שאל את הרופא AI', mydata: 'נתונים רפואיים', family: 'שתף עם משפחה' },
      deal:    { compare: 'השווה עסקה', saved: 'עסקאות שמורות', share: 'שתף עסקה', profile: 'פרופיל' },
    },
    en: {
      title:  'Let\'s get started with {brand} 👋',
      sub:    'Pick your first action:',
      later:  'Later',
      tax:     { chat: 'Ask AI advisor', reports: 'My reports', profile: 'Set up profile', simulator: 'Tax simulator' },
      travel:  { hotels: 'Search hotels', flights: 'Search flights', alerts: 'Set price alert', ai: 'AI travel advisor' },
      health:  { chat: 'Ask AI doctor', mydata: 'My medical data', family: 'Share with family' },
      deal:    { compare: 'Compare a deal', saved: 'Saved deals', share: 'Share a deal', profile: 'Profile' },
    },
    pt: {
      title:  'Vamos começar no {brand} 👋',
      sub:    'Escolha sua primeira ação:',
      later:  'Mais tarde',
      tax:     { chat: 'Falar com consultor IA', reports: 'Meus relatórios', profile: 'Configurar perfil', simulator: 'Simulador de imposto' },
      travel:  { hotels: 'Buscar hotéis', flights: 'Buscar voos', alerts: 'Alerta de preço', ai: 'Consultor de viagens IA' },
      health:  { chat: 'Falar com médico IA', mydata: 'Meus dados médicos', family: 'Compartilhar com família' },
      deal:    { compare: 'Comparar oferta', saved: 'Ofertas salvas', share: 'Compartilhar oferta', profile: 'Perfil' },
    },
    es: {
      title:  'Empecemos con {brand} 👋',
      sub:    'Elige tu primera acción:',
      later:  'Más tarde',
      tax:     { chat: 'Consultar asesor IA', reports: 'Mis informes', profile: 'Configurar perfil', simulator: 'Simulador de impuestos' },
      travel:  { hotels: 'Buscar hoteles', flights: 'Buscar vuelos', alerts: 'Alerta de precio', ai: 'Asesor de viajes IA' },
      health:  { chat: 'Consultar médico IA', mydata: 'Mis datos médicos', family: 'Compartir con familia' },
      deal:    { compare: 'Comparar oferta', saved: 'Ofertas guardadas', share: 'Compartir oferta', profile: 'Perfil' },
    },
  };

  function getApp() {
    if (window.WIZE_APP && CFG[window.WIZE_APP]) return window.WIZE_APP;
    const h = location.hostname;
    if (/check-deal/.test(h)) return 'deal';
    if (/mastermove|wizetax/.test(h)) return 'tax';
    if (/wizetravel/.test(h)) return 'travel';
    if (/vitara|rambam/.test(h)) return 'health';
    return null;
  }

  function getLang() {
    try {
      const l = localStorage.getItem('wl_lang');
      if (l && TR[l]) return l;
    } catch (_) {}
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return TR[nav] ? nav : 'en';
  }

  function build(app, lang) {
    const cfg = CFG[app];
    const tr = TR[lang] || TR.en;
    if (!cfg || !tr || !tr[app]) return null;

    const isRtl = lang === 'he';
    const wrap = document.createElement('div');
    wrap.id = 'wlQuickStart';
    wrap.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    wrap.style.cssText = [
      'position:fixed','inset:0','z-index:99996','display:flex',
      'align-items:center','justify-content:center','padding:20px',
      'background:rgba(5,6,15,0.85)','backdrop-filter:blur(8px)',
      '-webkit-backdrop-filter:blur(8px)',
      'font-family:Inter,-apple-system,sans-serif',
      'animation:wlqsIn .2s ease-out',
    ].join(';');

    const style = document.createElement('style');
    style.textContent = '@keyframes wlqsIn{from{opacity:0}to{opacity:1}}'
      + '#wlQuickStart .wlqs-step:hover{background:rgba(255,255,255,0.07);transform:translateY(-1px)}'
      + '#wlQuickStart .wlqs-step:active{transform:translateY(0)}';
    wrap.appendChild(style);

    const titleText = tr.title.replace('{brand}', cfg.brand);
    const stepsHtml = cfg.steps
      .filter(function (s) { return tr[app][s.k]; })
      .map(function (s) {
        return '<a href="' + s.href + '" class="wlqs-step" data-k="' + s.k + '" style="'
          + 'display:flex;align-items:center;gap:12px;padding:14px 16px;'
          + 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);'
          + 'border-radius:12px;text-decoration:none;color:#eef2ff;'
          + 'transition:all .15s;cursor:pointer;">'
          + '<span style="font-size:24px;flex-shrink:0;line-height:1;">' + s.icon + '</span>'
          + '<span style="font-size:14px;font-weight:600;">' + tr[app][s.k] + '</span>'
          + '</a>';
      })
      .join('');

    wrap.innerHTML += [
      '<div style="max-width:380px;width:100%;background:linear-gradient(180deg,#0f1226,#0b0d1f);',
      'border:1px solid ' + cfg.color + '44;border-radius:16px;padding:24px 22px;',
      'box-shadow:0 20px 60px rgba(0,0,0,0.5);">',
        '<h2 style="margin:0 0 6px;font-size:18px;font-weight:800;color:#eef2ff;font-family:Plus Jakarta Sans,Inter,sans-serif;letter-spacing:-0.3px;">' + titleText + '</h2>',
        '<p style="margin:0 0 16px;font-size:13px;color:#9ca3af;line-height:1.4;">' + tr.sub + '</p>',
        '<div style="display:flex;flex-direction:column;gap:8px;">' + stepsHtml + '</div>',
        '<button id="wlqsLater" style="margin-top:14px;width:100%;background:none;border:none;color:#6b7280;',
        'font-size:12px;font-weight:600;cursor:pointer;padding:8px;font-family:inherit;">' + tr.later + '</button>',
      '</div>',
    ].join('');

    return wrap;
  }

  function dismiss(app) {
    try { localStorage.setItem('wl_qs_' + app, '1'); } catch (_) {}
    const n = document.getElementById('wlQuickStart');
    if (n) n.remove();
  }

  function show(app) {
    if (document.getElementById('wlQuickStart')) return;
    const lang = getLang();
    const el = build(app, lang);
    if (!el) return;
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target === el) dismiss(app); // click backdrop
    });
    const later = el.querySelector('#wlqsLater');
    if (later) later.addEventListener('click', function () { dismiss(app); });
    el.querySelectorAll('.wlqs-step').forEach(function (a) {
      a.addEventListener('click', function () { dismiss(app); });
    });
  }

  function init() {
    const app = getApp();
    if (!app) return;
    try {
      if (localStorage.getItem('wl_qs_' + app)) return; // already dismissed
    } catch (_) {}
    // Show after the existing onboarding flow has been dismissed.
    // wize-onboarding sets wl_ob_<app> when done. If not set yet, wait for it.
    function attempt(attempts) {
      try {
        if (localStorage.getItem('wl_ob_' + app)) {
          setTimeout(function () { show(app); }, 600);
          return;
        }
      } catch (_) {}
      if (attempts > 0) setTimeout(function () { attempt(attempts - 1); }, 1500);
    }
    attempt(20); // ~30s of polling
  }

  window.WizeQuickStart = {
    show: show,
    dismiss: dismiss,
    reset: function () {
      const app = getApp();
      if (app) try { localStorage.removeItem('wl_qs_' + app); } catch (_) {}
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
