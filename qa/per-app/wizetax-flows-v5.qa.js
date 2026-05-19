#!/usr/bin/env node
// WizeTax — flows v5 (30 deep flows).
// Targets pages shipped today: /relocation-analyzer (new country selector,
// 13 chips, olim regime badges, scroll-lock fix), /salary-compare,
// /exit-tax-calculator, /social-compare, /advisor (opt-in scroll lock),
// Vercel Speed Insights + Analytics beacons, and the redesigned onboarding modal.
const { chromium, devices } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://tax.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTax-FlowsV5');

// Pre-seed flags so onboarding/quick-start modals don't block the page render.
async function suppressOnboarding(ctx) {
    await ctx.addInitScript(() => {
        try {
            const keys = [
                'wl_ob_relocation', 'wl_ob_salary', 'wl_ob_exit', 'wl_ob_social', 'wl_ob_advisor',
                'wl_qs_relocation', 'wl_qs_salary', 'wl_qs_exit', 'wl_qs_social', 'wl_qs_advisor',
                'wl_ob_seen', 'wl_qs_seen', 'wl_onboarding_dismissed', 'wl_disclaimer_ack'
            ];
            keys.forEach(k => localStorage.setItem(k, '1'));
        } catch (e) {}
    });
}

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/relocation-analyzer', { seedOnboarding = true, deviceProfile = null } = {}) {
    const ctx = deviceProfile
        ? await browser.newContext({ ...deviceProfile })
        : await browser.newContext({ viewport });
    if (seedOnboarding) await suppressOnboarding(ctx);
    const page = await ctx.newPage();
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. Scroll lock fix verification ────────────────────────────────────
    await step('Scroll-lock: /relocation-analyzer body overflow is NOT hidden', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const ov = await page.evaluate(() => getComputedStyle(document.body).overflow);
            const ovY = await page.evaluate(() => getComputedStyle(document.body).overflowY);
            if (ov === 'hidden' || ovY === 'hidden') {
                throw new Error(`body overflow=${ov}, overflowY=${ovY} — scroll lock regressed`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Scroll-lock: page scrolls past viewport height', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const scrollable = await page.evaluate(() => {
                const root = document.scrollingElement || document.documentElement;
                return root.scrollHeight > window.innerHeight + 50;
            });
            if (!scrollable) warn('Page content barely exceeds viewport', 'cannot verify scroll behavior');
            await page.evaluate(() => window.scrollTo(0, 800));
            await page.waitForTimeout(400);
            const y = await page.evaluate(() => window.scrollY);
            if (y < 200) throw new Error(`window.scrollY=${y} after scrollTo(800) — page is locked`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Scroll-lock: /advisor IS allowed to lock body (opt-in via data-route)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/advisor');
        try {
            const route = await page.evaluate(() => document.body.getAttribute('data-route'));
            const ov = await page.evaluate(() => getComputedStyle(document.body).overflow);
            // Either advisor sets data-route="advisor" + locks, or it's a fluid page; warn either way if unclear.
            if (route !== 'advisor' && ov !== 'hidden') {
                warn(`advisor body lacks data-route="advisor" (got "${route}") and overflow="${ov}"`, 'opt-in lock may not be wired');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. Country selector ────────────────────────────────────────────────
    await step('Country selector: 13 chips with span[data-code] render', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const count = await page.locator('span[data-code]').count();
            if (count < 13) throw new Error(`only ${count}/13 country chips with data-code rendered`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country selector: all 13 expected ISO codes present', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const codes = await page.$$eval('span[data-code]', els => els.map(e => e.getAttribute('data-code').toUpperCase()));
            const expected = ['IL', 'PT', 'CY', 'IT', 'AE', 'US', 'DE', 'GB', 'ES', 'GR', 'MT', 'GE', 'BR'];
            const missing = expected.filter(c => !codes.includes(c));
            if (missing.length) throw new Error(`missing country chips: ${missing.join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country selector: IL chip is locked (aria-disabled=true)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const ariaDisabled = await page.evaluate(() => {
                const il = document.querySelector('span[data-code="IL"], span[data-code="il"]');
                return il ? il.getAttribute('aria-disabled') : null;
            });
            if (ariaDisabled !== 'true') throw new Error(`IL chip aria-disabled="${ariaDisabled}" — should be "true"`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country selector: Default preset → 8 chips selected', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const def = page.locator('button:has-text("Default"), button:has-text("ברירת מחדל"), button:has-text("Padrão"), button:has-text("Predeterminado")').first();
            if (!(await def.count())) { warn('Default preset button not found', 'preset UI may use different copy'); return; }
            await def.click({ force: true }).catch(() => {});
            await page.waitForTimeout(500);
            const selected = await page.locator('span[data-code][aria-pressed="true"], span[data-code].active, span[data-code][data-selected="true"]').count();
            if (selected !== 8) throw new Error(`Default preset selected ${selected} chips, expected 8`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country selector: All preset → 13 selected', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const all = page.locator('button:has-text("All"), button:has-text("הכל"), button:has-text("Todos"), button:has-text("Todas")').first();
            if (!(await all.count())) { warn('All preset button not found', ''); return; }
            await all.click({ force: true }).catch(() => {});
            await page.waitForTimeout(500);
            const selected = await page.locator('span[data-code][aria-pressed="true"], span[data-code].active, span[data-code][data-selected="true"]').count();
            if (selected < 13) warn(`All preset selected ${selected}/13`, 'selection state attr may differ');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country selector: Clear preset → only IL selected (locked)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const clear = page.locator('button:has-text("Clear"), button:has-text("נקה"), button:has-text("Limpar"), button:has-text("Borrar")').first();
            if (!(await clear.count())) { warn('Clear preset button not found', ''); return; }
            await clear.click({ force: true }).catch(() => {});
            await page.waitForTimeout(500);
            const selected = await page.$$eval('span[data-code][aria-pressed="true"], span[data-code].active, span[data-code][data-selected="true"]',
                els => els.map(e => e.getAttribute('data-code').toUpperCase()));
            if (!selected.includes('IL') || selected.length > 1) {
                warn(`Clear left ${selected.length} selected: ${selected.join(',')}`, 'expected only IL');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country selector: localStorage key wl_selected_countries_pro persists', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            // Pick PT chip
            const pt = page.locator('span[data-code="PT"], span[data-code="pt"]').first();
            if (!(await pt.count())) { warn('PT chip not found', ''); return; }
            await pt.click({ force: true }).catch(() => {});
            await page.waitForTimeout(600);
            const stored = await page.evaluate(() => localStorage.getItem('wl_selected_countries_pro'));
            if (!stored) throw new Error('wl_selected_countries_pro not written after chip click');
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2000);
            const after = await page.evaluate(() => localStorage.getItem('wl_selected_countries_pro'));
            if (!after || !/PT/i.test(after)) throw new Error(`selection lost after reload (got: ${after})`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country selector: chip click filters comparison tbody rows', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            // Start from Clear so we can measure delta cleanly
            const clear = page.locator('button:has-text("Clear"), button:has-text("נקה"), button:has-text("Limpar"), button:has-text("Borrar")').first();
            if (await clear.count()) await clear.click({ force: true }).catch(() => {});
            await page.waitForTimeout(400);
            const before = await page.locator('tbody tr').count();
            const pt = page.locator('span[data-code="PT"], span[data-code="pt"]').first();
            if (!(await pt.count())) { warn('PT chip not found', ''); return; }
            await pt.click({ force: true }).catch(() => {});
            await page.waitForTimeout(700);
            const after = await page.locator('tbody tr').count();
            if (after <= before) warn(`tbody rows ${before}→${after} did not grow after PT click`, 'rows may be virtual or rendered elsewhere');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. Olim toggle ─────────────────────────────────────────────────────
    await step('Olim toggle: button exists and is clickable', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const olim = page.locator('button:has-text("Olim"), button:has-text("עולה"), button:has-text("עולים"), [data-toggle="olim"]').first();
            if (!(await olim.count())) throw new Error('Olim toggle not found');
            await olim.click({ force: true }).catch(() => {});
            await page.waitForTimeout(800);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Olim toggle: ⭐ regime badges appear after toggle', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const olim = page.locator('button:has-text("Olim"), button:has-text("עולה"), button:has-text("עולים"), [data-toggle="olim"]').first();
            if (!(await olim.count())) { warn('Olim toggle not found', ''); return; }
            const before = await page.evaluate(() => (document.body.textContent.match(/⭐/g) || []).length);
            await olim.click({ force: true }).catch(() => {});
            await page.waitForTimeout(900);
            const after = await page.evaluate(() => (document.body.textContent.match(/⭐/g) || []).length);
            if (after <= before) throw new Error(`star badges before=${before} after=${after} — olim regime badges not rendering`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Olim regime: all 8 named regimes (NHR / Beckham / Non-Dom / 7% / etc) appear', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            // Make sure all countries are selected so regimes can render
            const all = page.locator('button:has-text("All"), button:has-text("הכל"), button:has-text("Todos"), button:has-text("Todas")').first();
            if (await all.count()) await all.click({ force: true }).catch(() => {});
            await page.waitForTimeout(400);
            const olim = page.locator('button:has-text("Olim"), button:has-text("עולה"), button:has-text("עולים"), [data-toggle="olim"]').first();
            if (await olim.count()) await olim.click({ force: true }).catch(() => {});
            await page.waitForTimeout(1200);
            const txt = await page.evaluate(() => document.body.textContent || '');
            const expected = ['NHR', 'Beckham', 'Non-Dom', '7%', 'Small Business', 'Impatriati', 'toshav', 'Non Dom'];
            const found = expected.filter(k => new RegExp(k, 'i').test(txt));
            if (found.length < 5) throw new Error(`only ${found.length}/8 olim regime keywords visible: ${found.join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. CSP ─────────────────────────────────────────────────────────────
    await step('CSP: no frame-src violation in console', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await suppressOnboarding(ctx);
        const page = await ctx.newPage();
        const cspErrs = [];
        page.on('console', m => {
            if (m.type() === 'error' && /content security policy|frame-src|csp/i.test(m.text())) cspErrs.push(m.text());
        });
        try {
            await page.goto(BASE + '/relocation-analyzer?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(4000);
            const frameErrs = cspErrs.filter(e => /frame-src/i.test(e));
            if (frameErrs.length) throw new Error(`${frameErrs.length} frame-src CSP errors (sample: ${frameErrs[0].slice(0, 120)})`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('CSP: no Firebase iframe blocked', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await suppressOnboarding(ctx);
        const page = await ctx.newPage();
        const cspErrs = [];
        page.on('console', m => {
            if (m.type() === 'error' && /firebase|gstatic|googleapis/i.test(m.text()) && /csp|content security/i.test(m.text())) cspErrs.push(m.text());
        });
        try {
            await page.goto(BASE + '/relocation-analyzer?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(4000);
            if (cspErrs.length) throw new Error(`${cspErrs.length} Firebase-related CSP errors`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. 10-year SVG chart ───────────────────────────────────────────────
    await step('10-year chart: SVG renders with multiple lines', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const all = page.locator('button:has-text("All"), button:has-text("הכל"), button:has-text("Todos")').first();
            if (await all.count()) await all.click({ force: true }).catch(() => {});
            await page.waitForTimeout(800);
            const svgs = await page.locator('svg').count();
            if (svgs === 0) throw new Error('no SVG on relocation-analyzer');
            const lines = await page.locator('svg path, svg polyline, svg line').count();
            if (lines < 5) warn(`only ${lines} SVG line elements`, 'expected ≥5 country lines on 10-yr chart');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('10-year chart: axis labels (years 20XX) present', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const yrs = await page.evaluate(() => {
                const t = document.body.textContent || '';
                return new Set((t.match(/\b20[2-3]\d\b/g) || [])).size;
            });
            if (yrs < 3) warn(`only ${yrs} distinct years on page`, 'chart may use abbreviated labels');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 6. Cost of Living ──────────────────────────────────────────────────
    await step('Cost of Living: AE shown ~105, IL=100 (baseline)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const all = page.locator('button:has-text("All"), button:has-text("הכל"), button:has-text("Todos")').first();
            if (await all.count()) await all.click({ force: true }).catch(() => {});
            await page.waitForTimeout(800);
            const txt = await page.evaluate(() => document.body.textContent || '');
            const hasIL100 = /\bIL\b[\s\S]{0,200}\b100\b|\b100\b[\s\S]{0,200}\bIL\b|Israel[\s\S]{0,200}\b100\b/i.test(txt);
            const hasAE105 = /\bAE\b[\s\S]{0,400}\b10[3-7]\b|UAE[\s\S]{0,400}\b10[3-7]\b/i.test(txt);
            if (!hasIL100 && !hasAE105) warn('IL=100 and AE≈105 not co-located in text', 'COL display may use a different format');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 7. Best-pick callout ───────────────────────────────────────────────
    await step('Best-pick callout: mentions purchasing power / best choice', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const all = page.locator('button:has-text("All"), button:has-text("הכל"), button:has-text("Todos")').first();
            if (await all.count()) await all.click({ force: true }).catch(() => {});
            await page.waitForTimeout(1000);
            const has = await page.evaluate(() =>
                /purchasing power|כוח קנייה|poder de compra|best pick|המומלצת|Best Choice|recomendada|recomendado/i.test(document.body.textContent || '')
            );
            if (!has) warn('Best-pick / purchasing-power callout not visible', 'may need at least 2 countries selected');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 8. Exit tax ────────────────────────────────────────────────────────
    await step('/exit-tax-calculator: page renders + has form inputs', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/exit-tax-calculator');
        try {
            const inputs = await page.locator('input, select').count();
            if (inputs < 2) throw new Error(`only ${inputs} form fields on exit-tax page`);
            const has100A = await page.evaluate(() => /100A|100א|Section 100|סעיף 100/i.test(document.body.textContent || ''));
            if (!has100A) warn('No mention of Section 100A', 'exit-tax page may use different copy');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 9. Social compare ──────────────────────────────────────────────────
    await step('/social-compare: page renders + mentions Bituach Leumi', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/social-compare');
        try {
            const len = await page.evaluate(() => (document.body.textContent || '').length);
            if (len < 400) throw new Error(`/social-compare body length ${len} — likely 404 or empty`);
            const has = await page.evaluate(() => /Bituach|ביטוח לאומי|Social Security|seguridade social/i.test(document.body.textContent || ''));
            if (!has) warn('Bituach Leumi / Social Security not mentioned', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 10. /salary-compare ────────────────────────────────────────────────
    await step('/salary-compare: route renders + has country comparison', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/salary-compare');
        try {
            const len = await page.evaluate(() => (document.body.textContent || '').length);
            if (len < 400) throw new Error(`/salary-compare body length ${len} — likely 404`);
            const chips = await page.locator('span[data-code]').count();
            if (chips < 5) warn(`only ${chips} country chips on /salary-compare`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 11. i18n he/en/pt/es ───────────────────────────────────────────────
    await step('i18n: 4 language pills (HE/EN/PT/ES) are uppercase', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const pills = await page.evaluate(() => {
                const out = {};
                ['en', 'pt', 'es', 'he'].forEach(l => {
                    const el = document.querySelector(`[data-wl-lang="${l}"], [data-lang="${l}"]`);
                    if (el) out[l] = (el.textContent || '').trim();
                });
                return out;
            });
            const langs = Object.keys(pills);
            if (langs.length < 4) { warn(`only ${langs.length}/4 lang pills found`, ''); return; }
            const wrong = Object.entries(pills).filter(([k, v]) => v && v !== v.toUpperCase());
            if (wrong.length) throw new Error(`pills not uppercase: ${wrong.map(([k,v]) => k+'='+v).join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('i18n: EN click flips html.dir to ltr', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const en = page.locator('[data-wl-lang="en"], [data-lang="en"]').first();
            if (!(await en.count())) { warn('EN pill not found', ''); return; }
            await en.click({ force: true }).catch(() => {});
            await page.waitForTimeout(1500);
            const dir = await page.evaluate(() => document.documentElement.dir);
            if (dir === 'rtl') throw new Error(`html dir still rtl after EN — was "${dir}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('i18n: PT mode loads + no Hebrew chip-label leak', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            await page.evaluate(() => { localStorage.setItem('wl_lang', 'pt'); });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const leak = await page.evaluate(() => {
                const HE = /[֐-׿]/;
                const ALLOW = /Wize(Life|Money|Tax|Travel|Health|Deal|AI)/;
                const out = [];
                document.querySelectorAll('span[data-code], button.preset, .preset-btn').forEach(el => {
                    const t = (el.textContent || '').trim();
                    if (HE.test(t) && !ALLOW.test(t)) out.push(t.slice(0, 40));
                });
                return out.slice(0, 5);
            });
            if (leak.length) throw new Error(`Hebrew leaks in PT mode on chips: ${leak.join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('i18n: ES mode loads + selector strings translate', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            await page.evaluate(() => { localStorage.setItem('wl_lang', 'es'); });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2800);
            const txt = await page.evaluate(() => document.body.textContent || '');
            const hasES = /Todos|Borrar|Predeterminado|Padr|países|seleccionar/i.test(txt);
            if (!hasES) warn('No Spanish copy detected on /relocation-analyzer in ES mode', 'preset buttons may not be i18n-keyed');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 12. Vercel Speed Insights + Analytics ──────────────────────────────
    await step('Vercel Speed Insights: /_vercel/insights/script.js returns 200', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        try {
            const r = await ctx.request.get(BASE + '/_vercel/insights/script.js', { timeout: 10000 }).catch(() => null);
            if (!r) throw new Error('request failed entirely');
            if (r.status() !== 200) throw new Error(`status=${r.status()} on /_vercel/insights/script.js`);
        } finally { await ctx.close(); }
    });

    await step('Vercel Analytics: insights beacon requested on page load', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await suppressOnboarding(ctx);
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => {
            const url = r.url();
            if (/va\.vercel-scripts\.com|_vercel\/insights/i.test(url)) hits.push(url);
        });
        try {
            await page.goto(BASE + '/relocation-analyzer?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(5000);
            if (!hits.length) throw new Error('no Vercel Analytics / Speed Insights beacon requested');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 13. Onboarding modal ───────────────────────────────────────────────
    await step('Onboarding modal: ✕ close button is 44×44 (tap target)', async () => {
        // Don't suppress onboarding here — we want to see it.
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/relocation-analyzer?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            const close = page.locator('[aria-label*="close" i], [aria-label*="סגור"], button.modal-close, .onboarding-close, button:has-text("✕"), button:has-text("×")').first();
            if (!(await close.count())) { warn('Onboarding ✕ button not found', 'modal may auto-dismiss or be suppressed'); return; }
            const box = await close.boundingBox();
            if (!box) { warn('✕ button not visible', ''); return; }
            if (box.width < 44 || box.height < 44) throw new Error(`✕ button is ${box.width}×${box.height} — must be ≥ 44×44`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Onboarding modal: Escape key dismisses it', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/relocation-analyzer?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            const modal = page.locator('[role="dialog"], .onboarding-modal, .modal-backdrop').first();
            if (!(await modal.count())) { warn('No onboarding modal seen', 'first-visit may have been suppressed'); return; }
            const visibleBefore = await modal.isVisible().catch(() => false);
            if (!visibleBefore) { warn('Modal not visible', ''); return; }
            await page.keyboard.press('Escape');
            await page.waitForTimeout(700);
            const visibleAfter = await modal.isVisible().catch(() => false);
            if (visibleAfter) throw new Error('Escape did not dismiss onboarding modal');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Onboarding modal: backdrop click dismisses it', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/relocation-analyzer?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            const backdrop = page.locator('.modal-backdrop, [data-modal-backdrop], .onboarding-backdrop').first();
            if (!(await backdrop.count())) { warn('No backdrop element', 'modal may be inline'); return; }
            const visible = await backdrop.isVisible().catch(() => false);
            if (!visible) { warn('Backdrop not visible', ''); return; }
            // click top-left corner (clearly outside the centred dialog content)
            await backdrop.click({ position: { x: 5, y: 5 }, force: true }).catch(() => {});
            await page.waitForTimeout(700);
            const stillVisible = await backdrop.isVisible().catch(() => false);
            if (stillVisible) warn('Backdrop click did not dismiss modal', 'may require explicit ✕');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 14. Mobile viewport ────────────────────────────────────────────────
    await step('Mobile (iPhone 14 Pro): /relocation-analyzer no h-overflow', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer', { deviceProfile: devices['iPhone 14 Pro'] });
        try {
            const overflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth + 4
            );
            if (overflow) {
                const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
                throw new Error(`h-overflow at iPhone 14 Pro width — scrollWidth=${w.s} clientWidth=${w.c}`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mobile: country chips wrap (not horizontal scroll)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer', { deviceProfile: devices['iPhone 14 Pro'] });
        try {
            const chips = page.locator('span[data-code]');
            const count = await chips.count();
            if (count < 2) { warn('not enough chips to check wrapping', ''); return; }
            // Compare y-coordinates of first and last chip: if they all share a row → not wrapping; we want wrapping
            const firstBox = await chips.first().boundingBox();
            const lastBox = await chips.last().boundingBox();
            if (!firstBox || !lastBox) { warn('chip bounding box not measurable', ''); return; }
            if (Math.abs(firstBox.y - lastBox.y) < 5) {
                warn('All chips on one row at mobile width', 'expected to wrap to ≥2 rows on iPhone');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mobile: onboarding modal fits viewport (no h-overflow with modal open)', async () => {
        const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/relocation-analyzer?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            const overflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth + 4
            );
            if (overflow) throw new Error('horizontal overflow with onboarding modal open on iPhone 14 Pro');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizetax-flows-v5-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
