#!/usr/bin/env node
// WizeLife — flows v6 (30 NEW deep scenarios)
// Focus: areas NOT covered by v2-v5 / security-v2 on /p/salary-compare —
//   • numeric/edge-case input handling on #gross
//   • the NEW residency-status checker (#residencyCard / #resResult)
//   • the Pro/YOLO deep line-item <table> (16+ rows incl. capgains/retage/
//     vacation/maternity/DNV + totalDed totals row)
//   • country-chip → deep-table column derivation
//   • deep-modal input persistence (wl_deep_inputs)
//   • #deep hash auto-open, attribution capture (wl_attribution)
//   • multi-language round-trip, back/forward state, corrupt-LS resilience.
// Distinct from wizelife.qa.js / -deep / -flows-v2 / -v3 / -v5 / security-v2.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://wizelife.ai';
const SC = '/p/salary-compare.html';
const { step, warn, finalize } = makeReporter('WizeLife-FlowsV6');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = SC) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    // Insert the cache-buster BEFORE any #hash so location.hash stays clean
    // (e.g. ".../salary-compare.html?_t=123#deep" not "...#deep?_t=123").
    const hashIdx = path.indexOf('#');
    const hash = hashIdx >= 0 ? path.slice(hashIdx) : '';
    const noHash = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
    const url = BASE + noHash + (noHash.includes('?') ? '&' : '?') + '_t=' + Date.now() + hash;
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1600);
    return { ctx, page };
}

// Helper: read the visible IL net (USD) from the top results.
async function ilNet(page) {
    return page.evaluate(() => {
        const row = Array.from(document.querySelectorAll('.r-row')).find(r => /Israel|ישראל|🇮🇱/.test(r.textContent));
        if (!row) return null;
        const n = parseFloat((row.querySelector('.net')?.textContent || '').replace(/[^0-9.]/g, ''));
        return Number.isFinite(n) ? n : null;
    });
}

// Helper: open residency card, set fields, click check, return #resResult text.
async function runResidency(page, { days, family, home, employer }) {
    await page.waitForSelector('#residencyCard', { timeout: 10000 });
    await page.evaluate(() => { document.getElementById('residencyBody').style.display = 'block'; });
    await page.fill('#resDays', String(days));
    if (family)   await page.selectOption('#resFamily', family);
    if (home)     await page.selectOption('#resHome', home);
    if (employer) await page.selectOption('#resEmployer', employer);
    await page.click('#resCheck');
    await page.waitForTimeout(500);
    return page.evaluate(() => document.getElementById('resResult').innerText || '');
}

// Helper: set a paid plan in SSO localStorage then reload so getUserPlan() sees it.
async function setPlan(page, plan) {
    await page.evaluate((p) => localStorage.setItem('wl_sso', JSON.stringify({ plan: p })), plan);
}

// Helper: run the deep analysis (assumes plan already set + page loaded).
async function runDeep(page, gross = '25000') {
    await page.waitForSelector('#openDeepBtn', { timeout: 10000 });
    await page.click('#openDeepBtn');
    await page.waitForTimeout(500);
    await page.fill('#dGross', gross);
    await page.click('#runDeep');
    await page.waitForTimeout(900);
}

