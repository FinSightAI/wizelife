#!/usr/bin/env node
// WizeTravel — flows v5 (25 NEW deep flows).
//
// Distinct from existing wizetravel-*.qa.js coverage:
//   v1  (wizetravel.qa.js):       home load, nav, Kiwi iframe, basic mobile
//   v2:                           date-picker/currency/passenger/hidden-city/wt_routes/multi-city/AI/IATA/price-alert
//   v3:                           skiplagging/best-time/visa/currency-conv/pet/weather/baggage/layover/scanned/flex/iframe/mobile
//   v4:                           AI chat round-trip, wt_trips reload, /ai tabs, flight search e2e, /api/hotels boundary
//   deep:                         lang pill, theme, hamburger, search inputs, kiwi deeplink, save/alert, hidden-city, mobile, HE-leak
//   security-flows:               trackers, XSS, CSP, PWA manifest+SW, open redirect
//
// v5 focuses on: shared-script presence (bottom nav, onboarding 44px CTA, share,
// disclaimer, hamburger, version-check, lang-switcher, PII, quickstart), Vercel
// Analytics beacon, Travelpayouts affiliate, Next.js route reachability,
// localStorage persistence across routes, no console errors per route.
//
// Run: node qa/per-app/wizetravel-flows-v5.qa.js
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://travel.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTravel-FlowsV5');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        waitUntil: 'load', timeout: 45000,
    });
    await page.waitForTimeout(2500);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. Vercel Analytics beacon — script or beacon present ──────────────
    await step('Vercel Analytics: /_vercel/insights/ script or beacon requested', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => { if (/_vercel\/insights|va\.vercel-scripts\.com/i.test(r.url())) hits.push(r.url()); });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(4000);
            if (!hits.length) {
                // Also accept the script tag itself in DOM
                const inDom = await page.evaluate(() => !!document.querySelector('script[src*="_vercel/insights"], script[src*="va.vercel-scripts"]'));
                if (!inDom) throw new Error('No Vercel Analytics beacon/script — <Analytics /> may not be rendering');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. Travelpayouts affiliate beacon ──────────────────────────────────
    await step('Travelpayouts affiliate script id="travelpayouts-drive" or domain hit', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => { if (/travelpayouts|tpemd\.com|tp\.media/i.test(r.url())) hits.push(r.url()); });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(4000);
            const inDom = await page.evaluate(() => !!document.querySelector('#travelpayouts-drive, script[src*="travelpayouts"]'));
            if (!hits.length && !inDom) warn('No Travelpayouts script/network', 'affiliate revenue impact');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. wize-bottom-nav.js loads on /ai ─────────────────────────────────
    await step('Mobile bottom nav script: wize-bottom-nav.js fetched on /ai', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => { if (/wize-bottom-nav\.js/.test(r.url())) hits.push(r.url()); });
        try {
            await page.goto(BASE + '/ai?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            if (!hits.length) warn('wize-bottom-nav.js not requested on /ai', 'mobile nav may be missing on this route');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. Bottom nav element visible at 390w ──────────────────────────────
    await step('Bottom nav element visible at iPhone width', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            const visible = await page.evaluate(() => {
                const el = document.querySelector('#wize-bottom-nav, .wize-bottom-nav, nav[data-wize-bottom-nav], nav[aria-label*="bottom" i]');
                if (!el) return false;
                const r = el.getBoundingClientRect();
                return r.height > 0 && r.width > 0;
            });
            if (!visible) warn('No visible bottom-nav element at 390w', 'shared-script may be loaded but not injecting DOM');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. Onboarding ✕ button 44px (today's change) ───────────────────────
    await step('Onboarding ✕ close button is ≥44px (a11y tap target)', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
            await page.evaluate(() => {}); // no-op
            await page.goto(BASE + '/?fresh=1&_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            // Force-reset onboarding flag so the modal opens
            await page.evaluate(() => { try { localStorage.removeItem('wl_onboarded'); localStorage.removeItem('wt_onboarded'); } catch {} });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3500);
            const sz = await page.evaluate(() => {
                const c = document.querySelector('.wize-onb-close, [data-wize-onb-close], button[aria-label*="close" i].wize-onb');
                if (!c) return null;
                const r = c.getBoundingClientRect();
                return { w: r.width, h: r.height };
            });
            if (!sz) { warn('Onboarding ✕ not found in DOM', 'modal may not auto-open or selector differs'); return; }
            if (sz.w < 44 || sz.h < 44) throw new Error(`Close button ${Math.round(sz.w)}×${Math.round(sz.h)}px — must be ≥44px`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 6. Onboarding Skip button 44px ─────────────────────────────────────
    await step('Onboarding Skip button is ≥44px', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 }, '/');
        try {
            await page.evaluate(() => { try { localStorage.removeItem('wl_onboarded'); localStorage.removeItem('wt_onboarded'); } catch {} });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3500);
            const sz = await page.evaluate(() => {
                const candidates = Array.from(document.querySelectorAll('button, a')).filter(b => /skip|דלג|saltar|pular/i.test((b.textContent || '').trim()));
                if (!candidates.length) return null;
                const r = candidates[0].getBoundingClientRect();
                return { w: r.width, h: r.height };
            });
            if (!sz) { warn('Onboarding Skip not found', 'may be inside a portal / shadow root'); return; }
            if (sz.w < 44 || sz.h < 44) throw new Error(`Skip ${Math.round(sz.w)}×${Math.round(sz.h)}px — must be ≥44px`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 7. Onboarding backdrop tap dismisses modal ─────────────────────────
    await step('Onboarding backdrop tap dismisses modal', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 }, '/');
        try {
            await page.evaluate(() => { try { localStorage.removeItem('wl_onboarded'); localStorage.removeItem('wt_onboarded'); } catch {} });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const present = await page.evaluate(() => !!document.querySelector('.wize-onb, [data-wize-onb], #wize-onboarding'));
            if (!present) { warn('Onboarding modal did not open', 'cannot test backdrop dismiss'); return; }
            // Click upper-left corner — outside modal body
            await page.mouse.click(10, 10);
            await page.waitForTimeout(800);
            const stillThere = await page.evaluate(() => {
                const m = document.querySelector('.wize-onb, [data-wize-onb], #wize-onboarding');
                if (!m) return false;
                const cs = getComputedStyle(m);
                return cs.display !== 'none' && cs.visibility !== 'hidden';
            });
            if (stillThere) warn('Backdrop tap did not dismiss', 'modal might require explicit Close click — UX nit');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 8. /flights route loads without 5xx ────────────────────────────────
    await step('/flights returns 2xx/3xx', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            const r = await page.goto(BASE + '/flights?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            if (!r) throw new Error('no response');
            const s = r.status();
            if (s >= 400) throw new Error(`HTTP ${s}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 9. /trips route loads ───────────────────────────────────────────────
    await step('/trips returns 2xx/3xx', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            const r = await page.goto(BASE + '/trips?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            if (!r) throw new Error('no response');
            const s = r.status();
            if (s >= 400) throw new Error(`HTTP ${s}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 10. /hotels route loads ────────────────────────────────────────────
    await step('/hotels returns 2xx/3xx', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            const r = await page.goto(BASE + '/hotels?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            if (!r) throw new Error('no response');
            const s = r.status();
            if (s >= 400) throw new Error(`HTTP ${s}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 11. /deals route loads ─────────────────────────────────────────────
    await step('/deals returns 2xx/3xx', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            const r = await page.goto(BASE + '/deals?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            if (!r) throw new Error('no response');
            const s = r.status();
            if (s >= 400) warn(`/deals HTTP ${s}`, 'route may not exist on this build');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 12. /tools route loads ─────────────────────────────────────────────
    await step('/tools returns 2xx/3xx', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            const r = await page.goto(BASE + '/tools?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            if (!r) throw new Error('no response');
            const s = r.status();
            if (s >= 400) warn(`/tools HTTP ${s}`, 'route may not exist on this build');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 13. /watches route loads ───────────────────────────────────────────
    await step('/watches returns 2xx/3xx', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            const r = await page.goto(BASE + '/watches?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            if (!r) throw new Error('no response');
            const s = r.status();
            if (s >= 400) warn(`/watches HTTP ${s}`, 'route may not exist on this build');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 14. /settings route loads ──────────────────────────────────────────
    await step('/settings returns 2xx/3xx', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            const r = await page.goto(BASE + '/settings?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            if (!r) throw new Error('no response');
            const s = r.status();
            if (s >= 400) warn(`/settings HTTP ${s}`, 'route may not exist on this build');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 15. Trip context persists across routes (TripContext.tsx) ──────────
    await step('Trip context: localStorage key survives navigating / → /trips → /ai', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/');
        try {
            // Plant a known trip in *every* plausible key.
            await page.evaluate(() => {
                const v = JSON.stringify({ id: 'qa-ctx-1', dest: 'Porto', days: 4 });
                for (const k of ['wt_trip', 'wt_currentTrip', 'wl_trip', 'tripCtx', 'wize_trip']) {
                    try { localStorage.setItem(k, v); } catch {}
                }
            });
            await page.goto(BASE + '/trips?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(2500);
            await page.goto(BASE + '/ai?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(2500);
            const stillThere = await page.evaluate(() => {
                for (const k of ['wt_trip', 'wt_currentTrip', 'wl_trip', 'tripCtx', 'wize_trip']) {
                    if (localStorage.getItem(k)) return true;
                }
                return false;
            });
            if (!stillThere) throw new Error('trip context lost during route navigation');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 16. /flights: origin & destination inputs accept text ──────────────
    await step('/flights: origin & destination inputs accept text values', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/flights');
        try {
            const inputs = await page.locator('input[type=text], input:not([type]):not([type=button]):not([type=submit]):not([type=hidden])').all();
            if (inputs.length < 2) { warn(`only ${inputs.length} text inputs on /flights`, 'form structure may have changed'); return; }
            await inputs[0].fill('TLV');
            await inputs[1].fill('OPO');
            const v0 = await inputs[0].inputValue();
            const v1 = await inputs[1].inputValue();
            if (v0 !== 'TLV' || v1 !== 'OPO') throw new Error(`inputs did not retain values (got "${v0}","${v1}")`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 17. /ai: textarea accepts a query ──────────────────────────────────
    await step('/ai: textarea accepts a query string', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/ai');
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 8000 });
            await ta.fill('Plan a 5-day trip to Porto in October.');
            const v = await ta.inputValue();
            if (!v.includes('Porto')) throw new Error('textarea did not retain typed value');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 18. wize-share.js loaded ───────────────────────────────────────────
    await step('Share menu script: wize-share.js fetched on home', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => { if (/wize-share\.js/.test(r.url())) hits.push(r.url()); });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            if (!hits.length) warn('wize-share.js not requested', 'share menu may not be wired on home');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 19. wize-disclaimer.js loaded ──────────────────────────────────────
    await step('Disclaimer script: wize-disclaimer.js fetched', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => { if (/wize-disclaimer\.js/.test(r.url())) hits.push(r.url()); });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            if (!hits.length) warn('wize-disclaimer.js not requested', 'AI disclaimer policy not enforced on this app');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 20. wize-pii.js loaded (PII strip before AI) ───────────────────────
    await step('PII strip script: wize-pii.js fetched on /ai', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => { if (/wize-pii\.js/.test(r.url())) hits.push(r.url()); });
        try {
            await page.goto(BASE + '/ai?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            if (!hits.length) warn('wize-pii.js not requested on /ai', 'PII protection layer may not be wired into AI chat');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 21. Lang switcher script loads + HE pill exists ────────────────────
    await step('Lang switcher: wl-lang-switcher.js fetched + HE/EN/PT/ES pills exist', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => { if (/wl-lang-switcher\.js/.test(r.url())) hits.push(r.url()); });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            if (!hits.length) warn('wl-lang-switcher.js not requested', 'i18n switcher not wired');
            const langs = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, .lang-pill, [data-lang]'));
                const found = new Set();
                for (const b of buttons) {
                    const t = (b.textContent || '').trim();
                    if (/^(HE|EN|PT|ES)$/.test(t)) found.add(t);
                    const dl = b.getAttribute('data-lang');
                    if (dl && /^(he|en|pt|es)$/i.test(dl)) found.add(dl.toUpperCase());
                }
                return [...found];
            });
            if (langs.length < 4) warn(`Only ${langs.length} lang pills found (${langs.join(',')})`, 'need all 4: HE/EN/PT/ES');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 22. Lang pills are UPPERCASE (user preference rule) ────────────────
    await step('Lang pills are UPPERCASE (no lowercase he/en/pt/es text)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const lowercase = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, .lang-pill, [data-lang]'));
                const out = [];
                for (const b of buttons) {
                    const t = (b.textContent || '').trim();
                    if (/^(he|en|pt|es)$/.test(t)) out.push(t);
                }
                return out;
            });
            if (lowercase.length) throw new Error(`Lowercase lang pills found: ${lowercase.join(',')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 23. HE mode: body contains Hebrew text ─────────────────────────────
    await step('HE mode: body contains Hebrew chars after switch', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'he'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3500);
            const hasHe = await page.evaluate(() => /[֐-׿]/.test(document.body.innerText));
            if (!hasHe) throw new Error('No Hebrew chars rendered after wl_lang=he set');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 24. Home loads in <10s ─────────────────────────────────────────────
    await step('Home full-load <10s', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            const t0 = Date.now();
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 15000 });
            const dt = Date.now() - t0;
            if (dt > 10000) throw new Error(`home took ${dt}ms — perf budget 10s exceeded`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 25. No console errors on home (excluding 3p noise) ─────────────────
    await step('Home: no JS console errors (excluding known 3p noise)', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const errs = [];
        page.on('console', m => {
            if (m.type() !== 'error') return;
            const t = m.text();
            // Filter known external noise: favicon misses, 3p tracker blockers, font CORS
            if (/favicon|googletagmanager|clarity|google-analytics|net::ERR_BLOCKED_BY_CLIENT|Failed to load resource: the server responded with a status of 404/i.test(t)) return;
            errs.push(t.slice(0, 200));
        });
        page.on('pageerror', e => errs.push('pageerror: ' + String(e).slice(0, 200)));
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(4000);
            if (errs.length) throw new Error(`${errs.length} console error(s): ${errs[0]}`);
        } finally { await page.close(); await ctx.close(); }
    });

    finalize();
    await browser.close();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
