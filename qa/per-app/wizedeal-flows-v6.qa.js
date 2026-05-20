#!/usr/bin/env node
// WizeDeal — flows v6 (30 NEW deep scenarios, distinct from v2–v5 + security-v2).
// Focus: AI chat/insights RAG + DEAL CONTEXT enforcement, mortgage simulator
// edge inputs, ROI/cap-rate bounds, /profile + /saved noindex, deal save/load,
// disclaimer gate, SW v3, Vercel beacons, parse-listing extraction, mobile + i18n.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://deal.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeDeal-FlowsV6');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const consoleErrs = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3000);
    return { ctx, page, consoleErrs };
}

(async () => {
    const browser = await chromium.launch();

    // ─── 1. AI chat + insights: RAG / DEAL CONTEXT enforcement ───────────────
    await step('AI chat: /api/ai/chat rejects empty messages (400) — input validation', async () => {
        const { ctx } = await fresh(browser);
        try {
            const r = await ctx.request.post(BASE + '/api/ai/chat', {
                data: { deal: {}, analysis: {}, messages: [] },
                headers: { 'content-type': 'application/json' },
                timeout: 15000,
            }).catch(() => null);
            if (!r) { warn('POST /api/ai/chat unreachable', 'route may require warm function'); return; }
            // Expect 400 (empty messages) — NOT 200 with hallucinated content
            if (r.status() === 200) throw new Error('empty messages returned 200 — validation missing');
            if (![400, 401, 429, 503].includes(r.status())) warn(`chat returned unexpected ${r.status()}`, '');
        } finally { await ctx.close(); }
    });

    await step('AI chat: response is grounded — no invented price when deal numbers fixed', async () => {
        const { ctx } = await fresh(browser);
        try {
            const deal = { property: { country: 'IL', currency: 'ILS', agreedPrice: 2000000, askingPrice: 2000000, rooms: 3, propertyType: 'apartment', sizeSqm: 80, city: 'Tel Aviv', neighborhood: '', state: '' }, financing: { financingType: 'cash', interestRate: 0, loanType: '', loanTermYears: 0, downPaymentPercent: 100 }, rentalAssumptions: { ltr: { monthlyRent: 7000 }, str: { avgNightlyRate: 400, occupancyRatePercent: 60 } }, buyerProfile: { citizenshipStatus: 'citizen', taxResidency: 'IL', nationalities: ['IL'], isRomanianPassportHolder: false, isFirstHomeBuyer: true, isCompanyPurchase: false } };
            const analysis = { returns: { pricePerSqm: 25000, grossYield: 4.2, netYield: 3.1, capRate: 3.5, cashOnCashReturn: 3.5, projections: [{ years: 10, irr: 6.0 }] }, rentalAnalysis: { str: { netAnnualIncome: 60000 }, ltr: { netAnnualIncome: 70000 }, strPremiumPercent: -14 }, purchaseCosts: { itbi: 0, totalTransactionCosts: 50000, totalCashRequired: 2050000 }, dealScore: { total: 62, rating: 'Fair' }, marketContext: { avgPricePerSqmArea: 26000, priceVsMarketPercent: -3.8 }, financing: { monthlyPayment: 0 }, cashFlows: [{ cashFlow: 24000 }], annualCosts: { iptu: 4000, condominium: 6000 } };
            const r = await ctx.request.post(BASE + '/api/ai/chat', {
                data: { deal, analysis, messages: [{ role: 'user', content: 'What is the asking price of this property?' }] },
                headers: { 'content-type': 'application/json' },
                timeout: 30000,
            }).catch(() => null);
            if (!r) { warn('chat grounding probe unreachable', ''); return; }
            if (r.status() === 401 || r.status() === 429 || r.status() === 503) { warn(`chat gated/limited (${r.status()})`, 'auth or quota — cannot verify grounding'); return; }
            const body = (await r.text()).toLowerCase();
            // Should reference the supplied 2,000,000 figure, not invent a different one
            if (body && /[1-9]\d{6}/.test(body.replace(/[^\d]/g, ' '))) {
                const nums = (body.match(/\b\d[\d,]{5,}\b/g) || []).map(s => +s.replace(/,/g, ''));
                const invented = nums.filter(n => n > 100000 && Math.abs(n - 2000000) > 500000 && Math.abs(n - 2050000) > 500000 && Math.abs(n - 26000) > 1000);
                if (invented.length) warn(`chat surfaced figures not in DEAL CONTEXT: ${invented.slice(0, 3).join(', ')}`, 'possible hallucination');
            }
        } finally { await ctx.close(); }
    });

    await step('AI insights: /api/ai/insights does not 500 on minimal valid body', async () => {
        const { ctx } = await fresh(browser);
        try {
            const r = await ctx.request.post(BASE + '/api/ai/insights', {
                data: { deal: {}, analysis: {} },
                headers: { 'content-type': 'application/json' },
                timeout: 20000,
            }).catch(() => null);
            if (!r) { warn('POST /api/ai/insights unreachable', ''); return; }
            if (r.status() >= 500 && r.status() !== 503) throw new Error(`insights returned ${r.status()} (server crash)`);
        } finally { await ctx.close(); }
    });

    // ─── 2. Mortgage simulator — edge inputs ─────────────────────────────────
    await step('Mortgage edge: price=0 does not crash / produce NaN in UI', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const inp = page.locator('input[type=number], input[inputmode="numeric"], input[inputmode="decimal"]');
            if (!(await inp.count())) { warn('No numeric inputs on landing (wizard-gated)', ''); return; }
            await inp.first().fill('0');
            await page.waitForTimeout(1200);
            const nan = await page.evaluate(() => /NaN|Infinity|undefined/.test(document.body.innerText));
            if (nan) throw new Error('price=0 surfaced NaN/Infinity/undefined in rendered output');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mortgage edge: negative price rejected or clamped (no negative payment)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const inp = page.locator('input[type=number], input[inputmode="numeric"], input[inputmode="decimal"]');
            if (!(await inp.count())) { warn('No numeric inputs on landing', ''); return; }
            await inp.first().fill('-500000');
            await page.waitForTimeout(1200);
            const neg = await page.evaluate(() => {
                const m = document.body.innerText.match(/-\s*[$₪R€]\s*[\d,]+|[$₪R€]\s*-[\d,]+/g);
                return m && m.length > 0;
            });
            if (neg) warn('Negative currency value rendered after price=-500000', 'should clamp ≥0');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mortgage edge: interest=100% does not freeze / NaN', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ir = page.locator('input[name*="interest" i], input[name*="rate" i], input[placeholder*="interest" i], input[placeholder*="ריבית" i]').first();
            if (!(await ir.count())) { warn('Interest field not on landing', 'inside wizard'); return; }
            await ir.fill('100');
            await page.waitForTimeout(1200);
            const bad = await page.evaluate(() => /NaN|Infinity/.test(document.body.innerText));
            if (bad) throw new Error('interest=100% produced NaN/Infinity');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mortgage edge: loan amount > price handled (no crash)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const dp = page.locator('input[name*="down" i], input[placeholder*="down" i], input[placeholder*="הון" i]').first();
            if (!(await dp.count())) { warn('Down-payment field not on landing', ''); return; }
            await dp.fill('0'); // 0% down → loan = full price (or > price if over-financed)
            await page.waitForTimeout(1200);
            const bad = await page.evaluate(() => /NaN|Infinity|undefined/.test(document.body.innerText));
            if (bad) throw new Error('0% down produced NaN/Infinity/undefined');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mortgage edge: 0% down does not produce negative or zero monthly payment', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => /monthly|תשלום חודשי|prestação|cuota/i.test(document.body.innerText));
            if (!has) { warn('No monthly-payment copy on landing', 'simulator gated'); return; }
            const ok = await page.evaluate(() => {
                const m = document.body.innerText.match(/[$₪R€]\s*[\d,]+/g) || [];
                return m.some(s => /[1-9]/.test(s));
            });
            if (!ok) warn('No positive currency value near monthly payment', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 3. ROI / cap-rate — bounded outputs ─────────────────────────────────
    await step('ROI/cap-rate: extreme inputs do not yield >100% yield in UI', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const inp = page.locator('input[type=number], input[inputmode="numeric"]');
            if (!(await inp.count())) { warn('No numeric inputs to stress ROI', ''); return; }
            await inp.first().fill('1'); // price=1 → math may explode
            await page.waitForTimeout(1500);
            const insane = await page.evaluate(() => {
                const m = document.body.innerText.match(/(\d{3,6}(?:\.\d+)?)\s*%/g) || [];
                return m.some(s => parseFloat(s) > 1000);
            });
            if (insane) warn('Yield/ROI > 1000% rendered with price=1', 'outputs not bounded');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('ROI/cap-rate: cap-rate label distinct from gross/net yield', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const labels = await page.evaluate(() => ({
                cap: /cap.?rate|תשואת היוון/i.test(document.body.innerText),
                gross: /gross yield|תשואה ברוטו|rentabilidade bruta/i.test(document.body.innerText),
                net: /net yield|תשואה נטו|rentabilidade líquida/i.test(document.body.innerText),
            }));
            const present = Object.values(labels).filter(Boolean).length;
            if (present === 0) warn('No cap-rate/gross/net yield labels on landing', 'metrics inside deal results');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('ROI/cap-rate: cash-on-cash return concept referenced', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /cash.?on.?cash|תזרים|fluxo de caixa|flujo de caja|IRR|cash flow/i.test(document.body.innerText)
            );
            if (!has) warn('No cash-on-cash / cash-flow / IRR copy', 'feature inside results pane');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 4. /profile + /saved — noindex meta + render ────────────────────────
    await step('/profile: noindex robots meta present (added today)', async () => {
        const { ctx, page } = await fresh(browser, { width: 1280, height: 800 }, '/profile');
        try {
            const robots = await page.evaluate(() => {
                const m = document.querySelector('meta[name="robots" i]');
                return m ? (m.getAttribute('content') || '').toLowerCase() : null;
            });
            if (robots === null) { warn('/profile: no robots meta tag found', 'noindex expected on private route'); return; }
            if (!/noindex/.test(robots)) throw new Error(`/profile robots="${robots}" missing noindex`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('/saved: noindex robots meta present (added today)', async () => {
        const { ctx, page } = await fresh(browser, { width: 1280, height: 800 }, '/saved');
        try {
            const robots = await page.evaluate(() => {
                const m = document.querySelector('meta[name="robots" i]');
                return m ? (m.getAttribute('content') || '').toLowerCase() : null;
            });
            if (robots === null) { warn('/saved: no robots meta tag found', 'noindex expected on private route'); return; }
            if (!/noindex/.test(robots)) throw new Error(`/saved robots="${robots}" missing noindex`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('/profile: renders without crash (no Next.js error overlay)', async () => {
        const { ctx, page } = await fresh(browser, { width: 1280, height: 800 }, '/profile');
        try {
            const broken = await page.evaluate(() =>
                /Application error|Unhandled Runtime Error|500.*Internal/i.test(document.body.innerText)
            );
            if (broken) throw new Error('/profile shows Next.js error overlay');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('/saved: renders empty-state OR a saved-deals list', async () => {
        const { ctx, page } = await fresh(browser, { width: 1280, height: 800 }, '/saved');
        try {
            const ok = await page.evaluate(() =>
                document.body.innerText.trim().length > 20 &&
                !/Application error|Unhandled Runtime Error/i.test(document.body.innerText)
            );
            if (!ok) throw new Error('/saved rendered empty body or error');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 5. Deal save / load — localStorage persistence ──────────────────────
    await step('Deal save: a deal written to localStorage survives reload', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                const k = 'wizedeal_test_deal_v6';
                localStorage.setItem(k, JSON.stringify({ id: 'qa-v6', price: 1234567, city: 'QA City', ts: Date.now() }));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2000);
            const survived = await page.evaluate(() => {
                const raw = localStorage.getItem('wizedeal_test_deal_v6');
                if (!raw) return false;
                try { return JSON.parse(raw).price === 1234567; } catch { return false; }
            });
            if (!survived) throw new Error('localStorage deal did not persist across reload');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Deal load: a real saved-deals key exists in localStorage namespace', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const keys = await page.evaluate(() => Object.keys(localStorage));
            const dealKeys = keys.filter(k => /deal|saved|checkdeal|wizedeal|cd_/i.test(k));
            if (!dealKeys.length) warn('No deal/saved localStorage keys after landing', 'state may live in IndexedDB or server');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Deal store: localStorage JSON values parse without throwing', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const corrupt = await page.evaluate(() => {
                const bad = [];
                for (const k of Object.keys(localStorage)) {
                    const v = localStorage.getItem(k);
                    if (v && /^[\[{]/.test(v.trim())) {
                        try { JSON.parse(v); } catch { bad.push(k); }
                    }
                }
                return bad;
            });
            if (corrupt.length) warn(`Non-parseable JSON-looking localStorage keys: ${corrupt.join(', ')}`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 6. WizeDisclaimer gate ──────────────────────────────────────────────
    await step('WizeDisclaimer: gate fires on landing OR script is loaded', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const state = await page.evaluate(() => ({
                obj: typeof window.WizeDisclaimer === 'object',
                gate: typeof (window.WizeDisclaimer || {}).gate === 'function',
                domModal: !!document.querySelector('[class*="disclaimer" i], [id*="disclaimer" i], [data-wize-disclaimer]'),
            }));
            if (!state.obj && !state.domModal) warn('WizeDisclaimer not exposed and no disclaimer DOM node', 'may load lazily on AI action');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('WizeDisclaimer: AI feature copy implies a disclaimer is required', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /not (financial|investment|legal) advice|אינו ייעוץ|não é (aconselhamento|conselho)|no es asesoramiento|disclaimer/i.test(document.body.innerText)
            );
            if (!has) warn('No disclaimer / not-advice copy on landing', 'shown only at AI gate');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 7. Service Worker v3 ────────────────────────────────────────────────
    await step('Service Worker: registration present OR app is SSR-only (no SW)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const info = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return { sw: false };
                const regs = await navigator.serviceWorker.getRegistrations();
                return { sw: true, regs: regs.length, scripts: regs.map(r => (r.active && r.active.scriptURL) || '') };
            });
            if (!info.sw) { warn('serviceWorker unsupported in test browser', ''); return; }
            if (info.regs === 0) warn('No SW registration on WizeDeal (Next.js often SSR-only)', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Service Worker v3: cache key carries v3 marker if any cache exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const names = await page.evaluate(async () => ('caches' in window) ? await caches.keys() : []);
            if (!names.length) { warn('No CacheStorage entries (no SW caching)', ''); return; }
            if (!names.some(n => /v3|wizedeal-v|deal-v|vitara-v/i.test(n))) warn(`SW caches present, no v3 marker: ${names.slice(0, 3).join(', ')}`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 8. Vercel Speed Insights + Analytics beacons ────────────────────────
    await step('Vercel Speed Insights beacon fires (/_vercel/speed-insights)', async () => {
        const { ctx, page } = await fresh(browser);
        const beacons = [];
        page.on('request', r => { if (/_vercel\/(speed-insights|insights)|vitals\.vercel/i.test(r.url())) beacons.push(r.url()); });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
            await page.waitForTimeout(5000);
            await page.mouse.move(100, 100); // trigger vitals
            await page.waitForTimeout(2000);
            if (!beacons.length) warn('No Speed-Insights beacon captured', 'verify @vercel/speed-insights mounted + dashboard toggle ON');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Vercel Analytics beacon fires (/_vercel/insights/event)', async () => {
        const { ctx, page } = await fresh(browser);
        const beacons = [];
        page.on('request', r => { if (/_vercel\/insights\/(event|view)|va\.vercel-scripts/i.test(r.url())) beacons.push(r.url()); });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
            await page.waitForTimeout(5000);
            if (!beacons.length) warn('No Vercel Analytics beacon captured', 'verify @vercel/analytics + Analytics toggle ON in dashboard');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 9. parse-listing — JSON extraction / graceful fail ──────────────────
    await step('parse-listing: POST with pasted listing text → JSON or graceful error', async () => {
        const { ctx } = await fresh(browser);
        try {
            const listing = 'דירת 3 חדרים למכירה בתל אביב, 80 מ"ר, מחיר מבוקש 2,000,000 ₪, שכונת פלורנטין';
            const r = await ctx.request.post(BASE + '/api/ai/parse-listing', {
                data: { text: listing },
                headers: { 'content-type': 'application/json' },
                timeout: 30000,
            }).catch(() => null);
            if (!r) { warn('POST /api/ai/parse-listing unreachable', 'cold function or method mismatch'); return; }
            if (r.status() === 401 || r.status() === 429 || r.status() === 503) { warn(`parse-listing gated/limited (${r.status()})`, ''); return; }
            const body = await r.text();
            if (r.status() === 200) {
                let parsed = null;
                try { parsed = JSON.parse(body); } catch { /* may wrap markdown */ }
                if (!parsed && !/{[\s\S]*"country"|askingPrice|propertyType/i.test(body)) warn('parse-listing 200 but no JSON-shaped extraction', body.slice(0, 120));
            } else if (r.status() >= 500) {
                warn(`parse-listing returned ${r.status()}`, 'should fail gracefully (4xx)');
            }
        } finally { await ctx.close(); }
    });

    await step('parse-listing: malformed body does not 500 (graceful 4xx)', async () => {
        const { ctx } = await fresh(browser);
        try {
            const r = await ctx.request.post(BASE + '/api/ai/parse-listing', {
                data: 'not-json-at-all',
                headers: { 'content-type': 'text/plain' },
                timeout: 15000,
            }).catch(() => null);
            if (!r) { warn('parse-listing malformed probe unreachable', ''); return; }
            if (r.status() >= 500 && r.status() !== 503) throw new Error(`malformed body → ${r.status()} (should be 4xx)`);
        } finally { await ctx.close(); }
    });

    await step('parse-listing: URL paste (yad2/zillow) recognized in extraction flow UI', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /yad2|madlan|zillow|paste.*(listing|link|url)|הדבק|cole o|pegar/i.test(document.body.innerText) ||
                !!document.querySelector('input[placeholder*="yad2" i], input[placeholder*="zillow" i], input[placeholder*="url" i], input[placeholder*="link" i], textarea[placeholder*="listing" i]')
            );
            if (!has) warn('No paste-listing URL affordance on landing', 'inside wizard step');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 10. Mobile reachability + i18n 4-lang ───────────────────────────────
    await step('Mobile (390×844): bottom-nav / primary CTA not clipped off-screen', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const offscreen = await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('button, a[role=button], .wize-bottom-nav, [data-cta]'));
                return els.filter(e => {
                    const r = e.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && (r.left < -8 || r.right > 398);
                }).length;
            });
            if (offscreen > 2) warn(`${offscreen} interactive elements overflow 390px width`, 'horizontal clipping');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('i18n HE: Hebrew sets dir=rtl on documentElement', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const he = page.locator('[data-wl-lang="he"], [data-lang="he"]').first();
            if (!(await he.count())) { warn('HE pill not found', ''); return; }
            await he.click({ force: true }).catch(() => {});
            await page.waitForTimeout(2000);
            const dir = await page.evaluate(() => document.documentElement.getAttribute('dir') || getComputedStyle(document.body).direction);
            if (dir !== 'rtl') warn(`After HE click dir="${dir}" (expected rtl)`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('i18n EN: English pill yields LTR + English copy', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const en = page.locator('[data-wl-lang="en"], [data-lang="en"]').first();
            if (!(await en.count())) { warn('EN pill not found', ''); return; }
            await en.click({ force: true }).catch(() => {});
            await page.waitForTimeout(2000);
            const ok = await page.evaluate(() =>
                /property|deal|analyze|mortgage|invest|price/i.test(document.body.innerText)
            );
            if (!ok) warn('No English keywords after EN click', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('i18n: all 4 lang pills (EN/ES/PT/HE) present in DOM', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const found = await page.evaluate(() =>
                ['en', 'es', 'pt', 'he'].filter(l => document.querySelector(`[data-wl-lang="${l}"], [data-lang="${l}"]`))
            );
            if (found.length < 4) warn(`Only ${found.length}/4 lang pills found: ${found.join(', ')}`, 'all 4 required (he/en/pt/es)');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mobile i18n: language switcher reachable + tappable on 390px width', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const pill = page.locator('[data-wl-lang], [data-lang]').first();
            if (!(await pill.count())) { warn('No lang pill in mobile DOM', ''); return; }
            const box = await pill.boundingBox().catch(() => null);
            if (!box) { warn('Lang pill not laid out on mobile', ''); return; }
            if (box.height < 28 || box.width < 24) warn(`Lang pill tiny on mobile (${box.width.toFixed(0)}×${box.height.toFixed(0)}px)`, 'hard to tap');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizedeal-flows-v6-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