(async () => {
    const browser = await chromium.launch();

    // ════════ CATEGORY 1 — #gross numeric edge cases (5) ════════

    // 1. Negative gross → no crash, IL net not negative
    await step('gross edge: negative (-5000) does not crash / no negative net', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#gross', { timeout: 10000 });
            await page.fill('#gross', '-5000');
            await page.waitForTimeout(1000);
            const n = await ilNet(page);
            if (n !== null && n < 0) throw new Error(`IL net is negative ($${n}) for negative gross`);
            const crashed = await page.evaluate(() => /undefined|NaN|Infinity/.test(document.querySelector('.results')?.textContent || ''));
            if (crashed) throw new Error('NaN/undefined/Infinity leaked into results');
        } finally { await page.close(); await ctx.close(); }
    });

    // 2. gross = 0 → results either empty or zeroed, no NaN
    await step('gross edge: zero yields no NaN in results', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#gross', { timeout: 10000 });
            await page.fill('#gross', '0');
            await page.waitForTimeout(1000);
            const txt = await page.evaluate(() => document.querySelector('.results')?.textContent || '');
            if (/NaN|undefined|Infinity/.test(txt)) throw new Error('NaN/undefined leaked at gross=0');
        } finally { await page.close(); await ctx.close(); }
    });

    // 3. Very large gross (9,999,999) → finite plausible net, no overflow
    await step('gross edge: 9999999 yields finite IL net (no overflow)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#gross', { timeout: 10000 });
            await page.fill('#gross', '9999999');
            await page.waitForTimeout(1200);
            const n = await ilNet(page);
            if (n === null) throw new Error('IL net not found for huge gross');
            if (!Number.isFinite(n)) throw new Error(`IL net not finite: ${n}`);
            if (n <= 0) throw new Error(`IL net non-positive ($${n}) for huge gross`);
        } finally { await page.close(); await ctx.close(); }
    });

    // 4. Paste non-numeric ("abc") → number input rejects / no NaN render
    await step('gross edge: non-numeric "abc" rejected, no NaN render', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#gross', { timeout: 10000 });
            await page.fill('#gross', 'abc').catch(() => {}); // number input may reject
            await page.waitForTimeout(800);
            const val = await page.evaluate(() => document.getElementById('gross').value);
            // type=number keeps value empty for invalid input
            if (/[a-z]/i.test(val)) throw new Error(`#gross accepted letters: "${val}"`);
            const txt = await page.evaluate(() => document.querySelector('.results')?.textContent || '');
            if (/NaN|undefined/.test(txt)) throw new Error('NaN leaked after non-numeric input');
        } finally { await page.close(); await ctx.close(); }
    });

    // 5. Decimal gross (12500.75) → handled, finite net
    await step('gross edge: decimal 12500.75 yields finite net', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#gross', { timeout: 10000 });
            await page.fill('#gross', '12500.75');
            await page.waitForTimeout(1000);
            const n = await ilNet(page);
            if (n === null || !Number.isFinite(n) || n <= 0) throw new Error(`decimal gross net implausible: ${n}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════ CATEGORY 2 — Residency checker (NEW) (3) ════════

    // 6. days=200 + family=il → "likely resident" (score 85)
    await step('residency: days=200 family=il → Likely resident (red)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const out = await runResidency(page, { days: 200, family: 'il', home: 'il', employer: 'il' });
            if (!out) throw new Error('#resResult empty — checker did not run');
            if (!/Likely Israeli tax resident|תושב מס ישראלי/i.test(out))
                throw new Error(`expected resident verdict, got: ${out.slice(0, 80)}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // 7. days=20 family=abroad home=abroad → "non-resident"
    await step('residency: days=20 family/home=abroad → Likely non-resident (green)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const out = await runResidency(page, { days: 20, family: 'abroad', home: 'abroad', employer: 'abroad' });
            if (!out) throw new Error('#resResult empty');
            if (!/non-resident|תושב חוץ/i.test(out))
                throw new Error(`expected non-resident verdict, got: ${out.slice(0, 80)}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // 8. days=90 family=il home=abroad → gray zone (score 48)
    await step('residency: days=90 family=il home=abroad → Gray zone', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const out = await runResidency(page, { days: 90, family: 'il', home: 'abroad', employer: 'abroad' });
            if (!out) throw new Error('#resResult empty');
            if (!/Gray zone|אזור אפור|professional ruling|חוות דעת/i.test(out))
                throw new Error(`expected gray-zone verdict, got: ${out.slice(0, 90)}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════ CATEGORY 3 — Deep line-item table (NEW) (3) ════════

    // 9. YOLO plan → deep <table> with totals row + 16+ rows
    await step('deep table: YOLO plan renders full <table> with totals row', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await setPlan(page, 'yolo');
            await runDeep(page, '25000');
            const info = await page.evaluate(() => {
                const dr = document.getElementById('deepResult');
                const table = dr && dr.querySelector('table');
                if (!table) return { hasTable: false };
                const rows = table.querySelectorAll('tbody tr').length;
                const txt = table.textContent;
                return { hasTable: true, rows, txt };
            });
            if (!info.hasTable) throw new Error('no <table> rendered for YOLO plan (gate not unlocked?)');
            if (info.rows < 16) throw new Error(`only ${info.rows} table rows (expected 16+)`);
        } finally { await page.close(); await ctx.close(); }
    });

    // 10. Deep table contains the new life rows (capgains/retage/vacation/maternity/DNV)
    await step('deep table: capital-gains/retirement/vacation/maternity/DNV rows present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await setPlan(page, 'yolo');
            await runDeep(page, '25000');
            const txt = await page.evaluate(() => document.querySelector('#deepResult table')?.textContent || '');
            if (!txt) throw new Error('no deep table to inspect');
            const checks = {
                'capital gains': /Capital gains|רווחי הון/i,
                'retirement age': /Retirement age|גיל פרישה/i,
                'vacation': /Vacation|חופשה/i,
                'maternity': /maternity|לידה/i,
                'DNV': /nomad|נוודות/i,
            };
            const missing = Object.entries(checks).filter(([, rx]) => !rx.test(txt)).map(([k]) => k);
            if (missing.length) throw new Error(`missing rows: ${missing.join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // 11. Totals row (totalDed) present in deep table
    await step('deep table: total monthly-deductions (totalDed) row present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await setPlan(page, 'yolo');
            await runDeep(page, '25000');
            const txt = await page.evaluate(() => document.querySelector('#deepResult table')?.textContent || '');
            if (!txt) throw new Error('no deep table');
            if (!/Total monthly deductions|סך ניכויים/i.test(txt)) throw new Error('totals row missing');
        } finally { await page.close(); await ctx.close(); }
    });

    // 12. Free plan → gated teaser, NO table
    await step('deep table: free plan shows upgrade teaser (no <table>)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.removeItem('wl_sso')); // ensure free
            await runDeep(page, '25000');
            const has = await page.evaluate(() => !!document.querySelector('#deepResult table'));
            const teaser = await page.evaluate(() => /Pro \/ YOLO|Pro\/YOLO|Upgrade|שדרג/i.test(document.getElementById('deepResult')?.textContent || ''));
            if (has) throw new Error('free plan exposed full <table> — gate broken');
            if (!teaser) warn('free plan: no upgrade teaser shown', 'expected Pro/YOLO CTA');
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════ CATEGORY 4 — Country chip → deep table columns (3) ════════

    // 13. Select only PT+IT → deep table columns = IL+PT+IT
    await step('chip→deep: PT+IT only → table shows IL+PT+IT columns', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await setPlan(page, 'yolo');
            await page.waitForSelector('#selClear', { timeout: 10000 });
            await page.click('#selClear'); await page.waitForTimeout(300);
            await page.click('#countriesChips .cchip[data-code="PT"]', { force: true }); await page.waitForTimeout(200);
            await page.click('#countriesChips .cchip[data-code="IT"]', { force: true }); await page.waitForTimeout(400);
            await runDeep(page, '25000');
            const hdr = await page.evaluate(() => document.querySelector('#deepResult table thead')?.textContent || '');
            if (!hdr) throw new Error('no deep table header');
            if (!/Israel|ישראל|🇮🇱/.test(hdr)) throw new Error('IL column missing');
            if (!/Portugal|פורטוגל|🇵🇹/.test(hdr)) throw new Error('PT column missing');
            if (!/Italy|איטליה|🇮🇹/.test(hdr)) throw new Error('IT column missing');
            // Should NOT include a non-selected country like US/UAE
            if (/United States|🇺🇸|UAE|🇦🇪/.test(hdr)) warn('deep table shows unselected country', `header="${hdr.slice(0, 80)}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // 14. Chip deselection reflected in top results AND deep table
    await step('chip→deep: deselecting PT removes it from deep table header', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await setPlan(page, 'yolo');
            await page.waitForSelector('#selDefault', { timeout: 10000 });
            await page.click('#selDefault'); await page.waitForTimeout(400);
            await page.click('#countriesChips .cchip[data-code="PT"]', { force: true }); // off
            await page.waitForTimeout(400);
            await runDeep(page, '25000');
            const hdr = await page.evaluate(() => document.querySelector('#deepResult table thead')?.textContent || '');
            if (hdr && /Portugal|פורטוגל|🇵🇹/.test(hdr)) warn('PT still in deep header after deselect', hdr.slice(0, 60));
        } finally { await page.close(); await ctx.close(); }
    });

    // 15. Single-country (IL only via Clear) → deep table renders cleanly.
    // KNOWN BUG: with Clear (IL-only) the deep <table> header interpolates
    // literal "undefined" between country names and NaN cells leak in — the
    // deep flow ignores the chip selection and falls back to a global top-5.
    await step('chip→deep: Clear (IL-only) deep table renders without undefined/NaN', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await setPlan(page, 'yolo');
            await page.waitForSelector('#selClear', { timeout: 10000 });
            await page.click('#selClear'); await page.waitForTimeout(400);
            await runDeep(page, '25000');
            const t = await page.evaluate(() => {
                const tbl = document.querySelector('#deepResult table');
                return tbl ? { hasIL: /Israel|ישראל|🇮🇱/.test(tbl.textContent), bad: /NaN|undefined/.test(tbl.textContent), thead: tbl.querySelector('thead')?.textContent.slice(0, 90) } : null;
            });
            if (!t) throw new Error('no deep table for IL-only selection');
            if (!t.hasIL) throw new Error('IL column missing from IL-only deep table');
            if (t.bad) throw new Error(`undefined/NaN leaked into deep table header: "${t.thead}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════ CATEGORY 5 — Deep-modal input persistence (3) ════════

    // 16. Fill 5 fields, run, verify wl_deep_inputs persisted with all keys
    await step('deep persist: wl_deep_inputs saved with 5 fields after run', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await setPlan(page, 'yolo');
            await page.click('#openDeepBtn'); await page.waitForTimeout(400);
            await page.fill('#dGross', '31000');
            await page.fill('#dPensionEmp', '7');
            await page.fill('#dPensionEr', '8.5');
            await page.selectOption('#dKeren', 'none');
            await page.selectOption('#dChildren', '2');
            await page.click('#runDeep'); await page.waitForTimeout(600);
            const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('wl_deep_inputs') || '{}'));
            for (const k of ['gross', 'pensionEmp', 'pensionEr', 'keren', 'children']) {
                if (saved[k] === undefined || saved[k] === null) throw new Error(`wl_deep_inputs missing "${k}": ${JSON.stringify(saved)}`);
            }
            if (Number(saved.gross) !== 31000) throw new Error(`gross not persisted: ${saved.gross}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // 17. Reload → modal auto-restores from wl_deep_inputs
    await step('deep persist: reload auto-restores dGross from wl_deep_inputs', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await setPlan(page, 'yolo');
            await page.click('#openDeepBtn'); await page.waitForTimeout(400);
            await page.fill('#dGross', '42000');
            await page.click('#runDeep'); await page.waitForTimeout(500);
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(1500);
            await page.click('#openDeepBtn'); await page.waitForTimeout(500);
            const v = await page.evaluate(() => document.getElementById('dGross').value);
            if (Number(v) !== 42000) throw new Error(`dGross not restored after reload: "${v}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // 18. Corrupt wl_deep_inputs JSON → modal still opens (loadDeepInputs catch)
    await step('deep persist: corrupt wl_deep_inputs JSON → modal still opens', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_deep_inputs', '{not valid json'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(1500);
            await page.click('#openDeepBtn'); await page.waitForTimeout(500);
            const open = await page.evaluate(() => document.getElementById('deepModal').classList.contains('on'));
            if (!open) throw new Error('deep modal failed to open with corrupt wl_deep_inputs');
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════ CATEGORY 6 — URL / hash auto-open (3) ════════

    // 19. Visiting #deep auto-opens the modal after delay
    await step('hash: #deep auto-opens deep modal', async () => {
        const { ctx, page } = await fresh(browser, undefined, SC + '#deep');
        try {
            await page.waitForTimeout(1200); // wait past the 350ms setTimeout
            const open = await page.evaluate(() => document.getElementById('deepModal').classList.contains('on'));
            if (!open) throw new Error('#deep did not auto-open the deep modal');
        } finally { await page.close(); await ctx.close(); }
    });

    // 20. No hash → modal stays closed on load
    await step('hash: no #deep → modal stays closed', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const open = await page.evaluate(() => document.getElementById('deepModal').classList.contains('on'));
            if (open) throw new Error('deep modal auto-opened without #deep hash');
        } finally { await page.close(); await ctx.close(); }
    });

    // 21. #deep with YOLO plan → opened modal can immediately run deep table
    await step('hash: #deep + YOLO → run produces full table', async () => {
        const { ctx, page } = await fresh(browser, undefined, SC + '#deep');
        try {
            await setPlan(page, 'yolo');
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(1500);
            await page.fill('#dGross', '25000');
            await page.click('#runDeep'); await page.waitForTimeout(900);
            const has = await page.evaluate(() => !!document.querySelector('#deepResult table'));
            if (!has) throw new Error('no table after #deep+YOLO run');
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════ CATEGORY 7 — Attribution capture (3) ════════

    // 22. ?ref=test123 → wl_attribution.first + last capture ref
    await step('attribution: ?ref=test123 captured into wl_attribution.first/last', async () => {
        const { ctx, page } = await fresh(browser, undefined, SC + '?ref=test123');
        try {
            await page.waitForTimeout(800);
            const a = await page.evaluate(() => JSON.parse(localStorage.getItem('wl_attribution') || '{}'));
            if (!a.first || a.first.ref !== 'test123') throw new Error(`first.ref not test123: ${JSON.stringify(a.first)}`);
            if (!a.last || a.last.ref !== 'test123') throw new Error(`last.ref not test123`);
        } finally { await page.close(); await ctx.close(); }
    });

    // 23. ?utm_source=qa → wl_attribution captures utm_source
    await step('attribution: ?utm_source=qa captured', async () => {
        const { ctx, page } = await fresh(browser, undefined, SC + '?utm_source=qa&utm_campaign=v6');
        try {
            await page.waitForTimeout(800);
            const a = await page.evaluate(() => JSON.parse(localStorage.getItem('wl_attribution') || '{}'));
            if (!a.first || a.first.utm_source !== 'qa') throw new Error(`utm_source not captured: ${JSON.stringify(a.first)}`);
            if (a.first.utm_campaign !== 'v6') warn('utm_campaign not captured', JSON.stringify(a.first));
        } finally { await page.close(); await ctx.close(); }
    });

    // 24. First-touch immutable: 2nd visit with new ref keeps original first, updates last
    await step('attribution: first-touch immutable, last-touch updates on 2nd ref', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + SC + '?ref=alpha&_t=' + Date.now(), { waitUntil: 'load', timeout: 25000 });
            await page.waitForTimeout(700);
            await page.goto(BASE + SC + '?ref=beta&_t=' + Date.now(), { waitUntil: 'load', timeout: 25000 });
            await page.waitForTimeout(700);
            const a = await page.evaluate(() => JSON.parse(localStorage.getItem('wl_attribution') || '{}'));
            if (!a.first || a.first.ref !== 'alpha') throw new Error(`first-touch overwritten: ${JSON.stringify(a.first)}`);
            if (!a.last || a.last.ref !== 'beta') throw new Error(`last-touch not updated: ${JSON.stringify(a.last)}`);
            if (!(a.touches >= 2)) warn('touches count not incremented', String(a.touches));
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════ CATEGORY 8 — Language round-trip (3) ════════

    // 25. Cycle through every available lang pill and back, no crash + chips re-render
    await step('lang: round-trip across all pills preserves chips + re-renders', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#langSwitch button', { timeout: 10000 });
            const langs = await page.evaluate(() =>
                Array.from(document.querySelectorAll('#langSwitch button')).map(b => b.dataset.l));
            if (langs.length < 2) throw new Error(`only ${langs.length} lang pills`);
            // Note: page currently ships HE+EN only; PT/ES are a known 4-lang gap.
            if (!langs.includes('pt') || !langs.includes('es'))
                warn('salary-compare missing PT/ES lang pills', `has only [${langs.join(',')}] — 4-language rule unmet on this page`);
            for (const l of [...langs, langs[0]]) {
                await page.click(`#langSwitch button[data-l="${l}"]`);
                await page.waitForTimeout(350);
                const chipCount = await page.evaluate(() => document.querySelectorAll('#countriesChips .cchip').length);
                if (chipCount < 5) throw new Error(`chips vanished after switching to ${l} (${chipCount})`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // 26. Switching language re-localizes chip labels (EN names differ from HE)
    await step('lang: chip labels re-localize HE↔EN', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#countriesChips .cchip', { timeout: 10000 });
            await page.click('#langSwitch button[data-l="he"]'); await page.waitForTimeout(400);
            const he = await page.evaluate(() => document.querySelector('#countriesChips .cchip[data-code="IL"]')?.textContent.trim() || '');
            await page.click('#langSwitch button[data-l="en"]'); await page.waitForTimeout(400);
            const en = await page.evaluate(() => document.querySelector('#countriesChips .cchip[data-code="IL"]')?.textContent.trim() || '');
            if (!he || !en) throw new Error('IL chip label empty in one lang');
            if (he === en) warn('IL chip label identical HE vs EN', `"${he}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // 27. Lang persists via wl_lang across reload
    await step('lang: selection persists in wl_lang across reload', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#langSwitch button[data-l="en"]', { timeout: 10000 });
            await page.click('#langSwitch button[data-l="en"]'); await page.waitForTimeout(400);
            const stored = await page.evaluate(() => localStorage.getItem('wl_lang'));
            if (stored !== 'en') throw new Error(`wl_lang not "en": ${stored}`);
            await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1200);
            const active = await page.evaluate(() =>
                document.querySelector('#langSwitch button.on')?.dataset.l);
            if (active !== 'en') throw new Error(`lang not restored to en (got ${active})`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════ CATEGORY 9 — Back/forward navigation (2) ════════

    // 28. Navigate away then Back → page still functional (chips render)
    await step('nav: back from relocate-portugal restores salary-compare', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#countriesChips .cchip', { timeout: 10000 });
            await page.goto(BASE + '/p/relocate-portugal.html?_t=' + Date.now(), { waitUntil: 'load', timeout: 25000 });
            await page.waitForTimeout(800);
            await page.goBack({ waitUntil: 'load' });
            await page.waitForTimeout(1500);
            const chips = await page.evaluate(() => document.querySelectorAll('#countriesChips .cchip').length);
            if (chips < 5) throw new Error(`salary-compare broken after Back (${chips} chips)`);
        } finally { await page.close(); await ctx.close(); }
    });

    // 29. Forward navigation re-loads relocate-portugal without crash
    await step('nav: forward re-loads relocate-portugal cleanly', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#countriesChips .cchip', { timeout: 10000 });
            await page.goto(BASE + '/p/relocate-portugal.html?_t=' + Date.now(), { waitUntil: 'load', timeout: 25000 });
            await page.waitForTimeout(700);
            await page.goBack({ waitUntil: 'load' }); await page.waitForTimeout(1000);
            await page.goForward({ waitUntil: 'load' }); await page.waitForTimeout(1200);
            const ok = await page.evaluate(() => !!document.getElementById('savings') || !!document.getElementById('gross'));
            if (!ok) throw new Error('relocate-portugal did not re-render after Forward');
        } finally { await page.close(); await ctx.close(); }
    });

    // ════════ CATEGORY 10 — localStorage resilience (1) ════════

    // 30. Corrupt wl_selected_countries → page loads with default 8 (no crash)
    await step('resilience: corrupt wl_selected_countries → loads default chips (no crash)', async () => {
        const errs = [];
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        page.on('pageerror', e => errs.push(String(e.message).slice(0, 140)));
        try {
            await page.goto(BASE + SC + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 25000 });
            await page.evaluate(() => localStorage.setItem('wl_selected_countries', '{bad json ['));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(1500);
            const onCount = await page.evaluate(() => document.querySelectorAll('#countriesChips .cchip.on').length);
            if (onCount < 1) throw new Error(`no chips selected after corrupt LS (${onCount}) — loadSelected catch failed`);
            const fatal = errs.filter(e => /selected_countries|JSON|loadSelected/i.test(e));
            if (fatal.length) throw new Error(`fatal parse error leaked: ${fatal[0]}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    await finalize();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
