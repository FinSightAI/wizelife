/**
 * wize-share.js — native Web Share API helper for WizeLife.
 *
 * Why: when users click Chrome's built-in "Share" or Google's share sheet,
 * the link gets shortened to share.google/... which routes through Google.
 * This helper triggers navigator.share() directly with the clean wizelife.ai
 * URL, so the share sheet shows OUR link, not Google's wrapper.
 *
 * Canonical: TOTALIST/wizelife/js/wize-share.js
 *
 * Usage:
 *   <button onclick="WizeShare.share()">Share</button>
 *   or
 *   <button onclick="WizeShare.share({title:'WizeLife', text:'Try this', url:'https://wizelife.ai'})">Share</button>
 *
 * Falls back to clipboard copy + toast on desktop/browsers without Web Share API.
 */
(function () {
  if (typeof window === 'undefined') return;

  const TR = {
    he: { copied: '✓ הקישור הועתק', err: 'השיתוף נכשל' },
    en: { copied: '✓ Link copied',   err: 'Share failed' },
    pt: { copied: '✓ Link copiado',  err: 'Falha ao compartilhar' },
    es: { copied: '✓ Enlace copiado', err: 'Error al compartir' },
  };

  function lang() {
    try { const l = localStorage.getItem('wl_lang'); if (l && TR[l]) return l; } catch (_) {}
    const n = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return TR[n] ? n : 'en';
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

  async function share(opts) {
    const tr = TR[lang()];
    const data = {
      title: (opts && opts.title) || document.title || 'WizeLife',
      text:  (opts && opts.text)  || 'WizeLife — Live Smarter. Every Day.',
      url:   (opts && opts.url)   || (location.origin + location.pathname),
    };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        await navigator.share(data);
        return true;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(data.url);
        toast(tr.copied, true);
        return true;
      }
      // Last resort: textarea trick
      const ta = document.createElement('textarea');
      ta.value = data.url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast(tr.copied, true);
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false; // user cancelled
      toast(tr.err, false);
      return false;
    }
  }

  window.WizeShare = { share: share };
})();
