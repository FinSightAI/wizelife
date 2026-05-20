#!/usr/bin/env node
// WizeTravel — flows v6 (30 NEW deep flows).
//
// Distinct from existing wizetravel-*.qa.js coverage:
//   v1  (wizetravel.qa.js):       home load, nav, Kiwi iframe, basic mobile
//   v2:                           date-picker/currency/passenger/hidden-city/wt_routes/multi-city/AI/IATA/price-alert
//   v3:                           skiplagging/best-time/visa/currency-conv/pet/weather/baggage/layover/scanned/flex/iframe/mobile
//   v4:                           AI chat round-trip, wt_trips reload, /ai tabs, flight search e2e, /api/hotels boundary
//   v5:                           shared-script presence, Vercel/Travelpayouts beacon, route reachability, persistence, console errs
//   deep:                         lang pill, theme, hamburger, search inputs, kiwi deeplink, save/alert, hidden-city, mobile, HE-leak
//   security-flows / security-v2: trackers, XSS, CSP, PWA manifest+SW, open redirect, headers
//
// v6 focuses on (10 themes, ~3 flows each):
//   1. AI planner grounding/hedge/disclaimer (HF ai_client.py Phase 1+2)
//   2. Flight search form validation (same origin/dest, past date, empty)
//   3. /trips /watches /settings noindex meta (added today) + error-free render
//   4. Trip save/delete localStorage (wl_trips) persistence
//   5. Travelpayouts beacon (emrld.ltd, marker=529725, CORS warn)
//   6. Vercel Analytics beacon (warn if absent)
//   7. Back/forward navigation between tabs
//   8. Mobile bottom-nav present + tappable
//   9. i18n he/en/pt/es
//  10. Offline / slow-network resilience
//
// Run: node qa/per-app/wizetravel-flows-v6.qa.js
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://travel.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTravel-FlowsV6');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        waitUntil: 'load', timeout: 45000,
    });
    await page.waitForTimeout(2500);
    return { ctx, page };
}

