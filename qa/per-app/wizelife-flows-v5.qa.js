#!/usr/bin/env node
// WizeLife — flows v5 (25 new deep scenarios)
// Focus: NEW landing pages shipped 2026-05-19 — /p/salary-compare (country
// selector chips + Default/All/Clear + olim regime badges + payslip modal
// + share + i18n) and /p/relocate-portugal — plus onboarding 44×44 fix,
// language pills UPPERCASE rule, share menu, performance & console hygiene.
// Distinct from wizelife.qa.js / wizelife-deep.qa.js / -flows-v2 / -v3.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeLife-FlowsV5');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        waitUntil: 'load', timeout: 30000,
    });
    await page.waitForTimeout(1800);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. Country selector chips: render all 25 codes ─────────────────────
    await step('salary-compare: 25 country chips render with data-code', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#countriesChips .cchip', { timeout: 10000 });
            const codes = await page.evaluate(() =>
                Array.from(document.querySelectorAll('#countriesChips .cchip')).map(c => c.dataset.code)
            );
            if (codes.length < 20) throw new Error(`only ${codes.length} chips rendered (expected ~25)`);
            for (const c of ['IL', 'PT', 'CY', 'IT', 'AE', 'US']) {
                if (!codes.includes(c)) throw new Error(`chip for ${c} missing`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. IL chip is locked (cannot be deselected) ────────────────────────
    await step('salary-compare: IL chip is locked + visually marked', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#countriesChips .cchip[data-code="IL"]', { timeout: 10000 });
            const ilLocked = await page.evaluate(() => {
                const el = document.querySelector('#countriesChips .cchip[data-code="IL"]');
                return el && el.classList.contains('locked') && el.classList.contains('on');
            });
            if (!ilLocked) throw new Error('IL chip not marked locked+on');
            // Try to click IL: state must not flip off
            await page.click('#countriesChips .cchip[data-code="IL"]', { force: true });
            await page.waitForTimeout(400);
            const stillOn = await page.evaluate(() =>
                document.querySelector('#countriesChips .cchip[data-code="IL"]').classList.contains('on')
            );
            if (!stillOn) throw new Error('IL chip got toggled off — should be locked');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. Default selection has 8 chips on ────────────────────────────────
    await step('salary-compare: default selection = 8 chips on (IL+PT+CY+IT+ES+AE+US+GB)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.evaluate(() => localStorage.removeItem('wl_selected_countries'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForSelector('#countriesChips .cchip.on', { timeout: 10000 });
            const onCount = await page.evaluate(() =>
                document.querySelectorAll('#countriesChips .cchip.on').length
            );
            if (onCount !== 8) throw new Error(`expected 8 chips on by default, got ${onCount}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. "All" button selects every country ──────────────────────────────
    await step('salary-compare: All button selects all 25 countries', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#selAll', { timeout: 10000 });
            await page.click('#selAll');
            await page.waitForTimeout(500);
            const onCount = await page.evaluate(() =>
                document.querySelectorAll('#countriesChips .cchip.on').length
            );
            if (onCount < 20) throw new Error(`All button only turned on ${onCount} chips (expected ~25)`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. "Clear" reduces to IL only ──────────────────────────────────────
    await step('salary-compare: Clear button leaves only IL selected', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#selClear', { timeout: 10000 });
            await page.click('#selClear');
            await page.waitForTimeout(500);
            const on = await page.evaluate(() =>
                Array.from(document.querySelectorAll('#countriesChips .cchip.on')).map(e => e.dataset.code)
            );
            if (on.length !== 1 || on[0] !== 'IL') throw new Error(`Clear left ${JSON.stringify(on)} — expected just IL`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 6. Default button restores 8-set after All/Clear ───────────────────
    await step('salary-compare: Default button restores 8-set after All', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#selAll', { timeout: 10000 });
            await page.click('#selAll'); await page.waitForTimeout(300);
            await page.click('#selDefault'); await page.waitForTimeout(500);
            const onCount = await page.evaluate(() =>
                document.querySelectorAll('#countriesChips .cchip.on').length
            );
            if (onCount !== 8) throw new Error(`Default restored ${onCount}, expected 8`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 7. localStorage key persistence ────────────────────────────────────
    await step('salary-compare: selection persists via wl_selected_countries', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#selClear', { timeout: 10000 });
            await page.click('#selClear');
            await page.waitForTimeout(400);
            await page.click('#countriesChips .cchip[data-code="PT"]', { force: true });
            await page.waitForTimeout(400);
            const ls = await page.evaluate(() => localStorage.getItem('wl_selected_countries'));
            if (!ls || !/PT/.test(ls)) throw new Error(`wl_selected_countries missing PT: ${ls}`);
            await page.reload({ waitUntil: 'load' });
            await page.waitForSelector('#countriesChips .cchip', { timeout: 10000 });
            const ptOn = await page.evaluate(() =>
                document.querySelector('#countriesChips .cchip[data-code="PT"]').classList.contains('on')
            );
            if (!ptOn) throw new Error('PT was not restored after reload');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 8. Toggling off PT removes its row from results ────────────────────
    await step('salary-compare: clicking PT chip removes PT row from results', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#selDefault', { timeout: 10000 });
            await page.click('#selDefault'); // restore 8-set
            await page.waitForTimeout(800);
            const beforeRows = await page.evaluate(() => document.querySelectorAll('.r-row').length);
            // Click PT to deselect it
            await page.click('#countriesChips .cchip[data-code="PT"]', { force: true });
            await page.waitForTimeout(800);
            const afterRows = await page.evaluate(() => document.querySelectorAll('.r-row').length);
            if (afterRows >= beforeRows) throw new Error(`row count didn't drop: ${beforeRows} -> ${afterRows}`);
            const ptShown = await page.evaluate(() =>
                Array.from(document.querySelectorAll('.r-row .name')).some(n => /Portugal|פורטוגל|🇵🇹/.test(n.textContent))
            );
            if (ptShown) warn('PT row still rendered after chip deselect', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 9. Language switch preserves selection ─────────────────────────────
    await step('salary-compare: HE → EN language switch preserves chip selection', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#selClear', { timeout: 10000 });
            await page.click('#selClear');
            await page.waitForTimeout(300);
            await page.click('#countriesChips .cchip[data-code="AE"]', { force: true });
            await page.waitForTimeout(300);
            // Switch to EN
            const enBtn = page.locator('#langSwitch button[data-l="en"]').first();
            if (await enBtn.count()) {
                await enBtn.click();
                await page.waitForTimeout(600);
            }
            const aeStillOn = await page.evaluate(() => {
                const el = document.querySelector('#countriesChips .cchip[data-code="AE"]');
                return el && el.classList.contains('on');
            });
            if (!aeStillOn) throw new Error('AE chip lost selection after lang switch');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 10. Language pills are UPPERCASE ───────────────────────────────────
    await step('salary-compare: lang pills are UPPERCASE (HE/EN, not he/en)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#langSwitch button', { timeout: 8000 });
            const labels = await page.evaluate(() =>
                Array.from(document.querySelectorAll('#langSwitch button')).map(b => b.textContent.trim())
            );
            for (const l of labels) {
                if (l && l !== l.toUpperCase()) throw new Error(`pill "${l}" is not uppercase`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 11. Olim toggle on → NHR regime badge appears for PT ───────────────
    await step('salary-compare: enabling Olim toggle adds regime badge to PT row', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#olimToggle', { timeout: 10000 });
            await page.click('#selDefault');
            await page.waitForTimeout(500);
            await page.check('#olimToggle');
            await page.waitForTimeout(1200);
            const hasNHR = await page.evaluate(() =>
                /NHR|nhr|Non.?Habitual|⭐/i.test(document.querySelector('.results')?.textContent || '')
            );
            if (!hasNHR) throw new Error('No NHR / regime badge visible after olim toggle');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 12. Toggling Olim changes PT net (NHR cuts tax) ────────────────────
    await step('salary-compare: olim toggle on changes PT net value (NHR applied)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#olimToggle', { timeout: 10000 });
            await page.click('#selDefault');
            await page.waitForTimeout(700);
            const getPTNet = () => page.evaluate(() => {
                const row = Array.from(document.querySelectorAll('.r-row')).find(r =>
                    /Portugal|פורטוגל|🇵🇹/.test(r.textContent)
                );
                return row ? row.querySelector('.net')?.textContent || '' : '';
            });
            const before = await getPTNet();
            await page.check('#olimToggle');
            await page.waitForTimeout(1200);
            const after = await getPTNet();
            if (!before || !after) { warn('Could not read PT row both before/after', ''); return; }
            if (before === after) throw new Error(`PT net unchanged after NHR: ${before}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 13. IL net for gross=25000 is in plausible band ────────────────────
    await step('salary-compare: gross 25000 yields plausible IL net (>3000, <20000 USD)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#gross', { timeout: 10000 });
            await page.fill('#gross', '25000');
            await page.waitForTimeout(1200);
            const ilNet = await page.evaluate(() => {
                const row = Array.from(document.querySelectorAll('.r-row.il, .r-row')).find(r =>
                    /Israel|ישראל|🇮🇱/.test(r.textContent)
                );
                if (!row) return null;
                const t = row.querySelector('.net')?.textContent || '';
                const n = parseFloat(t.replace(/[^0-9.]/g, ''));
                return Number.isFinite(n) ? n : null;
            });
            if (ilNet === null) throw new Error('IL row / .net not found');
            if (ilNet < 3000 || ilNet > 20000) throw new Error(`IL net=$${ilNet} outside 3000-20000 band`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 14. UAE shows non-zero net (0% income tax country) ─────────────────
    await step('salary-compare: AE (0%-tax) net is non-zero & ≥ IL net', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#gross', { timeout: 10000 });
            await page.click('#selDefault');
            await page.waitForTimeout(700);
            const nets = await page.evaluate(() => {
                const get = (rx) => {
                    const row = Array.from(document.querySelectorAll('.r-row')).find(r => rx.test(r.textContent));
                    if (!row) return null;
                    const t = row.querySelector('.net')?.textContent || '';
                    const n = parseFloat(t.replace(/[^0-9.]/g, ''));
                    return Number.isFinite(n) ? n : null;
                };
                return { ae: get(/UAE|Emirates|אמירויות|🇦🇪/i), il: get(/Israel|ישראל|🇮🇱/) };
            });
            if (!nets.ae || nets.ae <= 0) throw new Error(`AE net implausible: ${nets.ae}`);
            if (nets.il && nets.ae < nets.il * 0.9) throw new Error(`AE ($${nets.ae}) < IL ($${nets.il}) — UAE should net more`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 15. Deep-analysis modal opens with manual + upload tabs ────────────
    await step('salary-compare: deep modal opens with both tabs visible', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#openDeepBtn', { timeout: 10000 });
            await page.click('#openDeepBtn');
            await page.waitForTimeout(800);
            const open = await page.evaluate(() => {
                const m = document.getElementById('deepModal');
                return m && m.classList.contains('on');
            });
            if (!open) throw new Error('deepModal didn\'t open');
            const tabs = await page.evaluate(() =>
                Array.from(document.querySelectorAll('.deep-modal-tabs button')).map(b => b.dataset.tab)
            );
            for (const t of ['manual', 'upload']) {
                if (!tabs.includes(t)) throw new Error(`tab "${t}" missing`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 16. Deep modal close button works ──────────────────────────────────
    await step('salary-compare: deep modal × button closes it', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#openDeepBtn', { timeout: 10000 });
            await page.click('#openDeepBtn');
            await page.waitForTimeout(700);
            await page.click('#closeDeep');
            await page.waitForTimeout(600);
            const open = await page.evaluate(() =>
                document.getElementById('deepModal').classList.contains('on')
            );
            if (open) throw new Error('deepModal still open after × click');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 17. Payslip dropzone exists in upload tab ──────────────────────────
    await step('salary-compare: payslip dropzone + file input present', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#openDeepBtn', { timeout: 10000 });
            await page.click('#openDeepBtn');
            await page.waitForTimeout(500);
            await page.click('.deep-modal-tabs button[data-tab="upload"]');
            await page.waitForTimeout(400);
            const ok = await page.evaluate(() => {
                const drop = document.getElementById('dropZone');
                const file = document.getElementById('payslipFile');
                return drop && file && file.type === 'file';
            });
            if (!ok) throw new Error('dropZone or payslipFile input missing');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 18. /p/relocate-portugal loads with savings panel ──────────────────
    await step('relocate-portugal: page loads + NHR savings panel renders', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/relocate-portugal.html');
        try {
            const ok = await page.evaluate(() =>
                !!document.getElementById('savings') &&
                !!document.getElementById('ilTotal') &&
                !!document.getElementById('ptTotal')
            );
            if (!ok) throw new Error('savings / ilTotal / ptTotal missing');
            const text = await page.evaluate(() => document.body.innerText);
            if (!/NHR|Non.?Habitual/i.test(text)) throw new Error('No NHR copy on relocate-portugal');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 19. /p/relocate-portugal: changing gross updates savings ───────────
    await step('relocate-portugal: editing gross changes 10-year savings number', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/relocate-portugal.html');
        try {
            await page.waitForSelector('#gross', { timeout: 10000 });
            const before = await page.textContent('#savingsBig');
            await page.fill('#gross', '80000');
            await page.waitForTimeout(900);
            const after = await page.textContent('#savingsBig');
            if (!before || !after) throw new Error('savingsBig text missing');
            if (before === after) throw new Error(`savings unchanged after gross 80k: "${after}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 20. relocate-portugal: lang pills UPPERCASE ────────────────────────
    await step('relocate-portugal: lang pills uppercase (HE/EN)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/relocate-portugal.html');
        try {
            const labels = await page.evaluate(() =>
                Array.from(document.querySelectorAll('#langSwitch button')).map(b => b.textContent.trim())
            );
            if (labels.length === 0) throw new Error('No language pills');
            for (const l of labels) {
                if (l && l !== l.toUpperCase()) throw new Error(`pill "${l}" is not uppercase`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 21. Onboarding modal: × button is at least 44×44 (WCAG 2.5.5) ─────
    await step('Onboarding × button meets 44×44 touch target', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 }, '/');
        try {
            // Force-show the onboarding to inspect it
            await page.evaluate(() => {
                // Clear any "already seen" flags
                Object.keys(localStorage).filter(k => /ob|onboard|seen|tour/i.test(k))
                    .forEach(k => localStorage.removeItem(k));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3500);
            const dims = await page.evaluate(() => {
                const root = document.getElementById('wize-onboarding');
                if (!root) return null;
                const x = root.querySelector('button[aria-label*="lose" i], button[aria-label*="ger" i], button[aria-label*="ar" i]') ||
                          Array.from(root.querySelectorAll('button')).find(b => b.textContent.trim() === '✕');
                if (!x) return null;
                const r = x.getBoundingClientRect();
                return { w: Math.round(r.width), h: Math.round(r.height) };
            });
            if (!dims) { warn('Onboarding modal/close button not found', 'may not auto-show on this page'); return; }
            if (dims.w < 44 || dims.h < 44) throw new Error(`× button ${dims.w}×${dims.h} < 44×44`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 22. Onboarding has visible Skip button ─────────────────────────────
    await step('Onboarding shows Skip button', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 }, '/');
        try {
            await page.evaluate(() => {
                Object.keys(localStorage).filter(k => /ob|onboard|seen|tour/i.test(k))
                    .forEach(k => localStorage.removeItem(k));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3500);
            const hasSkip = await page.evaluate(() => {
                const root = document.getElementById('wize-onboarding');
                if (!root) return false;
                return Array.from(root.querySelectorAll('button')).some(b =>
                    /skip|דלג|pular|saltar/i.test(b.textContent.trim())
                );
            });
            if (!hasSkip) { warn('No Skip button in onboarding modal', 'may already be dismissed for this user'); }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 23. Share menu (WizeShare) exists globally on salary-compare ───────
    await step('salary-compare: WizeShare global object loaded', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForTimeout(2500);
            const present = await page.evaluate(() => typeof window.WizeShare === 'object' && window.WizeShare !== null);
            if (!present) warn('window.WizeShare missing', 'share menu falls back to bare WhatsApp URL');
            const btnCount = await page.evaluate(() => document.querySelectorAll('.share-btns button').length);
            if (btnCount < 3) throw new Error(`only ${btnCount} share buttons (expected WhatsApp+Email+Copy)`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 24. Performance: salary-compare loads in <8 s ──────────────────────
    await step('salary-compare: page load complete in <8 s', async () => {
        const start = Date.now();
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html');
        try {
            await page.waitForSelector('#countriesChips .cchip', { timeout: 9000 });
            const elapsed = Date.now() - start;
            if (elapsed > 8000) throw new Error(`load took ${elapsed} ms (>8000)`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 25. No console errors on salary-compare during typical flow ────────
    await step('salary-compare: no JS console errors during typical interaction', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(String(e.message).slice(0, 180)));
        page.on('console', m => { if (m.type() === 'error') errs.push(String(m.text()).slice(0, 180)); });
        try {
            await page.goto(BASE + '/p/salary-compare.html?_t=' + Date.now(), { waitUntil: 'load', timeout: 25000 });
            await page.waitForTimeout(1500);
            await page.fill('#gross', '30000').catch(() => {});
            await page.waitForTimeout(700);
            await page.click('#selAll').catch(() => {});
            await page.waitForTimeout(500);
            await page.click('#selDefault').catch(() => {});
            await page.waitForTimeout(400);
            // Filter known noise: ad-blockers, analytics blocked in headless, manifest 401s
            const noisy = /clarity|googletag|gstatic|manifest|favicon|web-app|net::ERR_BLOCKED|net::ERR_ABORTED|the server responded with a status of 4|hreflang/i;
            const real = errs.filter(e => !noisy.test(e));
            if (real.length) throw new Error(`${real.length} console error(s): ${real.slice(0, 2).join(' | ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    await finalize();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
