/* Shared pricing-discovery pill for sub-apps.
 * Shows: "💎 Free · 3 AI/day · Upgrade for unlimited → $9.99/mo"
 * Hidden if: user already paid (wl_plan === 'pro' | 'yolo') OR dismissed.
 * Hidden on landing (wizelife.ai itself — Portal has full Pricing section).
 * Mobile: stays under bottom-nav z-index, doesn't overlap WizeBar.
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Skip on Portal — it has full Pricing section already.
  if (location.hostname === 'wizelife.ai' || location.hostname === 'www.wizelife.ai' ||
      location.hostname === 'finsightai.github.io') return;

  // Skip if user already paid.
  try {
    var plan = (localStorage.getItem('wl_plan') || '').toLowerCase();
    if (plan === 'pro' || plan === 'yolo' || plan === 'pro_trial') return;
  } catch (_) {}

  // Skip if user dismissed (sticky for 30 days).
  try {
    var dismissed = parseInt(localStorage.getItem('wl_pricing_pill_dismissed') || '0', 10);
    if (dismissed && Date.now() - dismissed < 30 * 24 * 60 * 60 * 1000) return;
  } catch (_) {}

  // 4-lang strings — no fallback leak.
  var T = {
    en: { txt: 'Free tier: 3 AI/day · Unlock unlimited for', price: '$9.99/mo', cta: 'See plans', dismiss: 'Dismiss' },
    he: { txt: 'חינם: 3 תשובות AI ביום · פתח ללא הגבלה ב-', price: '9.99$/חודש', cta: 'ראה תוכניות', dismiss: 'סגור' },
    pt: { txt: 'Grátis: 3 IA/dia · Ilimitado por', price: '$9,99/mês', cta: 'Ver planos', dismiss: 'Fechar' },
    es: { txt: 'Gratis: 3 IA/día · Ilimitado por', price: '$9.99/mes', cta: 'Ver planes', dismiss: 'Cerrar' },
  };

  function getLang() {
    try {
      var v = (localStorage.getItem('wl_lang') || '').toLowerCase();
      if (T[v]) return v;
    } catch (_) {}
    var bl = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return T[bl] ? bl : 'en';
  }

  function render() {
    if (document.getElementById('wize-pricing-pill')) return;
    var lang = getLang();
    var t = T[lang];
    var isRtl = lang === 'he';

    var pill = document.createElement('div');
    pill.id = 'wize-pricing-pill';
    pill.dir = isRtl ? 'rtl' : 'ltr';
    pill.style.cssText = [
      'position:fixed',
      /* Bottom-center on mobile (above bottom-nav 56px + safe-area).
         Below WizeBar on desktop — but only after the page-header area. */
      'bottom:calc(76px + env(safe-area-inset-bottom, 0px))',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:380',
      'background:linear-gradient(135deg,rgba(99,102,241,0.95),rgba(167,139,250,0.95))',
      '-webkit-backdrop-filter:blur(12px)',
      'backdrop-filter:blur(12px)',
      'color:#fff',
      'padding:7px 14px',
      'border-radius:999px',
      'font:600 12px/1.3 -apple-system,system-ui,"Inter","Heebo",sans-serif',
      'box-shadow:0 4px 16px rgba(99,102,241,0.4),0 0 0 1px rgba(255,255,255,0.15) inset',
      'display:flex',
      'align-items:center',
      'gap:8px',
      'max-width:calc(100vw - 24px)',
      'white-space:nowrap',
      'overflow:hidden',
      'text-overflow:ellipsis'
    ].join(';');

    var icon = document.createElement('span');
    icon.textContent = '\u{1F48E}';
    icon.style.cssText = 'font-size:14px;flex-shrink:0';
    pill.appendChild(icon);

    var txt = document.createElement('span');
    txt.textContent = t.txt;
    pill.appendChild(txt);

    var price = document.createElement('strong');
    price.textContent = t.price;
    price.style.cssText = 'font-weight:800;color:#fef3c7';
    pill.appendChild(price);

    var sep = document.createElement('span');
    sep.textContent = '·';
    sep.style.cssText = 'opacity:0.6';
    pill.appendChild(sep);

    var cta = document.createElement('a');
    cta.href = 'https://wizelife.ai/#pricing';
    cta.target = '_blank';
    cta.rel = 'noopener';
    cta.textContent = t.cta + (isRtl ? ' ←' : ' →');
    cta.style.cssText = 'color:#fef3c7;text-decoration:underline;font-weight:700;flex-shrink:0';
    pill.appendChild(cta);

    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', t.dismiss);
    close.textContent = '×';
    close.style.cssText = [
      'background:rgba(255,255,255,0.18)',
      'border:none',
      'color:#fff',
      'cursor:pointer',
      'font-size:16px',
      'line-height:1',
      'padding:0 6px',
      'border-radius:50%',
      'flex-shrink:0',
      'inset-inline-start:4px',
      'min-width:20px',
      'min-height:20px'
    ].join(';');
    close.onclick = function () {
      try { localStorage.setItem('wl_pricing_pill_dismissed', String(Date.now())); } catch (_) {}
      pill.style.display = 'none';
    };
    pill.appendChild(close);

    // Mobile: stack vertically + shrink so it fits.
    if (window.innerWidth < 560) {
      pill.style.fontSize = '11px';
      pill.style.padding = '6px 10px';
      pill.style.gap = '6px';
    }

    document.body.appendChild(pill);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
