/**
 * Service Worker registration + SILENT auto-update pattern.
 *
 * Goal: every push reaches users with zero action required.
 * - Polls for updates every 5 min and on tab focus.
 * - When a new SW is installed, immediately posts SKIP_WAITING (no banner).
 * - On controllerchange, defers the reload until the page is hidden or
 *   becomes idle, so we never yank the page out from under an active user
 *   mid-form / mid-chat. They come back to the new version automatically.
 */
(function () {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then(reg => {
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

        // 2. Poll for updates while page is open + on focus
        setInterval(() => { try { reg.update(); } catch (e) {} }, 5 * 60 * 1000);
        window.addEventListener('focus', () => { try { reg.update(); } catch (e) {} });
    }).catch(err => console.warn('SW register failed', err));

    // 3. New SW took control → reload, but defer to a non-disruptive moment
    let _scheduled = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (_scheduled) return;
        _scheduled = true;
        const reload = () => location.reload();
        const safeReload = () => {
            // Don't interrupt active typing in inputs/textareas/contenteditable
            const a = document.activeElement;
            const isTyping = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
            if (isTyping) return; // try again next tick
            reload();
        };
        // If the page is already hidden, reload now
        if (document.visibilityState === 'hidden') return reload();
        // Otherwise wait for the next tab-hide (user switched tab/app)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') reload();
            else safeReload();
        }, { once: false });
        // Also reload after 30 minutes of pure idle as a safety floor
        setTimeout(safeReload, 30 * 60 * 1000);
    });
})();
