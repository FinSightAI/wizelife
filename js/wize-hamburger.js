/* WizeLife shared hamburger menu (mobile only).
   Drop-in: <script src="/js/wize-hamburger.js" defer></script>

   - Injects a ☰ button at top-right of the viewport (mobile only, ≤820px).
   - Opens a side drawer with: app switcher (5 sister apps), language pills,
     theme toggle, account block, and a "Back to WizeLife" link.
   - Always closable: ✕ button, click on backdrop, Escape, swipe-out.
*/
(function () {
  if (window.__wizeHamburgerLoaded) return;
  window.__wizeHamburgerLoaded = true;

  /* ── Apps registry (matches bottom-nav, just with full names) ── */
  var APPS = [
    { id:'money',  url:'https://money.wizelife.ai/',  e:'💰', label:{he:'WizeMoney', en:'WizeMoney', pt:'WizeMoney', es:'WizeMoney'} },
    { id:'tax',    url:'https://tax.wizelife.ai/',    e:'📊', label:{he:'WizeTax',   en:'WizeTax',   pt:'WizeTax',   es:'WizeTax'  } },
    { id:'health', url:'https://health.wizelife.ai/', e:'❤️', label:{he:'WizeHealth',en:'WizeHealth',pt:'WizeHealth',es:'WizeHealth'} },
    { id:'travel', url:'https://travel.wizelife.ai/', e:'✈️', label:{he:'WizeTravel',en:'WizeTravel',pt:'WizeTravel',es:'WizeTravel'} },
    { id:'deal',   url:'https://deal.wizelife.ai/',   e:'🏠', label:{he:'WizeDeal',  en:'WizeDeal',  pt:'WizeDeal',  es:'WizeDeal' } }
  ];

  function detectApp() {
    var h = (location.host || '').toLowerCase();
    // Canonical *.wizelife.ai subdomains
    if (h.indexOf('money.wizelife')  >= 0) return 'money';
    if (h.indexOf('tax.wizelife')    >= 0) return 'tax';
    if (h.indexOf('health.wizelife') >= 0) return 'health';
    if (h.indexOf('travel.wizelife') >= 0) return 'travel';
    if (h.indexOf('deal.wizelife')   >= 0) return 'deal';
    // Direct deployment hosts
    if (h.indexOf('finsightai.github.io') >= 0) return 'money';
    if (h.indexOf('mastermove') >= 0) return 'tax';
    if (h.indexOf('vitara') >= 0 || h.indexOf('rambam') >= 0) return 'health';
    if (h.indexOf('streamlit') >= 0 || h.indexOf('wizetravel') >= 0) return 'travel';
    if (h.indexOf('check-deal') >= 0) return 'deal';
    return 'portal';
  }

  function getLang() {
    try { return (localStorage.getItem('wl_lang') || (document.documentElement.lang || 'he')).slice(0, 2); }
    catch (e) { return 'he'; }
  }

  function getSso() {
    try { return JSON.parse(localStorage.getItem('wl_sso') || '{}'); }
    catch (e) { return {}; }
  }

  function ssoUrl(base) {
    try {
      var sso = getSso();
      // Non-sensitive params go in the query string.
      var p = new URLSearchParams();
      if (sso.nick) p.set('wl_nick', sso.nick);
      var plan = sso.plan || localStorage.getItem('wl_plan');
      if (plan) p.set('wl_plan', plan);
      p.set('lang', getLang());
      var qs = p.toString();
      var url = qs ? base + (base.indexOf('?') >= 0 ? '&' : '?') + qs : base;
      // wl_token in the fragment so it never reaches server logs / CF / Referer.
      if (sso.token) url += '#wl_token=' + encodeURIComponent(sso.token);
      return url;
    } catch (e) { return base; }
  }

  var T = {
    he: { menu:'תפריט', apps:'אפליקציות', lang:'שפה', theme:'ערכת נושא', dark:'כהה', light:'בהיר', account:'חשבון', back:'חזרה ל-WizeLife', signin:'כניסה', signout:'יציאה', feedback:'משוב / דיווח באג', plan_free:'FREE', plan_pro:'PRO', plan_yolo:'YOLO' },
    en: { menu:'Menu', apps:'Apps', lang:'Language', theme:'Theme', dark:'Dark', light:'Light', account:'Account', back:'Back to WizeLife', signin:'Sign in', signout:'Sign out', feedback:'Feedback / Report a bug', plan_free:'FREE', plan_pro:'PRO', plan_yolo:'YOLO' },
    pt: { menu:'Menu', apps:'Apps', lang:'Idioma', theme:'Tema', dark:'Escuro', light:'Claro', account:'Conta', back:'Voltar para WizeLife', signin:'Entrar', signout:'Sair', feedback:'Feedback / Reportar bug', plan_free:'FREE', plan_pro:'PRO', plan_yolo:'YOLO' },
    es: { menu:'Menú', apps:'Apps', lang:'Idioma', theme:'Tema', dark:'Oscuro', light:'Claro', account:'Cuenta', back:'Volver a WizeLife', signin:'Iniciar', signout:'Salir', feedback:'Feedback / Reportar bug', plan_free:'FREE', plan_pro:'PRO', plan_yolo:'YOLO' }
  };

  function injectStyle() {
    if (document.getElementById('wize-ham-style')) return;
    var css = ''
      + '#wize-ham-btn{display:none;}'
      + '@media (max-width: 820px){'
      /* Sit ABOVE the 36px WizeBar (z-index 99999) so it's always tappable.
         Anchored at inline-START: LTR → left, RTL → right. */
      + '  #wize-ham-btn{position:fixed;top:max(8px,env(safe-area-inset-top));inset-inline-start:8px;inset-inline-end:auto;z-index:100001;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#eef2ff;font-size:18px;line-height:1;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation;-webkit-user-select:none;user-select:none;}'
      + '}'
      + '#wize-ham-overlay{position:fixed;inset:0;z-index:100002;background:rgba(5,8,20,0.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .25s ease;}'
      + '#wize-ham-overlay.open{opacity:1;pointer-events:auto;}'
      /* Drawer slides in from inline-START (LTR→left, RTL→right). */
      + '#wize-ham-drawer{position:fixed;top:0;bottom:0;inset-inline-start:0;inset-inline-end:auto;width:min(86vw,340px);z-index:100003;background:#0a0e1a;border-inline-end:1px solid rgba(255,255,255,0.08);transform:translateX(-100%);transition:transform .28s ease;display:flex;flex-direction:column;font-family:Inter,-apple-system,system-ui,sans-serif;}'
      + 'html[dir="rtl"] #wize-ham-drawer{transform:translateX(100%);}'
      + '#wize-ham-drawer.open{transform:translateX(0);}'
      + '.wh-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 10px;}'
      + '.wh-title{font-size:18px;font-weight:800;color:#eef2ff;letter-spacing:-.4px;}'
      + '.wh-close{background:rgba(255,255,255,0.06);border:none;width:30px;height:30px;border-radius:8px;color:#cbd5e1;font-size:16px;cursor:pointer;font-family:inherit;line-height:1;}'
      /* Reserve room at the bottom so the per-app bottom-nav doesn't clip drawer content. */
      + '.wh-body{flex:1;overflow-y:auto;padding:6px 16px calc(80px + env(safe-area-inset-bottom));}'
      + '.wh-section{margin:14px 0 6px;color:rgba(255,255,255,0.4);font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;padding:0 4px;}'
      + '.wh-row{display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;color:#e2e8f0;font-size:14px;font-weight:600;text-decoration:none;cursor:pointer;border:none;background:none;width:100%;text-align:start;font-family:inherit;}'
      + '.wh-row:hover,.wh-row:active{background:rgba(255,255,255,0.05);}'
      + '.wh-row.active{background:rgba(99,102,241,0.15);color:#a5b4fc;}'
      + '.wh-row .wh-emoji{font-size:18px;width:24px;text-align:center;line-height:1;}'
      + '.wh-row .wh-r{margin-inline-start:auto;color:rgba(255,255,255,0.35);font-size:12px;}'
      + '.wh-pillrow{display:flex;gap:4px;padding:4px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin:6px 4px;}'
      + '.wh-pill{flex:1;background:none;border:none;color:#94a3b8;padding:8px 4px;border-radius:6px;font:700 11px Inter,sans-serif;cursor:pointer;letter-spacing:.4px;}'
      + '.wh-pill.active{background:rgba(99,102,241,0.18);color:#a5b4fc;}'
      + '.wh-account{padding:10px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;margin:6px 4px;display:flex;align-items:center;gap:10px;}'
      + '.wh-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;flex-shrink:0;}'
      + '.wh-name{font-size:13px;font-weight:700;color:#eef2ff;line-height:1.3;}'
      + '.wh-plan{font-size:10.5px;font-weight:700;color:#a5b4fc;letter-spacing:.4px;margin-top:2px;}';
    var s = document.createElement('style');
    s.id = 'wize-ham-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function build() {
    if (document.getElementById('wize-ham-btn')) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', build);
      return;
    }

    var cur = detectApp();
    /* WizeLife portal IS the launcher — no need for an apps hamburger here. */
    if (cur === 'portal') return;

    injectStyle();
    var lang = getLang();
    var t = T[lang] || T.en;
    var sso = getSso();

    /* Hamburger button — always at inline-START (LTR→left, RTL→right).
       Position handled entirely via CSS `inset-inline-start`; no JS override. */
    var btn = document.createElement('button');
    btn.id = 'wize-ham-btn';
    btn.setAttribute('aria-label', t.menu);
    btn.innerHTML = '☰';

    /* Backdrop */
    var ov = document.createElement('div');
    ov.id = 'wize-ham-overlay';

    /* Drawer */
    var dr = document.createElement('aside');
    dr.id = 'wize-ham-drawer';
    dr.setAttribute('role', 'dialog');
    dr.setAttribute('aria-modal', 'true');
    dr.setAttribute('aria-label', t.menu);

    /* Header */
    var head = document.createElement('div');
    head.className = 'wh-head';
    var title = document.createElement('div');
    title.className = 'wh-title';
    title.textContent = t.menu;
    var close = document.createElement('button');
    close.className = 'wh-close';
    close.setAttribute('aria-label', t.close || 'Close');
    close.textContent = '✕';
    head.appendChild(title);
    head.appendChild(close);

    /* Body */
    var body = document.createElement('div');
    body.className = 'wh-body';

    /* Account block */
    var acct = document.createElement('div');
    acct.className = 'wh-account';
    var nick = (sso.nick || (sso.email && sso.email.split('@')[0]) || '').trim();
    if (nick) {
      var initial = nick.charAt(0).toUpperCase();
      var planRaw = (sso.plan || localStorage.getItem('wl_plan') || 'free').toLowerCase();
      var planLbl = planRaw === 'yolo' ? '⚡ ' + t.plan_yolo : planRaw === 'pro' ? '✦ ' + t.plan_pro : t.plan_free;
      var avDiv = document.createElement('div');
      avDiv.className = 'wh-avatar';
      avDiv.textContent = initial;
      var infoDiv = document.createElement('div');
      var nameDiv = document.createElement('div');
      nameDiv.className = 'wh-name';
      nameDiv.textContent = nick;
      var planDiv = document.createElement('div');
      planDiv.className = 'wh-plan';
      planDiv.textContent = planLbl;
      infoDiv.appendChild(nameDiv);
      infoDiv.appendChild(planDiv);
      acct.appendChild(avDiv);
      acct.appendChild(infoDiv);
    } else {
      var avDiv2 = document.createElement('div');
      avDiv2.className = 'wh-avatar';
      avDiv2.textContent = '?';
      var wrap2 = document.createElement('div');
      var a2 = document.createElement('a');
      a2.href = 'https://wizelife.ai/auth.html';
      a2.style.cssText = 'color:#a5b4fc;text-decoration:none;font-size:13.5px;font-weight:700;';
      a2.textContent = t.signin + ' →';
      wrap2.appendChild(a2);
      acct.appendChild(avDiv2);
      acct.appendChild(wrap2);
    }
    body.appendChild(acct);

    /* Apps section */
    var sec1 = document.createElement('div');
    sec1.className = 'wh-section';
    sec1.textContent = t.apps;
    body.appendChild(sec1);
    APPS.forEach(function (a) {
      var lbl = (a.label[lang] || a.label.en);
      var row = document.createElement('a');
      row.className = 'wh-row' + (a.id === cur ? ' active' : '');
      row.href = ssoUrl(a.url);
      row.innerHTML = '<span class="wh-emoji">' + a.e + '</span><span>' + lbl + '</span>'
                   + (a.id === cur ? '<span class="wh-r">●</span>' : '');
      body.appendChild(row);
    });

    /* Language */
    var sec2 = document.createElement('div');
    sec2.className = 'wh-section';
    sec2.textContent = t.lang;
    body.appendChild(sec2);
    var langWrap = document.createElement('div');
    langWrap.className = 'wh-pillrow';
    ['he','en','pt','es'].forEach(function (lc) {
      var b = document.createElement('button');
      b.className = 'wh-pill' + (lc === lang ? ' active' : '');
      b.textContent = lc.toUpperCase();
      b.addEventListener('click', function () {
        try { localStorage.setItem('wl_lang', lc); } catch (e) {}
        document.documentElement.setAttribute('lang', lc);
        document.documentElement.setAttribute('dir', (lc === 'he' || lc === 'ar') ? 'rtl' : 'ltr');
        try { window.dispatchEvent(new CustomEvent('wl-lang-change', { detail: { lang: lc } })); } catch (e) {}
        if (typeof window.setLang === 'function') { try { window.setLang(lc); return; } catch (e) {} }
        if (window.I18n && window.I18n.setLanguage) window.I18n.setLanguage(lc);
        else location.reload();
      });
      langWrap.appendChild(b);
    });
    body.appendChild(langWrap);

    /* Theme */
    var sec3 = document.createElement('div');
    sec3.className = 'wh-section';
    sec3.textContent = t.theme;
    body.appendChild(sec3);
    var themeWrap = document.createElement('div');
    themeWrap.className = 'wh-pillrow';
    var curTheme = (function(){ try { return localStorage.getItem('wl_theme') || 'dark'; } catch (e) { return 'dark'; } })();
    [{k:'dark',l:t.dark},{k:'light',l:t.light}].forEach(function (op) {
      var b = document.createElement('button');
      b.className = 'wh-pill' + (curTheme === op.k ? ' active' : '');
      b.textContent = op.l;
      b.addEventListener('click', function () {
        try { localStorage.setItem('wl_theme', op.k); } catch (e) {}
        document.documentElement.setAttribute('data-theme', op.k);
        document.documentElement.classList.toggle('light', op.k === 'light');
        document.documentElement.classList.toggle('dark', op.k !== 'light');
        if (document.body) {
          document.body.classList.toggle('light', op.k === 'light');
          document.body.classList.toggle('dark', op.k !== 'light');
        }
        themeWrap.querySelectorAll('.wh-pill').forEach(function(x){ x.classList.remove('active'); });
        b.classList.add('active');
      });
      themeWrap.appendChild(b);
    });
    body.appendChild(themeWrap);

    /* Account / footer links */
    var foot = document.createElement('div');
    foot.style.cssText = 'margin-top:18px;display:flex;flex-direction:column;gap:2px;';

    /* Feedback / report — links to wizelife.ai/feedback.html with the
       current app pre-selected and lang carried over. Opens in same tab so
       the user can come back via Back. */
    var fbRow = document.createElement('a');
    fbRow.className = 'wh-row';
    fbRow.href = 'https://wizelife.ai/feedback.html?app=' + encodeURIComponent(cur === 'portal' ? 'general' : cur) + '&lang=' + encodeURIComponent(lang);
    fbRow.innerHTML = '<span class="wh-emoji">💬</span><span>' + t.feedback + '</span>';
    foot.appendChild(fbRow);

    var backRow = document.createElement('a');
    backRow.className = 'wh-row';
    backRow.href = 'https://wizelife.ai/dashboard.html';
    backRow.innerHTML = '<span class="wh-emoji">←</span><span>' + t.back + '</span>';
    foot.appendChild(backRow);
    if (nick) {
      var outRow = document.createElement('button');
      outRow.className = 'wh-row';
      outRow.innerHTML = '<span class="wh-emoji">⏻</span><span>' + t.signout + '</span>';
      outRow.addEventListener('click', function () {
        try { localStorage.removeItem('wl_sso'); } catch (e) {}
        try { if (window.firebase && firebase.auth) firebase.auth().signOut(); } catch (e) {}
        location.href = 'https://wizelife.ai/';
      });
      foot.appendChild(outRow);
    }
    body.appendChild(foot);

    dr.appendChild(head);
    dr.appendChild(body);
    document.body.appendChild(btn);
    document.body.appendChild(ov);
    document.body.appendChild(dr);

    /* Behavior — bulletproof close paths so the drawer never gets "stuck". */
    var prevBodyOverflow = '';
    function open() {
      ov.classList.add('open');
      dr.classList.add('open');
      prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKey);
    }
    function closeFn() {
      ov.classList.remove('open');
      dr.classList.remove('open');
      document.body.style.overflow = prevBodyOverflow || '';
      window.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') closeFn(); }
    function bind(el, fn) {
      if (!el) return;
      el.addEventListener('click', fn);
      el.addEventListener('touchend', function (e) { e.preventDefault(); fn(); }, { passive: false });
    }
    bind(btn, function () { dr.classList.contains('open') ? closeFn() : open(); });
    bind(close, closeFn);
    bind(ov, closeFn);

    /* Swipe to close — drawer sits at inline-START so a swipe AWAY from the
       open edge (toward inline-start) should dismiss it. LTR→swipe left, RTL→swipe right. */
    var sx = 0;
    dr.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    dr.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      var rtl = document.documentElement.dir === 'rtl' || (document.documentElement.lang || '').startsWith('he');
      if ((rtl && dx > 60) || (!rtl && dx < -60)) closeFn();
    }, { passive: true });

    /* Public API */
    window.WizeHamburger = { open: open, close: closeFn };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