// Hedge phrases an AI answer should NOT lean on for a factual flight question.
const HEDGE = /\b(i (?:cannot|can't|don'?t) (?:know|be sure|tell|provide)|i'?m not (?:sure|certain|able)|as an ai|i have no (?:access|information|data)|i am unable)\b/i;

(async () => {
    const browser = await chromium.launch();

    // ════════════════════════ THEME 1 — AI planner grounding ════════════════
    // ── 1. AI flight answer: response renders & is non-trivial ─────────────
    await step('AI planner: flight question yields a non-trivial (>40 char) answer', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/ai');
        try {
            const ta = page.locator('textarea, input[type=text]').first();
            await ta.waitFor({ timeout: 10000 });
            await ta.fill('What is the cheapest month to fly from Tel Aviv to Porto?');
            // Submit via Enter or a send button.
            const sendBtn = page.locator('button:has-text("Send"), button:has-text("שלח"), button[type=submit], button[aria-label*="send" i]').first();
            if (await sendBtn.count()) { await sendBtn.click().catch(() => {}); }
            else { await ta.press('Enter').catch(() => {}); }
            await page.waitForTimeout(12000);
            const txt = await page.evaluate(() => document.body.innerText || '');
            const reply = txt.replace(/[\s\S]*Tel Aviv to Porto\??/i, '').trim();
            if (reply.length < 40) warn('AI reply <40 chars or backend slow', 'HF backend cold-start or no answer rendered');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. AI answer: avoids hedge / "I don't know" phrasing ───────────────
    await step('AI planner: factual answer is not pure hedge ("as an AI"/"I cannot")', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/ai');
        try {
            const ta = page.locator('textarea, input[type=text]').first();
            await ta.waitFor({ timeout: 10000 });
            await ta.fill('Do I need a visa to fly from Israel to Portugal as a tourist?');
            const sendBtn = page.locator('button:has-text("Send"), button:has-text("שלח"), button[type=submit], button[aria-label*="send" i]').first();
            if (await sendBtn.count()) { await sendBtn.click().catch(() => {}); } else { await ta.press('Enter').catch(() => {}); }
            await page.waitForTimeout(12000);
            const txt = await page.evaluate(() => document.body.innerText || '');
            // Only flag hedge if there's actually a sizeable reply (avoid false-positive on empty).
            if (txt.length > 200 && HEDGE.test(txt)) warn('AI answer contains hedge phrasing', 'Phase 1+2 grounding should reduce "as an AI/I cannot" responses');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. AI answer carries a disclaimer footer ───────────────────────────
    await step('AI planner: a disclaimer/advisory footer is present after a reply', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/ai');
        try {
            const ta = page.locator('textarea, input[type=text]').first();
            await ta.waitFor({ timeout: 10000 });
            await ta.fill('Plan a 4-day Lisbon itinerary.');
            const sendBtn = page.locator('button:has-text("Send"), button:has-text("שלח"), button[type=submit], button[aria-label*="send" i]').first();
            if (await sendBtn.count()) { await sendBtn.click().catch(() => {}); } else { await ta.press('Enter').catch(() => {}); }
            await page.waitForTimeout(12000);
            const hasDisc = await page.evaluate(() => {
                const t = (document.body.innerText || '').toLowerCase();
                return /not (financial|legal|professional|travel) advice|for informational|always (verify|check)|disclaimer|אינו ייעוץ|verifique|verifica/i.test(t)
                    || !!document.querySelector('.wize-disclaimer, [data-wize-disclaimer], .ai-disclaimer, [data-disclaimer]');
            });
            if (!hasDisc) warn('No disclaimer footer detected after AI reply', 'wize-disclaimer aiOutputFooter may not render on /ai');
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════════════════════ THEME 2 — Flight search validation ════════════
    // ── 4. Same origin == destination is rejected ──────────────────────────
    await step('/flights: same origin & destination is rejected (no silent submit)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/flights');
        try {
            const inputs = await page.locator('input[type=text], input:not([type]):not([type=button]):not([type=submit]):not([type=hidden])').all();
            if (inputs.length < 2) { warn(`only ${inputs.length} text inputs on /flights`, 'form structure changed — cannot test'); return; }
            await inputs[0].fill('TLV');
            await inputs[1].fill('TLV');
            const submit = page.locator('button:has-text("Search"), button:has-text("חפש"), button[type=submit]').first();
            if (await submit.count()) await submit.click().catch(() => {});
            await page.waitForTimeout(2500);
            const blocked = await page.evaluate(() => {
                const t = (document.body.innerText || '').toLowerCase();
                return /same|identical|different|cannot be equal|זהה|שונה|igual|distinto/i.test(t)
                    || document.querySelectorAll('[aria-invalid="true"], .error, .invalid').length > 0;
            });
            if (!blocked) warn('Same origin/dest not visibly rejected', 'validation gap — may issue a meaningless search');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. Empty search submit shows guidance, not crash ───────────────────
    await step('/flights: empty submit does not crash & gives guidance', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/flights');
        const errs = [];
        page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
        try {
            const submit = page.locator('button:has-text("Search"), button:has-text("חפש"), button[type=submit]').first();
            if (!(await submit.count())) { warn('No search submit button on /flights', 'cannot test empty submit'); return; }
            await submit.click().catch(() => {});
            await page.waitForTimeout(2000);
            if (errs.length) throw new Error('pageerror on empty submit: ' + errs[0]);
            const stillUp = await page.evaluate(() => document.body && document.body.children.length > 0);
            if (!stillUp) throw new Error('page blanked after empty submit');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 6. Past departure date is handled (no crash) ───────────────────────
    await step('/flights: past departure date does not crash the form', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/flights');
        const errs = [];
        page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
        try {
            const dateInput = page.locator('input[type=date]').first();
            if (!(await dateInput.count())) { warn('No native date input on /flights', 'date may be a custom picker — skipping'); return; }
            await dateInput.fill('2020-01-01').catch(() => {});
            const submit = page.locator('button:has-text("Search"), button:has-text("חפש"), button[type=submit]').first();
            if (await submit.count()) await submit.click().catch(() => {});
            await page.waitForTimeout(2000);
            if (errs.length) throw new Error('pageerror on past-date submit: ' + errs[0]);
            // Ideally the picker has a min attr to prevent past dates.
            const min = await dateInput.getAttribute('min');
            if (!min) warn('Date input has no min attr', 'past dates selectable — minor validation gap');
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════════════════════ THEME 3 — noindex meta on app routes ══════════
    for (const route of ['/trips', '/watches', '/settings']) {
        await step(`${route}: noindex robots meta present (added today)`, async () => {
            const { ctx, page } = await fresh(browser, undefined, route);
            try {
                const robots = await page.evaluate(() => {
                    const m = document.querySelector('meta[name="robots" i]');
                    return m ? (m.getAttribute('content') || '').toLowerCase() : null;
                });
                if (robots === null) { warn(`${route}: no robots meta tag`, 'expected noindex on private app route'); return; }
                if (!/noindex/.test(robots)) throw new Error(`robots="${robots}" — missing noindex`);
            } finally { await page.close(); await ctx.close(); }
        });
    }

    // ── 10. The three app routes render without pageerror ──────────────────
    await step('/trips /watches /settings render without pageerror', async () => {
        for (const route of ['/trips', '/watches', '/settings']) {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            const errs = [];
            page.on('pageerror', e => errs.push(route + ': ' + String(e).slice(0, 140)));
            try {
                const r = await page.goto(BASE + route + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
                await page.waitForTimeout(2500);
                if (r && r.status() >= 500) throw new Error(`${route} HTTP ${r.status()}`);
                if (errs.length) throw new Error(errs[0]);
            } finally { await page.close(); await ctx.close(); }
        }
    });

    // ════════════════════════ THEME 4 — Trip save/delete persistence ════════
    // ── 11. wl_trips persists across reload ────────────────────────────────
    await step('Trip save: wl_trips localStorage survives a reload', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/trips');
        try {
            await page.evaluate(() => {
                const trip = { id: 'qa-v6-1', dest: 'Porto', days: 4, savedAt: Date.now() };
                try { localStorage.setItem('wl_trips', JSON.stringify([trip])); } catch {}
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const survived = await page.evaluate(() => {
                try { const a = JSON.parse(localStorage.getItem('wl_trips') || '[]'); return Array.isArray(a) && a.some(t => t.id === 'qa-v6-1'); } catch { return false; }
            });
            if (!survived) throw new Error('wl_trips lost across reload');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 12. wl_trips delete removes the entry ──────────────────────────────
    await step('Trip delete: removing from wl_trips persists across reload', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/trips');
        try {
            await page.evaluate(() => {
                const trips = [{ id: 'keep-1', dest: 'Lisbon' }, { id: 'del-1', dest: 'Rome' }];
                try { localStorage.setItem('wl_trips', JSON.stringify(trips)); } catch {}
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2000);
            // Simulate a delete by filtering the array (mirrors app delete handler).
            await page.evaluate(() => {
                try {
                    const a = JSON.parse(localStorage.getItem('wl_trips') || '[]').filter(t => t.id !== 'del-1');
                    localStorage.setItem('wl_trips', JSON.stringify(a));
                } catch {}
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2000);
            const state = await page.evaluate(() => {
                try { const a = JSON.parse(localStorage.getItem('wl_trips') || '[]'); return { hasDel: a.some(t => t.id === 'del-1'), hasKeep: a.some(t => t.id === 'keep-1') }; } catch { return { hasDel: true, hasKeep: false }; }
            });
            if (state.hasDel) throw new Error('deleted trip still present');
            if (!state.hasKeep) throw new Error('delete removed the wrong trip');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 13. A UI delete control exists on /trips (with a seeded trip) ───────
    await step('/trips: a delete/remove control is present when a trip exists', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/trips');
        try {
            await page.evaluate(() => { try { localStorage.setItem('wl_trips', JSON.stringify([{ id: 'qa-v6-ui', dest: 'Madrid', days: 3 }])); } catch {} });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const hasDelete = await page.evaluate(() => {
                const sel = document.querySelector('[aria-label*="delete" i], [aria-label*="remove" i], [title*="delete" i], button.delete, .trip-delete');
                if (sel) return true;
                return Array.from(document.querySelectorAll('button, a')).some(b => /delete|remove|מחק|הסר|excluir|eliminar/i.test((b.textContent || '').trim()));
            });
            if (!hasDelete) warn('No visible delete control on /trips with a saved trip', 'delete UX may be hover-only or empty-state showing');
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════════════════════ THEME 5 — Travelpayouts affiliate ═════════════
    // ── 14. emrld.ltd / tp beacon network hit ──────────────────────────────
    await step('Travelpayouts: emrld.ltd / tp.media beacon requested', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => { if (/emrld\.ltd|tp\.media|tpemd\.com|travelpayouts/i.test(r.url())) hits.push(r.url()); });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(5000);
            if (!hits.length) {
                const inDom = await page.evaluate(() => !!document.querySelector('script[src*="emrld.ltd"], script[src*="travelpayouts"], #travelpayouts-drive'));
                if (!inDom) warn('No emrld.ltd/Travelpayouts beacon', 'affiliate revenue impact');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 15. marker=529725 in any affiliate link ────────────────────────────
    await step('Travelpayouts: marker=529725 present in an affiliate URL/anchor', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const markerHits = [];
        page.on('request', r => { if (/marker=529725/i.test(r.url())) markerHits.push(r.url()); });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(5000);
            const inDom = await page.evaluate(() => {
                const html = document.documentElement.outerHTML;
                return /marker=529725/i.test(html) || Array.from(document.querySelectorAll('a[href]')).some(a => /marker=529725/i.test(a.href));
            });
            if (!markerHits.length && !inDom) warn('marker=529725 not found in links/requests', 'affiliate attribution may be missing — revenue impact');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 16. Travelpayouts CORS errors are known/tolerated (warn only) ──────
    await step('Travelpayouts: CORS console errors logged but tolerated (known issue)', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const cors = [];
        page.on('console', m => {
            if (m.type() !== 'error') return;
            const t = m.text();
            if (/cors|access-control-allow-origin|emrld\.ltd|tp\.media|travelpayouts/i.test(t)) cors.push(t.slice(0, 160));
        });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(5000);
            if (cors.length) warn(`${cors.length} Travelpayouts CORS console error(s)`, 'known issue — affiliate beacon CORS; non-blocking');
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════════════════════ THEME 6 — Vercel Analytics ════════════════════
    // ── 17. Vercel Analytics beacon (warn if absent — dashboard-only) ──────
    await step('Vercel Analytics: /_vercel/insights beacon present (warn if dashboard-only)', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => { if (/_vercel\/insights|va\.vercel-scripts\.com/i.test(r.url())) hits.push(r.url()); });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(4500);
            if (!hits.length) {
                const inDom = await page.evaluate(() => !!document.querySelector('script[src*="_vercel/insights"], script[src*="va.vercel-scripts"]'));
                if (!inDom) warn('No Vercel Analytics beacon/script', 'verify <Analytics /> mounted + enabled in Vercel dashboard');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 18. Vercel Speed Insights beacon (warn if absent) ──────────────────
    await step('Vercel Speed Insights: /_vercel/speed-insights beacon (warn if absent)', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => { if (/_vercel\/speed-insights|speed-insights/i.test(r.url())) hits.push(r.url()); });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(4500);
            if (!hits.length) warn('No Vercel Speed Insights beacon', 'optional — enable <SpeedInsights /> for Core Web Vitals');
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════════════════════ THEME 7 — Back/forward navigation ═════════════
    // ── 19. Browser back restores previous tab/route ───────────────────────
    await step('Nav: back button returns / → /flights → back to /', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/');
        try {
            await page.goto(BASE + '/flights?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(1500);
            await page.goBack({ waitUntil: 'load' }).catch(() => {});
            await page.waitForTimeout(1500);
            const path = await page.evaluate(() => location.pathname);
            if (/\/flights/.test(path)) throw new Error(`back did not leave /flights (still ${path})`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 20. Forward button re-applies the route ────────────────────────────
    await step('Nav: forward button re-applies /ai after a back', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/');
        try {
            await page.goto(BASE + '/ai?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(1500);
            await page.goBack({ waitUntil: 'load' }).catch(() => {});
            await page.waitForTimeout(1200);
            await page.goForward({ waitUntil: 'load' }).catch(() => {});
            await page.waitForTimeout(1500);
            const path = await page.evaluate(() => location.pathname);
            if (!/\/ai/.test(path)) warn(`forward did not restore /ai (at ${path})`, 'SPA history may differ — minor');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 21. No pageerror across a back/forward cycle ───────────────────────
    await step('Nav: back/forward cycle throws no pageerror', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/');
        const errs = [];
        page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
        try {
            await page.goto(BASE + '/trips?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(1200);
            await page.goBack({ waitUntil: 'load' }).catch(() => {});
            await page.waitForTimeout(1000);
            await page.goForward({ waitUntil: 'load' }).catch(() => {});
            await page.waitForTimeout(1200);
            if (errs.length) throw new Error('pageerror during back/forward: ' + errs[0]);
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════════════════════ THEME 8 — Mobile bottom-nav ═══════════════════
    // ── 22. Bottom nav visible at iPhone width ─────────────────────────────
    await step('Mobile: bottom-nav element visible at 390px width', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 }, '/');
        try {
            await page.waitForTimeout(1500);
            const ok = await page.evaluate(() => {
                const el = document.querySelector('#wize-bottom-nav, .wize-bottom-nav, nav[data-wize-bottom-nav], nav[aria-label*="bottom" i]');
                if (!el) return false;
                const r = el.getBoundingClientRect();
                return r.height > 0 && r.width > 0;
            });
            if (!ok) warn('No visible bottom-nav at 390w', 'shared bottom-nav may not inject on this route');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 23. Bottom nav has ≥3 tappable items (≥44px) ───────────────────────
    await step('Mobile: bottom-nav has ≥3 items with ≥44px tap targets', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 }, '/');
        try {
            await page.waitForTimeout(1500);
            const stat = await page.evaluate(() => {
                const nav = document.querySelector('#wize-bottom-nav, .wize-bottom-nav, nav[data-wize-bottom-nav], nav[aria-label*="bottom" i]');
                if (!nav) return null;
                const items = Array.from(nav.querySelectorAll('a, button'));
                const big = items.filter(i => { const r = i.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; });
                return { count: items.length, big: big.length };
            });
            if (!stat) { warn('bottom-nav absent — cannot measure tap targets', 'see prior bottom-nav warn'); return; }
            if (stat.count < 3) throw new Error(`only ${stat.count} nav items`);
            if (stat.big < 3) warn(`only ${stat.big}/${stat.count} nav items ≥44px`, 'a11y tap-target gap');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 24. Tapping a bottom-nav item changes the route ────────────────────
    await step('Mobile: tapping a bottom-nav item navigates (URL changes)', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 }, '/');
        try {
            await page.waitForTimeout(1800);
            const before = await page.evaluate(() => location.pathname);
            const tapped = await page.evaluate(() => {
                const nav = document.querySelector('#wize-bottom-nav, .wize-bottom-nav, nav[data-wize-bottom-nav], nav[aria-label*="bottom" i]');
                if (!nav) return false;
                const link = Array.from(nav.querySelectorAll('a[href]')).find(a => {
                    try { return new URL(a.href, location.href).pathname !== location.pathname; } catch { return false; }
                });
                if (!link) return false; link.click(); return true;
            });
            if (!tapped) { warn('No distinct bottom-nav link to tap', 'cannot verify navigation'); return; }
            await page.waitForTimeout(2500);
            const after = await page.evaluate(() => location.pathname);
            if (after === before) warn('bottom-nav tap did not change route', 'links may all point to current page or use hashes');
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════════════════════ THEME 9 — i18n he/en/pt/es ════════════════════
    // ── 25. EN baseline: Latin text present, no Hebrew leak ────────────────
    await step('i18n EN: Latin UI text present, no Hebrew leak in EN mode', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'en'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const hasHe = await page.evaluate(() => /[֐-׿]/.test(document.body.innerText));
            if (hasHe) warn('Hebrew chars leak in EN mode', 'untranslated string fallback to he');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 26. PT mode: Portuguese-distinctive text appears ───────────────────
    await step('i18n PT: Portuguese-distinctive token renders after wl_lang=pt', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'pt'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const ok = await page.evaluate(() => {
                const t = (document.body.innerText || '').toLowerCase();
                return /\b(voos|viagem|pesquisar|destino|partida|próxim|configuraç|início)\b/.test(t)
                    || (document.documentElement.lang || '').toLowerCase().startsWith('pt');
            });
            if (!ok) warn('No Portuguese-distinctive token in PT mode', 'PT translations may be incomplete');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 27. ES mode: Spanish-distinctive text appears ──────────────────────
    await step('i18n ES: Spanish-distinctive token renders after wl_lang=es', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'es'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const ok = await page.evaluate(() => {
                const t = (document.body.innerText || '').toLowerCase();
                return /\b(vuelos|viaje|buscar|destino|salida|próxim|configuraci|inicio)\b/.test(t)
                    || (document.documentElement.lang || '').toLowerCase().startsWith('es');
            });
            if (!ok) warn('No Spanish-distinctive token in ES mode', 'ES translations may be incomplete');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 28. HE mode: dir=rtl applied somewhere ─────────────────────────────
    await step('i18n HE: dir=rtl applied (html or a main container) in HE mode', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'he'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const rtl = await page.evaluate(() => {
                if ((document.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl') return true;
                if ((document.body.getAttribute('dir') || '').toLowerCase() === 'rtl') return true;
                return Array.from(document.querySelectorAll('[dir="rtl"]')).length > 0;
            });
            if (!rtl) warn('dir=rtl not applied in HE mode', 'RTL layout may be broken for Hebrew users');
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════════════════════ THEME 10 — Offline / slow network ═════════════
    // ── 29. Offline reload: SW shell or graceful page (no white screen) ────
    await step('Offline: reload after caching shows content or offline UI (not blank)', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500); // let SW (if any) cache the shell
            await ctx.setOffline(true);
            const resp = await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
            await page.waitForTimeout(1500);
            const body = await page.evaluate(() => (document.body && document.body.innerText || '').trim().length).catch(() => 0);
            await ctx.setOffline(false);
            if (!resp && body === 0) warn('Offline reload yields blank page', 'no Service Worker offline shell — expected for pure Next.js SSR app');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 30. Slow 3G: home still reaches load within budget ─────────────────
    await step('Slow network: home reaches DOMContentLoaded under throttling (<25s)', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            // Throttle via CDP if available; otherwise just measure cold load.
            try {
                const client = await ctx.newCDPSession(page);
                await client.send('Network.emulateNetworkConditions', {
                    offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8,
                });
            } catch { /* CDP unavailable on this build — measure unthrottled */ }
            const t0 = Date.now();
            const r = await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
            const dt = Date.now() - t0;
            if (!r) throw new Error('home did not reach DOMContentLoaded under slow network within 30s');
            if (dt > 25000) warn(`slow-network load ${dt}ms`, 'heavy first paint under throttling — consider trimming hydration payload');
        } finally { await page.close(); await ctx.close(); }
    });

    finalize();
    await browser.close();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
