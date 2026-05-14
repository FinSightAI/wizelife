/**
 * Service Worker registration + aggressive auto-update pattern.
 *
 * Goal: every push reaches users with zero action required, fast.
 * Strategy:
 *  - On page load: call reg.update() immediately + every 60s while open.
 *  - When a new SW is installed, post SKIP_WAITING immediately.
 *  - On controllerchange, reload right away unless the user is actively
 *    typing (input/textarea/contenteditable). If they are, show a non-
 *    blocking "Refresh ready" banner with a one-tap button + auto-reload
 *    once the user stops typing.
 */
(function () {
    if (!('serviceWorker' in navigator)) return;

    function userIsTyping() {
        const a = document.activeElement;
        return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable));
    }

    // updateViaCache:'none' tells the browser to skip ALL HTTP caches when
    // re-fetching sw.js for updates — including Cloudflare's edge cache,
    // which by default holds sw.js for up to 4 hours and delays update
    // delivery to end users. Without this, real users on a fresh tab see
    // a 4-hour-old version of the SW and never trigger updatefound.
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
        // 1. New SW detected → activate it silently
        reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            if (!newSW) return;
            newSW.addEventListener('statechange', () => {
                if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                    try { newSW.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
                }
            });
        });

        // 2. Force-check on every page load (catches PWA reopens quickly)
        try { reg.update(); } catch (e) {}

        // 3. Poll every 60s while page is open + on focus
        setInterval(() => { try { reg.update(); } catch (e) {} }, 60 * 1000);
        window.addEventListener('focus',           () => { try { reg.update(); } catch (e) {} });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                try { reg.update(); } catch (e) {}
            }
        });
    }).catch(err => console.warn('SW register failed', err));

    // 4. New SW took control → reload as quickly as is safe
    let _scheduled = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (_scheduled) return;
        _scheduled = true;

        // Hidden tab? Reload instantly.
        if (document.visibilityState === 'hidden') return location.reload();

        // Not typing? Reload instantly.
        if (!userIsTyping()) return location.reload();

        // User is typing — show the global update banner (defined in
        // wizelife-auth.js) with a one-tap refresh button, AND set up a
        // listener to reload as soon as they stop typing.
        if (typeof window.wlShowUpdateBanner === 'function') {
            window.wlShowUpdateBanner('sw-controllerchange');
        }
        const finish = () => {
            if (!userIsTyping()) {
                location.reload();
            }
        };
        document.addEventListener('blur',     finish, true);
        document.addEventListener('focusout', finish, true);
        // Safety net: every 10s, check if they stopped typing.
        const poll = setInterval(() => { if (!userIsTyping()) { clearInterval(poll); location.reload(); } }, 10 * 1000);
    });
})();
