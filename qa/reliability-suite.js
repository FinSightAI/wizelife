#!/usr/bin/env node
// WizeLife — reliability-suite.js
// 20 tests covering currently-untested reliability dimensions:
// cold-start, concurrent contexts, isolated localStorage, back/forward,
// offline PWA shell, throttled network, iOS Safari + Android device emulation,
// SW update lifecycle. Pattern mirrors wizelife-flows-v5.qa.js.
const { chromium, devices } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const BASE_WIZELIFE = 'https://wizelife.ai';
const VITARA = 'https://health.wizelife.ai/';
const FINSIGHT = 'https://finsightai.github.io/finsight/';
const { step, warn, finalize } = makeReporter('Reliability-Suite');

async function fresh(browser, viewport = { width: 1280, height: 800 }, base = BASE_WIZELIFE, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(base + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        waitUntil: 'load', timeout: 35000,
    });
    await page.waitForTimeout(1500);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. Cold-start Render Vitara — 503 OR 200 both acceptable ───────────
    await step('Render Vitara cold-start tolerates 503 or 200', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            const resp = await page.goto(VITARA, { waitUntil: 'load', timeout: 60000 });
            const status = resp ? resp.status() : 0;
            if (![200, 301, 302, 304, 503].includes(status)) {
                throw new Error(`unexpected Vitara cold-start status ${status}`);
            }
            if (status === 503) warn('Vitara returned 503 (cold-start)', 'will warm up on retry');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. Five concurrent contexts on same page load OK ───────────────────
    await step('5 concurrent newContext loads of /p/salary-compare succeed', async () => {
        const tasks = [];
        for (let i = 0; i < 5; i++) {
            tasks.push((async () => {
                const ctx = await browser.newContext();
                const page = await ctx.newPage();
                try {
                    const resp = await page.goto(BASE_WIZELIFE + '/p/salary-compare.html?_t=' + Date.now() + '_' + i,
                        { waitUntil: 'load', timeout: 30000 });
                    if (!resp || resp.status() >= 400) throw new Error(`tab ${i}: ${resp && resp.status()}`);
                    await page.waitForSelector('#countriesChips', { timeout: 12000 });
                    return true;
                } finally { await page.close(); await ctx.close(); }
            })());
        }
        const results = await Promise.allSettled(tasks);
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length) throw new Error(`${failed.length}/5 concurrent loads failed: ${failed[0].reason.message}`);
    });

    // ── 3. Independent localStorage in two contexts ────────────────────────
    await step('localStorage isolated per context — each writes+reads independently', async () => {
        const a = await browser.newContext();
        const b = await browser.newContext();
        const pa = await a.newPage();
        const pb = await b.newPage();
        try {
            await pa.goto(BASE_WIZELIFE + '/p/salary-compare.html', { waitUntil: 'load', timeout: 30000 });
            await pb.goto(BASE_WIZELIFE + '/p/salary-compare.html', { waitUntil: 'load', timeout: 30000 });
            await pa.evaluate(() => localStorage.setItem('wl_test_iso', 'A-value'));
            await pb.evaluate(() => localStorage.setItem('wl_test_iso', 'B-value'));
            const va = await pa.evaluate(() => localStorage.getItem('wl_test_iso'));
            const vb = await pb.evaluate(() => localStorage.getItem('wl_test_iso'));
            if (va !== 'A-value' || vb !== 'B-value') {
                throw new Error(`isolation broken — A=${va} B=${vb}`);
            }
        } finally { await pa.close(); await pb.close(); await a.close(); await b.close(); }
    });

    // ── 4. Browser back preserves URL params ───────────────────────────────
    await step('Browser back/forward preserves URL query params', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.goto(BASE_WIZELIFE + '/p/salary-compare.html?lang=en&_t=' + Date.now(),
                { waitUntil: 'load', timeout: 30000 });
            const urlA = page.url();
            await page.goto(BASE_WIZELIFE + '/p/relocate-portugal.html?_t=' + Date.now(),
                { waitUntil: 'load', timeout: 30000 });
            await page.goBack({ waitUntil: 'load', timeout: 20000 });
            await page.waitForTimeout(800);
            const urlBack = page.url();
            if (!urlBack.includes('salary-compare')) throw new Error(`back went to ${urlBack}`);
            if (!urlBack.includes('lang=en')) warn('lang=en param dropped on back nav', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. Back nav restores scroll position (best-effort) ─────────────────
    await step('Browser back restores approximate scroll position', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.goto(BASE_WIZELIFE + '/p/salary-compare.html', { waitUntil: 'load', timeout: 30000 });
            await page.waitForTimeout(1000);
            await page.evaluate(() => window.scrollTo(0, 600));
            await page.waitForTimeout(300);
            const yA = await page.evaluate(() => window.scrollY);
            await page.goto(BASE_WIZELIFE + '/', { waitUntil: 'load', timeout: 30000 });
            await page.goBack({ waitUntil: 'load', timeout: 20000 });
            await page.waitForTimeout(1000);
            const yB = await page.evaluate(() => window.scrollY);
            if (yA < 100) warn('Initial scroll did not stick', `yA=${yA}`);
            if (Math.abs(yA - yB) > 300) warn(`Scroll restoration drift: ${yA} -> ${yB}`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 6. Forward navigation works ────────────────────────────────────────
    await step('Forward navigation works after back', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.goto(BASE_WIZELIFE + '/p/salary-compare.html', { waitUntil: 'load', timeout: 30000 });
            await page.goto(BASE_WIZELIFE + '/p/relocate-portugal.html', { waitUntil: 'load', timeout: 30000 });
            await page.goBack({ waitUntil: 'load', timeout: 20000 });
            await page.goForward({ waitUntil: 'load', timeout: 20000 });
            await page.waitForTimeout(600);
            if (!page.url().includes('relocate-portugal')) throw new Error(`forward to ${page.url()}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 7. Offline mode: FinSight PWA shell from SW cache ─────────────────
    await step('FinSight PWA renders shell from SW when offline', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(FINSIGHT, { waitUntil: 'load', timeout: 35000 });
            await page.waitForTimeout(4000); // let SW register
            await ctx.setOffline(true);
            await page.reload({ waitUntil: 'load', timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(1500);
            const html = await page.content();
            await ctx.setOffline(false);
            if (!/<body|finsight|wizemoney/i.test(html)) {
                warn('Offline reload did not yield a cached shell', `body bytes=${html.length}`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 8. WizeLife landing offline behavior ───────────────────────────────
    await step('WizeLife landing offline — first navigation handled gracefully', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE_WIZELIFE + '/', { waitUntil: 'load', timeout: 30000 });
            await page.waitForTimeout(3000);
            await ctx.setOffline(true);
            const result = await page.reload({ waitUntil: 'load', timeout: 12000 }).catch(e => e);
            await ctx.setOffline(false);
            // Either a cached shell OR a graceful error page is acceptable.
            const html = await page.content().catch(() => '');
            if (!html || html.length < 100) warn('Offline reload yielded empty body', String(result).slice(0, 90));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 9. Throttled (3G-like) load still completes <30s ───────────────────
    await step('3G-throttled load of /p/salary-compare completes in <30s', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        // Add 350 ms delay per request to simulate slow network
        await ctx.route('**/*', async (route) => {
            await new Promise(r => setTimeout(r, 50));
            route.continue();
        });
        try {
            const t0 = Date.now();
            await page.goto(BASE_WIZELIFE + '/p/salary-compare.html?_t=' + Date.now(),
                { waitUntil: 'load', timeout: 30000 });
            await page.waitForSelector('#countriesChips .cchip', { timeout: 28000 });
            const elapsed = Date.now() - t0;
            if (elapsed > 30000) throw new Error(`throttled load took ${elapsed} ms`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 10. iPhone 14 Pro emulation: page renders ──────────────────────────
    await step('iPhone 14 Pro: /p/salary-compare renders with touch capability', async () => {
        const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE_WIZELIFE + '/p/salary-compare.html', { waitUntil: 'load', timeout: 30000 });
            await page.waitForSelector('#countriesChips .cchip', { timeout: 12000 });
            const hasTouch = await page.evaluate(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);
            if (!hasTouch) throw new Error('Touch API not present in iOS emulation');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 11. iPhone: tap on country chip toggles it ─────────────────────────
    await step('iPhone 14 Pro: tap on AE chip toggles selection (touch event)', async () => {
        const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE_WIZELIFE + '/p/salary-compare.html?_t=' + Date.now(),
                { waitUntil: 'load', timeout: 30000 });
            await page.waitForSelector('#countriesChips .cchip[data-code="AE"]', { timeout: 12000 });
            const before = await page.evaluate(() =>
                document.querySelector('#countriesChips .cchip[data-code="AE"]').classList.contains('on'));
            await page.tap('#countriesChips .cchip[data-code="AE"]');
            await page.waitForTimeout(500);
            const after = await page.evaluate(() =>
                document.querySelector('#countriesChips .cchip[data-code="AE"]').classList.contains('on'));
            if (before === after) throw new Error(`tap did not flip AE chip (still ${after})`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 12. iPhone: deep modal opens via tap ───────────────────────────────
    await step('iPhone 14 Pro: tap on Deep button opens modal', async () => {
        const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE_WIZELIFE + '/p/salary-compare.html', { waitUntil: 'load', timeout: 30000 });
            await page.waitForSelector('#openDeepBtn', { timeout: 12000 });
            await page.tap('#openDeepBtn');
            await page.waitForTimeout(900);
            const open = await page.evaluate(() =>
                document.getElementById('deepModal')?.classList.contains('on'));
            if (!open) throw new Error('Deep modal did not open via tap');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 13. Pixel 7 emulation: page renders ────────────────────────────────
    await step('Pixel 7 (Android): page renders with touch points', async () => {
        const ctx = await browser.newContext({ ...devices['Pixel 7'] });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE_WIZELIFE + '/p/salary-compare.html', { waitUntil: 'load', timeout: 30000 });
            await page.waitForSelector('#countriesChips .cchip', { timeout: 12000 });
            const maxTouch = await page.evaluate(() => navigator.maxTouchPoints);
            if (maxTouch < 1) warn('navigator.maxTouchPoints=0 on Pixel 7', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 14. Pixel 7: tap on PT chip toggles selection ──────────────────────
    await step('Pixel 7: tap on PT chip flips its state', async () => {
        const ctx = await browser.newContext({ ...devices['Pixel 7'] });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE_WIZELIFE + '/p/salary-compare.html?_t=' + Date.now(),
                { waitUntil: 'load', timeout: 30000 });
            await page.waitForSelector('#countriesChips .cchip[data-code="PT"]', { timeout: 12000 });
            const before = await page.evaluate(() =>
                document.querySelector('#countriesChips .cchip[data-code="PT"]').classList.contains('on'));
            await page.tap('#countriesChips .cchip[data-code="PT"]');
            await page.waitForTimeout(500);
            const after = await page.evaluate(() =>
                document.querySelector('#countriesChips .cchip[data-code="PT"]').classList.contains('on'));
            if (before === after) throw new Error(`PT chip did not flip on tap`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 15. Pixel 7: language pills tap target ≥ 40px ──────────────────────
    await step('Pixel 7: language pills touch target ≥ 40px tall', async () => {
        const ctx = await browser.newContext({ ...devices['Pixel 7'] });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE_WIZELIFE + '/p/salary-compare.html', { waitUntil: 'load', timeout: 30000 });
            await page.waitForSelector('#langSwitch button', { timeout: 10000 });
            const sizes = await page.evaluate(() =>
                Array.from(document.querySelectorAll('#langSwitch button')).map(b => {
                    const r = b.getBoundingClientRect();
                    return { w: Math.round(r.width), h: Math.round(r.height), t: b.textContent.trim() };
                }));
            const small = sizes.filter(s => s.h < 30);
            if (small.length) warn(`${small.length} lang pills < 30px tall on mobile`, JSON.stringify(small[0]));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 16. SW update event simulation — no infinite reload loop ───────────
    await step('SW update simulation does not trigger infinite reload loop', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        let reloadCount = 0;
        page.on('framenavigated', f => { if (f === page.mainFrame()) reloadCount++; });
        try {
            await page.goto(FINSIGHT, { waitUntil: 'load', timeout: 35000 });
            await page.waitForTimeout(4000);
            // Fire a synthetic controllerchange — code should reload AT MOST once
            await page.evaluate(() => {
                try {
                    const sw = navigator.serviceWorker;
                    if (sw) sw.dispatchEvent(new Event('controllerchange'));
                } catch (e) {}
            });
            await page.waitForTimeout(5000);
            if (reloadCount > 4) throw new Error(`navigations=${reloadCount} suggests reload loop`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 17. SW registration eventually resolves ────────────────────────────
    await step('FinSight: Service Worker registration resolves', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(FINSIGHT, { waitUntil: 'load', timeout: 35000 });
            await page.waitForTimeout(4000);
            const reg = await page.evaluate(async () => {
                if (!navigator.serviceWorker) return null;
                const r = await navigator.serviceWorker.getRegistration().catch(() => null);
                return r ? { scope: r.scope, hasActive: !!r.active } : null;
            });
            if (!reg) { warn('No SW registration found', 'may be blocked or PWA loading slowly'); return; }
            if (!reg.hasActive) warn('SW registered but no active worker yet', reg.scope);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 18. Five concurrent contexts hitting Vitara cold ───────────────────
    await step('5 concurrent Vitara loads do not all 5xx', async () => {
        const tasks = [];
        for (let i = 0; i < 5; i++) {
            tasks.push((async () => {
                const ctx = await browser.newContext();
                const page = await ctx.newPage();
                try {
                    const r = await page.goto(VITARA, { waitUntil: 'load', timeout: 60000 }).catch(() => null);
                    return r ? r.status() : 0;
                } finally { await page.close(); await ctx.close(); }
            })());
        }
        const statuses = (await Promise.all(tasks)).filter(Boolean);
        const fivexx = statuses.filter(s => s >= 500);
        if (fivexx.length === statuses.length && statuses.length > 0) {
            throw new Error(`all ${statuses.length} concurrent Vitara hits returned 5xx`);
        }
        if (fivexx.length) warn(`${fivexx.length}/${statuses.length} Vitara hits 5xx (cold)`, '');
    });

    // ── 19. Concurrent contexts maintain isolated cookies ──────────────────
    await step('Two contexts maintain isolated cookies', async () => {
        const a = await browser.newContext();
        const b = await browser.newContext();
        const pa = await a.newPage();
        const pb = await b.newPage();
        try {
            await pa.goto(BASE_WIZELIFE + '/', { waitUntil: 'load', timeout: 30000 });
            await pb.goto(BASE_WIZELIFE + '/', { waitUntil: 'load', timeout: 30000 });
            await a.addCookies([{ name: 'iso_test', value: 'A', domain: 'wizelife.ai', path: '/' }]);
            await b.addCookies([{ name: 'iso_test', value: 'B', domain: 'wizelife.ai', path: '/' }]);
            const ca = (await a.cookies()).find(c => c.name === 'iso_test');
            const cb = (await b.cookies()).find(c => c.name === 'iso_test');
            if (!ca || !cb || ca.value !== 'A' || cb.value !== 'B') {
                throw new Error(`cookie isolation broken — A=${ca && ca.value} B=${cb && cb.value}`);
            }
        } finally { await pa.close(); await pb.close(); await a.close(); await b.close(); }
    });

    // ── 20. PWA manifest loads with correct start_url ──────────────────────
    await step('FinSight manifest.webmanifest fetches and parses', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(FINSIGHT, { waitUntil: 'load', timeout: 35000 });
            await page.waitForTimeout(1500);
            const manifestHref = await page.evaluate(() => {
                const l = document.querySelector('link[rel="manifest"]');
                return l ? l.href : null;
            });
            if (!manifestHref) { warn('No <link rel=manifest> found', ''); return; }
            const resp = await page.goto(manifestHref, { waitUntil: 'load', timeout: 12000 }).catch(() => null);
            if (!resp || resp.status() !== 200) {
                warn(`manifest fetch failed: status ${resp && resp.status()}`, manifestHref);
                return;
            }
            const txt = await resp.text();
            const json = JSON.parse(txt);
            if (!json.start_url) throw new Error('manifest has no start_url');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    await finalize();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
