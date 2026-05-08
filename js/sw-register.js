/**
 * Service Worker registration + auto-update pattern.
 *
 * Loaded by every WizeLife page. When a new SW version is detected:
 * 1. Periodically polls for updates while the user has the page open
 *    (every 5 min) — catches new versions without requiring a refresh.
 * 2. When a new SW finishes installing → shows a non-blocking banner.
 * 3. User taps "Update" → new SW activates, page reloads with fresh code.
 * 4. If user ignores → next page navigation gets the new version anyway
 *    (skipWaiting in sw.js + clients.claim in activate).
 */
(function () {
    if (!('serviceWorker' in navigator)) return;

    function showUpdateBanner(onUpdate) {
        if (document.getElementById('wl-sw-update-banner')) return;
        const lang = (() => { try { return localStorage.getItem('wl_lang') || 'he'; } catch { return 'he'; } })();
        const txt = ({
            he: { msg: 'גרסה חדשה זמינה ✨', btn: 'עדכן עכשיו' },
            en: { msg: 'New version available ✨', btn: 'Update now' },
            pt: { msg: 'Nova versão disponível ✨', btn: 'Atualizar' },
            es: { msg: 'Nueva versión disponible ✨', btn: 'Actualizar' },
        })[lang] || { msg: 'New version available', btn: 'Update' };

        const bar = document.createElement('div');
        bar.id = 'wl-sw-update-banner';
        bar.style.cssText = [
            'position:fixed','bottom:16px','left:50%','transform:translateX(-50%)',
            'z-index:99999','padding:11px 18px','border-radius:99px',
            'background:linear-gradient(135deg,#6366f1,#8b5cf6)','color:white',
            'font-family:Inter,-apple-system,sans-serif','font-size:14px','font-weight:600',
            'box-shadow:0 8px 24px rgba(99,102,241,0.45)','display:flex','align-items:center','gap:12px',
            'animation:wl-sw-pop .35s ease',
        ].join(';');
        bar.innerHTML = `
            <span>${txt.msg}</span>
            <button style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:white;padding:5px 14px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">${txt.btn}</button>
            <button aria-label="dismiss" style="background:transparent;border:none;color:rgba(255,255,255,0.7);font-size:18px;cursor:pointer;padding:0 4px;line-height:1;">×</button>
        `;
        const style = document.createElement('style');
        style.textContent = '@keyframes wl-sw-pop{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}';
        document.head.appendChild(style);
        document.body.appendChild(bar);

        const buttons = bar.querySelectorAll('button');
        buttons[0].addEventListener('click', () => { try { onUpdate && onUpdate(); } catch {} });
        buttons[1].addEventListener('click', () => { bar.remove(); });
    }

    navigator.serviceWorker.register('/sw.js').then(reg => {
        // 1. Detect a NEW SW being installed
        reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            if (!newSW) return;
            newSW.addEventListener('statechange', () => {
                if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                    // A new version is ready and an old one is currently controlling
                    showUpdateBanner(() => {
                        newSW.postMessage({ type: 'SKIP_WAITING' });
                        // Reload happens via controllerchange below
                    });
                }
            });
        });

        // 2. Periodically check for updates while the page is open
        const CHECK_EVERY_MS = 5 * 60 * 1000;  // 5 minutes
        setInterval(() => { try { reg.update(); } catch {} }, CHECK_EVERY_MS);

        // Also check on tab focus (user came back after a while)
        window.addEventListener('focus', () => { try { reg.update(); } catch {} });
    }).catch(err => console.warn('SW register failed', err));

    // 3. When the active SW changes, reload to pick up new assets
    let _reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (_reloading) return;
        _reloading = true;
        location.reload();
    });
})();
