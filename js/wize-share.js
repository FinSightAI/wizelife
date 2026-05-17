/**
 * wize-share.js — WizeLife share helper.
 *
 * Canonical: TOTALIST/wizelife/js/wize-share.js
 *
 * Public API (window.WizeShare):
 *   share(opts)     — hybrid: tries native Web Share first; if it throws
 *                     or isn't available, opens a popup menu
 *                     (WhatsApp / Email / Copy)
 *   menu(opts)      — always show the menu (skip native)
 *   whatsapp(opts)  — open https://wa.me/?text=... directly
 *   email(opts)     — open mailto:?subject=...&body=... directly
 *   copy(opts)      — copy the URL to clipboard, show toast
 *
 * opts: { title?, text?, url? }   (all optional — sensible defaults)
 *
 * Why hybrid:
 *   - Android Chrome: navigator.share() opens the OS sheet with WhatsApp,
 *     Messenger, Telegram, etc. — perfect, leave it alone.
 *   - macOS Safari: navigator.share() opens the system sheet with
 *     AirDrop/Notes/Mail — useless for sharing a public site. Skip it and
 *     show our own menu instead.
 *   - iOS Safari: usually works like Android; but in embedded contexts /
 *     under restrictive Permissions-Policy it throws NotAllowedError →
 *     also fall through to the menu.
 *   - Desktop without Web Share API: menu directly.
 */
