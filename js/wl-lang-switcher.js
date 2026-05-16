/**
 * WizeLife shared language switcher — injects HE/EN/PT/ES pills + swaps text.
 *
 * Strategy:
 *  - Pages with data-i18n attrs + a WL_TR_<PAGE> global dict get full swap
 *  - Pages without i18n machinery get a "no-op" English version (current text)
 *    until proper translations are added
 *
 * Drop-in:
 *   <script src="/js/wl-lang-switcher.js" defer></script>
 *
 * Auto-fires on DOMContentLoaded. Reads/writes localStorage wl_lang.
 */
(function () {
  if (window.__wlLangLoaded) return;
  window.__wlLangLoaded = true;

  function getLang() {
    try { return (localStorage.getItem('wl_lang') || 'he').slice(0, 2); }
    catch (e) { return 'he'; }
  }

  function setLang(lang) {
    try { localStorage.setItem('wl_lang', lang); } catch (e) {}
    apply(lang);
    document.querySelectorAll('.wl-lang-pill').forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-lang') === lang);
    });
  }

  function apply(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'he') ? 'rtl' : 'ltr';

    // Try page-specific dict (set globally as WL_TR or WL_TR_<pageName>)
    var dict = window.WL_TR && window.WL_TR[lang];
    if (!dict) return;

    // Title from dict
    if (dict.page_title) document.title = dict.page_title;

    // data-i18n elements (plain text)
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });

    // data-i18n-html elements (innerHTML)
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (dict[key]) el.innerHTML = dict[key];
    });

    // data-i18n-attr elements (specific attributes — e.g., placeholder, title)
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      var attr = el.getAttribute('data-i18n-attr');
      var key = el.getAttribute('data-i18n-key');
      if (attr && key && dict[key]) el.setAttribute(attr, dict[key]);
    });
  }

  function injectPills() {
    if (document.getElementById('wl-lang-pills')) return; // already there
    // Skip if page already has its own language switcher (avoid duplicate)
    if (document.querySelector('[data-wl-lang], [data-lang-switcher], #langSwitcher, .lang-pills, [onclick*="setDashLang"], [onclick*="setLanguage"], button[onclick*="wl_lang"]')) {
      return;
    }
    // Skip if a known lang-setter function exists
    if (typeof window.setDashLang === 'function') return;

    var pills = document.createElement('div');
    pills.id = 'wl-lang-pills';
    pills.className = 'wl-lang-pills-floating';
    pills.setAttribute('role', 'toolbar');
    pills.setAttribute('aria-label', 'Language switcher');
    pills.style.cssText = [
      'position:fixed',
      'top:12px',
      // RTL pages: left; LTR pages: right. Shifted by ~44px to clear the hamburger button.
      (document.documentElement.dir === 'rtl' ? 'left:52px' : 'right:52px'),
      'z-index:9998',
      'display:flex',
      'gap:4px',
      'background:rgba(8,11,22,0.85)',
      'backdrop-filter:blur(8px)',
      '-webkit-backdrop-filter:blur(8px)',
      'border:1px solid rgba(255,255,255,0.08)',
      'border-radius:99px',
      'padding:4px',
    ].join(';');

    ['HE', 'EN', 'PT', 'ES'].forEach(function (code) {
      var p = document.createElement('button');
      p.className = 'wl-lang-pill';
      p.setAttribute('data-lang', code.toLowerCase());
      p.setAttribute('aria-label', code);
      p.textContent = code;
      p.style.cssText = [
        'background:transparent',
        'border:0',
        'color:rgba(255,255,255,0.55)',
        'font:600 11px Inter,-apple-system,system-ui,sans-serif',
        'padding:5px 10px',
        'border-radius:99px',
        'cursor:pointer',
        'transition:all .15s',
        'letter-spacing:.5px',
      ].join(';');
      p.addEventListener('mouseenter', function () {
        if (!p.classList.contains('active')) p.style.color = '#fff';
      });
      p.addEventListener('mouseleave', function () {
        if (!p.classList.contains('active')) p.style.color = 'rgba(255,255,255,0.55)';
      });
      p.addEventListener('click', function () { setLang(code.toLowerCase()); });
      pills.appendChild(p);
    });

    // Inject CSS for active state + hide floating pills on mobile (≤820px).
    // On mobile, the hamburger drawer owns the language switcher.
    if (!document.getElementById('wl-lang-pill-css')) {
      var st = document.createElement('style');
      st.id = 'wl-lang-pill-css';
      st.textContent = '.wl-lang-pill.active{background:linear-gradient(135deg,#6366f1,#8b5cf6) !important;color:#fff !important;box-shadow:0 4px 12px rgba(99,102,241,.4)}'
        + '@media (max-width:820px){.wl-lang-pills-floating,#wl-lang-pills{display:none !important;}}';
      document.head.appendChild(st);
    }

    document.body.appendChild(pills);
  }

  function init() {
    injectPills();
    setLang(getLang());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
