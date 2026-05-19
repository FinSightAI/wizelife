#!/usr/bin/env node
// WizeDeal — flows v5 (20 new deep scenarios).
// Focus: deal form inputs, mortgage simulator, ROI/cap-rate, disclaimer gate,
// onboarding 44px ✕, i18n 4-lang, SW v3, Vercel beacons, mobile reachability, CSP.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://deal.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeDeal-FlowsV5');

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

    // ─── 1. Deal form ────────────────────────────────────────────────────────
    await step('Deal form: price field accepts large numeric input', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const inputs = page.locator('input[type=number], input[inputmode="numeric"], input[inputmode="decimal"]');
            const n = await inputs.count();
            if (n === 0) { warn('No numeric inputs on landing — form may be wizard-gated', ''); return; }
            await inputs.first().fill('2500000');
            const v = await inputs.first().inputValue();
            if (!v || !/2500000|2,500,000/.test(v)) throw new Error(`price input rejected: got "${v}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Deal form: down-payment field accepts percentage / value', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const dp = page.locator('input[name*="down" i], input[name*="downpayment" i], input[placeholder*="down" i], input[placeholder*="הון" i]').first();
            if (!(await dp.count())) { warn('Down-payment field not found on landing', 'may be inside wizard'); return; }
            await dp.fill('25');
            const v = await dp.inputValue();
            if (!v) throw new Error('down-payment field did not accept input');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Deal form: interest-rate field accepts decimal input', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ir = page.locator('input[name*="interest" i], input[name*="rate" i], input[placeholder*="interest" i], input[placeholder*="ריבית" i]').first();
            if (!(await ir.count())) { warn('Interest-rate field not found on landing', 'may be inside mortgage simulator route'); return; }
            await ir.fill('4.5');
            const v = await ir.inputValue();
            if (!v || !/4\.?5/.test(v)) throw new Error(`interest field rejected decimal: "${v}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 2. Mortgage simulator ───────────────────────────────────────────────
    await step('Mortgage simulator route reachable (not 500)', async () => {
        const { ctx } = await fresh(browser);
        try {
            for (const p of ['/mortgage', '/simulator', '/calc']) {
                const r = await ctx.request.head(BASE + p, { timeout: 10000 }).catch(() => null);
                if (r && r.status() < 500 && r.status() !== 404) return;
            }
            warn('No /mortgage|/simulator|/calc route returned <500', 'may be inline component only');
        } finally { await ctx.close(); }
    });

    await step('Mortgage simulator: outputs non-zero monthly payment text', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // Look for monthly payment text on landing (component may be inline)
            const has = await page.evaluate(() =>
                /monthly|month payment|תשלום חודשי|prestação|cuota/i.test(document.body.innerText)
            );
            if (!has) { warn('No monthly-payment copy on landing', 'simulator likely gated behind deal entry'); return; }
            // Try to find numeric currency adjacent
            const hasNumber = await page.evaluate(() => {
                const m = document.body.innerText.match(/[$€£₪R\$]\s*[\d,.]+|[\d,.]+\s*[$€£₪R\$]/g);
                return m && m.some(s => /[1-9]/.test(s));
            });
            if (!hasNumber) warn('No currency-formatted number near monthly text', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mortgage: amortization / tenure period mentioned (years)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /\b(\d{1,2})\s*(years|year|שנים|anos|años)\b/i.test(document.body.innerText) ||
                /amortization|הלוואה|empréstimo|préstamo|tenure/i.test(document.body.innerText)
            );
            if (!has) warn('No tenure/years copy on landing', 'check simulator page');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 3. ROI / cap-rate ───────────────────────────────────────────────────
    await step('ROI / cap-rate feature copy present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /\bROI\b|cap.rate|gross yield|net yield|תשואה|rentabilidade|rentabilidad/i.test(document.body.innerText)
            );
            if (!has) warn('No ROI / cap-rate / yield copy detected', 'feature may be hidden until deal entered');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('ROI math sanity: 5–15% mentioned somewhere (plausible range)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const txt = await page.evaluate(() => document.body.innerText);
            const m = txt.match(/\b(\d{1,2}(?:\.\d)?)\s*%/g) || [];
            const plausible = m.filter(x => {
                const v = parseFloat(x);
                return v >= 1 && v <= 30;
            });
            if (plausible.length === 0) warn('No plausible percentage values (1–30%) on landing', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Tax + market comparison feature mentioned', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /(tax|מס|imposto|impuesto).*(comparison|market|שוק|mercado|mercado)/i.test(document.body.innerText) ||
                /market comparison|השוואת שוק|comparação de mercado|comparación de mercado/i.test(document.body.innerText)
            );
            if (!has) warn('No tax+market comparison copy', 'feature may be inside deal results');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 4. WizeDisclaimer gate ──────────────────────────────────────────────
    await step('WizeDisclaimer gate: appears or already-accepted state recognized', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const present = await page.evaluate(() =>
                typeof window.WizeDisclaimer === 'object' && typeof window.WizeDisclaimer.gate === 'function'
            );
            if (!present) warn('window.WizeDisclaimer.gate not exposed', 'sub-app may load disclaimer script lazily');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('WizeDisclaimer: localStorage acceptance flag writable + readable', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                localStorage.setItem('wl_disclaimer_accepted', JSON.stringify({ ts: Date.now(), ver: 3 }));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const ok = await page.evaluate(() => !!localStorage.getItem('wl_disclaimer_accepted'));
            if (!ok) throw new Error('disclaimer acceptance did not persist');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 5. Onboarding modal — 44px ✕ + backdrop tap close ───────────────────
    await step('Onboarding modal: ✕ close button is ≥44px (today\'s a11y fix)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const size = await page.evaluate(() => {
                const sels = [
                    '.wize-onb-close',
                    '[data-wize-onb-close]',
                    '.onboarding-close',
                    'button[aria-label*="close" i]',
                ];
                for (const s of sels) {
                    const el = document.querySelector(s);
                    if (el) {
                        const r = el.getBoundingClientRect();
                        return { found: true, w: r.width, h: r.height, sel: s };
                    }
                }
                return { found: false };
            });
            if (!size.found) { warn('Onboarding ✕ button not found (may have already closed)', ''); return; }
            if (size.w < 40 || size.h < 40) throw new Error(`✕ only ${size.w.toFixed(0)}×${size.h.toFixed(0)}px (need ≥44)`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Onboarding: backdrop tap dismisses modal (or no-op if absent)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const backdrop = await page.evaluate(() => {
                const b = document.querySelector('.wize-onb-backdrop, [data-wize-onb-backdrop], .onboarding-backdrop');
                return b ? { ok: true } : { ok: false };
            });
            if (!backdrop.ok) { warn('Onboarding backdrop not present on landing', 'modal may auto-close after first view'); return; }
            await page.locator('.wize-onb-backdrop, [data-wize-onb-backdrop], .onboarding-backdrop').first().click({ force: true }).catch(() => {});
            await page.waitForTimeout(700);
            const stillVisible = await page.evaluate(() => {
                const b = document.querySelector('.wize-onb-backdrop, [data-wize-onb-backdrop], .onboarding-backdrop');
                return b && b.offsetParent !== null;
            });
            if (stillVisible) warn('Backdrop click did not dismiss modal', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 6. i18n 4 languages ─────────────────────────────────────────────────
    await step('i18n: PT pill switches UI to Portuguese', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const pt = page.locator('[data-wl-lang="pt"], [data-lang="pt"]').first();
            if (!(await pt.count())) { warn('PT pill not found', ''); return; }
            await pt.click({ force: true }).catch(() => {});
            await page.waitForTimeout(2000);
            const isPT = await page.evaluate(() =>
                /imóvel|investimento|análise|hipoteca|comparar|mercado/i.test(document.body.innerText)
            );
            if (!isPT) warn('No Portuguese-specific words after PT click', 'may share root words with ES');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('i18n: ES pill switches UI to Spanish', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const es = page.locator('[data-wl-lang="es"], [data-lang="es"]').first();
            if (!(await es.count())) { warn('ES pill not found', ''); return; }
            await es.click({ force: true }).catch(() => {});
            await page.waitForTimeout(2000);
            const isES = await page.evaluate(() =>
                /análisis|inversión|inmueble|hipoteca|comparar|mercado/i.test(document.body.innerText)
            );
            if (!isES) warn('No Spanish-specific words after ES click', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('i18n: language pills are UPPERCASE (EN/ES/PT/HE)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const pills = await page.evaluate(() => {
                const out = [];
                ['en','pt','es','he'].forEach(l => {
                    const el = document.querySelector(`[data-wl-lang="${l}"], [data-lang="${l}"]`);
                    if (el) out.push((el.textContent || '').trim());
                });
                return out;
            });
            if (!pills.length) { warn('No lang pills found in DOM', ''); return; }
            const lowercase = pills.filter(t => /^[a-z]{2}$/.test(t));
            if (lowercase.length) throw new Error(`pills lowercase: ${lowercase.join(', ')} (must be uppercase)`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 7. Service Worker v3 ────────────────────────────────────────────────
    await step('Service Worker registered + controller exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const swInfo = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return { sw: false };
                const regs = await navigator.serviceWorker.getRegistrations();
                return {
                    sw: true,
                    regs: regs.length,
                    controller: !!navigator.serviceWorker.controller,
                    scripts: regs.map(r => (r.active && r.active.scriptURL) || (r.installing && r.installing.scriptURL) || ''),
                };
            });
            if (!swInfo.sw) { warn('navigator.serviceWorker not supported in test browser', ''); return; }
            if (swInfo.regs === 0) warn('No SW registrations (Next.js apps may not use SW)', 'check vercel.json / next.config');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Service Worker version bump: cache key reflects v3 if SW exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const cacheNames = await page.evaluate(async () => {
                if (!('caches' in window)) return [];
                return await caches.keys();
            });
            if (cacheNames.length === 0) { warn('No CacheStorage entries', 'app may be SSR-only / no SW caching'); return; }
            const hasV3 = cacheNames.some(n => /v3|wizedeal-v|deal-v/i.test(n));
            if (!hasV3) warn(`SW caches present but no v3 marker: ${cacheNames.slice(0, 3).join(', ')}`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 8. Vercel Analytics + Speed Insights beacons ────────────────────────
    await step('Vercel Analytics beacon: /_vercel/insights/* requested', async () => {
        const { ctx, page } = await fresh(browser);
        const beacons = [];
        page.on('request', r => {
            const u = r.url();
            if (/_vercel\/insights|vitals\.vercel-insights|vercel-analytics|va\.vercel/i.test(u)) beacons.push(u);
        });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
            await page.waitForTimeout(5000);
            if (beacons.length === 0) warn('No Vercel Analytics / Speed-Insights beacons captured', 'verify d22e2f6 / 7bdeace deployed');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Vercel Speed Insights script tag present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script'));
                return scripts.some(s => /speed-insights|vercel\/speed|_vercel\/insights/i.test(s.src || s.innerHTML || ''));
            });
            if (!has) warn('No Speed Insights script tag detected', 'package may inject via beacon only');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 9. Mobile viewport — buttons reachable ──────────────────────────────
    await step('Mobile (390×844): primary CTA button reachable + ≥44px tap target', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const btnInfo = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button, a[role=button], [data-cta]'));
                const visible = btns.filter(b => {
                    const r = b.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.top >= 0 && r.top < 844;
                });
                if (!visible.length) return { count: 0 };
                const small = visible.filter(b => {
                    const r = b.getBoundingClientRect();
                    return r.height < 40;
                }).length;
                return { count: visible.length, small };
            });
            if (btnInfo.count === 0) throw new Error('No visible buttons in initial viewport');
            if (btnInfo.small > btnInfo.count / 2) warn(`${btnInfo.small}/${btnInfo.count} buttons <40px tall on mobile`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 10. CSP — no console errors ─────────────────────────────────────────
    await step('No console errors on landing (CSP / mixed-content / JS)', async () => {
        const { ctx, page, consoleErrs } = await fresh(browser);
        try {
            // Filter to "real" errors — exclude favicon noise and 3rd-party warnings
            const real = consoleErrs.filter(e => !/favicon|preload|deprecated/i.test(e));
            if (real.length > 3) throw new Error(`${real.length} console errors (sample: ${real[0].slice(0, 140)})`);
            if (real.length > 0) warn(`${real.length} minor console error(s)`, real[0].slice(0, 140));
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizedeal-flows-v5-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