(function () {
  if (typeof window === 'undefined') return;

  const TR = {
    he: { copied: '✓ הקישור הועתק', err: 'השיתוף נכשל', whatsapp: 'WhatsApp', email: 'אימייל', copy: 'העתק קישור', more: 'עוד…', title: 'שתף את WizeLife', close: 'סגור' },
    en: { copied: '✓ Link copied',   err: 'Share failed',     whatsapp: 'WhatsApp', email: 'Email',  copy: 'Copy link',    more: 'More…', title: 'Share WizeLife',     close: 'Close' },
    pt: { copied: '✓ Link copiado',  err: 'Falha ao compartilhar', whatsapp: 'WhatsApp', email: 'Email', copy: 'Copiar link', more: 'Mais…', title: 'Compartilhar WizeLife', close: 'Fechar' },
    es: { copied: '✓ Enlace copiado', err: 'Error al compartir',   whatsapp: 'WhatsApp', email: 'Email', copy: 'Copiar enlace', more: 'Más…', title: 'Compartir WizeLife',  close: 'Cerrar' },
  };

  function lang() {
    try { const l = localStorage.getItem('wl_lang'); if (l && TR[l]) return l; } catch (_) {}
    const n = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return TR[n] ? n : 'en';
  }

  function normalize(opts) {
    return {
      title: (opts && opts.title) || document.title || 'WizeLife',
      text:  (opts && opts.text)  || 'WizeLife — Live Smarter. Every Day.',
      url:   (opts && opts.url)   || (location.origin + location.pathname),
    };
  }

  function toast(msg, ok) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = [
      'position:fixed','bottom:80px','left:50%','transform:translateX(-50%)',
      'background:' + (ok ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)'),
      'color:#fff','padding:10px 18px','border-radius:99px',
      'font:600 13px Inter,-apple-system,sans-serif',
      'box-shadow:0 4px 16px rgba(0,0,0,0.3)','z-index:99999',
      'animation:wlshIn .2s ease-out',
    ].join(';');
    if (!document.getElementById('wlshStyle')) {
      const s = document.createElement('style');
      s.id = 'wlshStyle';
      s.textContent = '@keyframes wlshIn{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2200);
    setTimeout(function () { t.remove(); }, 2600);
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch (_) {}
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;left:0;top:0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) { return false; }
  }

  function shareWhatsApp(opts) {
    const d = normalize(opts);
    const url = 'https://wa.me/?text=' + encodeURIComponent(d.text + '\n' + d.url);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function shareEmail(opts) {
    const d = normalize(opts);
    const subj = encodeURIComponent(d.title);
    const body = encodeURIComponent(d.text + '\n\n' + d.url);
    window.location.href = 'mailto:?subject=' + subj + '&body=' + body;
  }

  async function copyLink(opts) {
    const d = normalize(opts);
    const tr = TR[lang()];
    if (await copyToClipboard(d.url)) toast(tr.copied, true);
    else toast(tr.err, false);
  }

  async function shareMore(opts) {
    const d = normalize(opts);
    const tr = TR[lang()];
    if (navigator.share && (!navigator.canShare || navigator.canShare(d))) {
      try { await navigator.share(d); return; } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    // Fallback if navigator.share unavailable / failed
    if (await copyToClipboard(d.url)) toast(tr.copied, true);
    else toast(tr.err, false);
  }

  function openMenu(opts) {
    const d = normalize(opts);
    const tr = TR[lang()];
    const isRtl = lang() === 'he';
    // Tear down any existing menu
    const existing = document.getElementById('wlShareMenu');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.id = 'wlShareMenu';
    wrap.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    wrap.style.cssText = [
      'position:fixed','inset:0','z-index:99997','display:flex',
      'align-items:flex-end','justify-content:center',
      'background:rgba(5,6,15,0.6)','backdrop-filter:blur(6px)',
      '-webkit-backdrop-filter:blur(6px)',
      'font-family:Inter,-apple-system,sans-serif',
      'animation:wlshmIn .18s ease-out',
    ].join(';');

    const inner = document.createElement('div');
    inner.style.cssText = [
      'width:100%','max-width:420px','margin:0 12px 12px',
      'background:linear-gradient(180deg,#11142a,#0a0c1a)',
      'border:1px solid rgba(255,255,255,0.08)',
      'border-radius:18px','padding:16px',
      'box-shadow:0 -20px 60px rgba(0,0,0,0.5)',
    ].join(';');

    const hasNative = !!navigator.share;
    const opts4 = [
      { id: 'whatsapp', icon: '💬', label: tr.whatsapp, fn: function () { shareWhatsApp(d); close(); } },
      { id: 'email',    icon: '✉️', label: tr.email,    fn: function () { shareEmail(d);    close(); } },
      { id: 'copy',     icon: '📋', label: tr.copy,     fn: function () { copyLink(d).then(close); } },
    ];
    if (hasNative) {
      opts4.push({ id: 'more', icon: '↗', label: tr.more, fn: function () { shareMore(d); close(); } });
    }

    inner.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
      + '<h3 style="margin:0;font:800 15px Plus Jakarta Sans,Inter,sans-serif;color:#eef2ff;letter-spacing:-.3px;">' + tr.title + '</h3>'
      + '<button id="wlShareClose" aria-label="' + tr.close + '" style="background:none;border:none;color:#6b7280;font-size:22px;line-height:1;cursor:pointer;padding:0 4px;">×</button>'
      + '</div>'
      + '<div id="wlShareGrid" style="display:grid;grid-template-columns:repeat(' + opts4.length + ',1fr);gap:8px;"></div>';
    wrap.appendChild(inner);

    const style = document.createElement('style');
    style.textContent = '@keyframes wlshmIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}'
      + '#wlShareMenu .wlsm-btn:hover{background:rgba(99,102,241,0.16);border-color:rgba(99,102,241,0.45);transform:translateY(-1px)}'
      + '#wlShareMenu .wlsm-btn:active{transform:translateY(0)}';
    wrap.appendChild(style);

    document.body.appendChild(wrap);
    const grid = wrap.querySelector('#wlShareGrid');
    opts4.forEach(function (o) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wlsm-btn';
      b.setAttribute('data-share', o.id);
      b.style.cssText = [
        'display:flex','flex-direction:column','align-items:center','gap:6px',
        'padding:14px 6px','background:rgba(255,255,255,0.04)',
        'border:1px solid rgba(255,255,255,0.1)','border-radius:12px',
        'color:#eef2ff','cursor:pointer','transition:all .15s',
        'font:600 12px Inter,-apple-system,sans-serif',
      ].join(';');
      b.innerHTML = '<span style="font-size:24px;line-height:1;">' + o.icon + '</span><span>' + o.label + '</span>';
      b.addEventListener('click', o.fn);
      grid.appendChild(b);
    });

    function close() { wrap.remove(); }
    wrap.querySelector('#wlShareClose').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    // Esc to close
    function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } }
    document.addEventListener('keydown', onKey);
  }

  // Hybrid: try native share first (great on Android + iOS). Skip native
  // on macOS desktop where the OS sheet only offers AirDrop/Notes/Mail.
  // Fall back to the explicit menu on any failure / unavailability.
  function isMacDesktop() {
    const ua = navigator.userAgent || '';
    const isMac = /Macintosh|Mac OS X/i.test(ua);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    return isMac && !isMobile;
  }

  async function hybridShare(opts) {
    const d = normalize(opts);
    if (!isMacDesktop() && navigator.share && (!navigator.canShare || navigator.canShare(d))) {
      try { await navigator.share(d); return true; } catch (e) {
        if (e && e.name === 'AbortError') return false;
        // any other error → fall through to menu
      }
    }
    openMenu(d);
    return true;
  }

  window.WizeShare = {
    share: hybridShare,
    menu: openMenu,
    whatsapp: shareWhatsApp,
    email: shareEmail,
    copy: copyLink,
    more: shareMore,
  };
})();
