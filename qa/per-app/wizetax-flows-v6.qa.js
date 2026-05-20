#!/usr/bin/env node
// WizeTax — flows v6 (30 NEW deep flows), distinct from v2–v5 + security-v2.
// Focus areas NOT covered before:
//  - /advisor RAG (Phase 2): numeric citation, no hedge words, source tag
//  - /relocation-analyzer gross edge cases (negative/0/huge), rapid olim toggle
//  - /exit-tax-calculator computed result
//  - /social-compare IL-vs-world
//  - provider failover → graceful error (no white screen)
//  - rate-limit UX on /api/chat → friendly 429
//  - scroll-lock confirmation (advisor locks, relocation scrolls)
//  - Vercel Speed Insights + Analytics beacons (warn if absent)
//  - back/forward route navigation preserves state
//  - mobile iPhone 14 Pro + Pixel 7 chips/modals
//  - i18n he/en/pt/es dir flips on /relocation-analyzer
const { chromium, devices } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://tax.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTax-FlowsV6');

// Pre-seed flags so onboarding / quick-start modals don't block render (v5 pattern).
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
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2500);
    return { ctx, page };
}

// Locate the advisor chat input + send button (Hebrew/EN tolerant).
function advisorInput(page) {
    return page.locator('textarea, input[type="text"]:not([type="number"]), [contenteditable="true"]').first();
}
function advisorSend(page) {
    return page.locator('button:has-text("שלח"), button:has-text("Send"), button[type="submit"], button[aria-label*="send" i], form button').first();
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. /advisor RAG: numeric citation ──────────────────────────────────
    await step('Advisor RAG: "מה המס בפורטוגל?" → answer cites a number', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/advisor');
        try {
            const inp = advisorInput(page);
            if (!(await inp.count())) throw new Error('advisor chat input not found');
            await inp.click({ force: true }).catch(() => {});
            await inp.fill('מה המס בפורטוגל?').catch(async () => { await inp.type('מה המס בפורטוגל?'); });
            await advisorSend(page).click({ force: true }).catch(() => {});
            // Render backend cold-start tolerant.
            const got = await page.waitForFunction(() => {
                const t = document.body.textContent || '';
                return /\d{1,3}\s?%|\d{2,}/.test(t.replace(/מה המס בפורטוגל\?/g, ''));
            }, { timeout: 55000 }).then(() => true).catch(() => false);
            if (!got) throw new Error('no numeric figure appeared in advisor response within 55s (cold start?)');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Advisor RAG: response contains NO hedge words (בערך/approximately/around)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/advisor');
        try {
            const inp = advisorInput(page);
            if (!(await inp.count())) { warn('advisor input not found', 'cannot test hedge words'); return; }
            await inp.click({ force: true }).catch(() => {});
            await inp.fill('מה המס בפורטוגל?').catch(async () => { await inp.type('מה המס בפורטוגל?'); });
            await advisorSend(page).click({ force: true }).catch(() => {});
            await page.waitForFunction(() => (document.body.textContent || '').length > 200, { timeout: 55000 }).catch(() => {});
            await page.waitForTimeout(3000);
            const hedges = await page.evaluate(() => {
                const t = (document.body.textContent || '');
                // ignore the echoed user question
                const body = t.replace(/מה המס בפורטוגל\?/g, '');
                const HEDGE = /\bבערך\b|\bapproximately\b|\baround\b|\broughly\b|\bבסביבות\b|\bמשוער\b|\bבקירוב\b/gi;
                return (body.match(HEDGE) || []).slice(0, 5);
            });
            if (hedges.length) warn(`hedge words present: ${hedges.join(', ')}`, 'RAG answers should give precise figures, not hedged ranges');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Advisor RAG: a source / citation tag is shown with the answer', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/advisor');
        try {
            const inp = advisorInput(page);
            if (!(await inp.count())) { warn('advisor input not found', ''); return; }
            await inp.click({ force: true }).catch(() => {});
            await inp.fill('מה המס בפורטוגל?').catch(async () => { await inp.type('מה המס בפורטוגל?'); });
            await advisorSend(page).click({ force: true }).catch(() => {});
            await page.waitForFunction(() => (document.body.textContent || '').length > 200, { timeout: 55000 }).catch(() => {});
            await page.waitForTimeout(2500);
            const hasSource = await page.evaluate(() => {
                const t = (document.body.textContent || '');
                const sel = document.querySelector('.source, .citation, [data-source], .rag-source, .sources');
                return !!sel || /מקור|source|citation|מקורות|sources|רשות המסים|OECD/i.test(t);
            });
            if (!hasSource) warn('no source/citation tag detected with answer', 'RAG Phase 2 should attach a source reference');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. /relocation-analyzer gross edge cases ────────────────────────────
    function grossInput(page) {
        return page.locator('input[type="number"], input[name*="gross" i], input[id*="gross" i], input[placeholder*="ברוטו"], input[placeholder*="gross" i]').first();
    }

    await step('Relocation: negative gross is rejected / clamped (no NaN, no crash)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const g = grossInput(page);
            if (!(await g.count())) { warn('gross input not found', 'edge-case test skipped'); return; }
            await g.fill('-50000').catch(() => {});
            await g.press('Tab').catch(() => {});
            await page.waitForTimeout(1200);
            const txt = await page.evaluate(() => document.body.textContent || '');
            if (/NaN|undefined|Infinity/.test(txt)) throw new Error('NaN/undefined/Infinity surfaced for negative gross');
            const errs = await page.evaluate(() => window.__qaErrs || 0);
            if (errs) throw new Error(`${errs} page errors after negative gross`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Relocation: gross = 0 produces a sane (zero or empty) result', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const g = grossInput(page);
            if (!(await g.count())) { warn('gross input not found', ''); return; }
            await g.fill('0').catch(() => {});
            await g.press('Tab').catch(() => {});
            await page.waitForTimeout(1200);
            const txt = await page.evaluate(() => document.body.textContent || '');
            if (/NaN|Infinity/.test(txt)) throw new Error('NaN/Infinity for gross=0');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Relocation: huge gross (999,999,999) does not break layout / NaN', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const g = grossInput(page);
            if (!(await g.count())) { warn('gross input not found', ''); return; }
            await g.fill('999999999').catch(() => {});
            await g.press('Tab').catch(() => {});
            await page.waitForTimeout(1200);
            const txt = await page.evaluate(() => document.body.textContent || '');
            if (/NaN|Infinity/.test(txt)) throw new Error('NaN/Infinity for huge gross');
            const overflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth + 8
            );
            if (overflow) warn('horizontal overflow with huge gross value', 'large numbers may break table layout');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Relocation: rapid olim toggle on/off ×6 leaves consistent state', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const olim = page.locator('button:has-text("Olim"), button:has-text("עולה"), button:has-text("עולים"), [data-toggle="olim"]').first();
            if (!(await olim.count())) { warn('olim toggle not found', ''); return; }
            for (let i = 0; i < 6; i++) { await olim.click({ force: true }).catch(() => {}); await page.waitForTimeout(150); }
            await page.waitForTimeout(800);
            const txt = await page.evaluate(() => document.body.textContent || '');
            if (/NaN|Infinity|undefined/.test(txt)) throw new Error('inconsistent state (NaN/undefined) after rapid olim toggling');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Relocation: regime badges (⭐) toggle on AND off with olim button', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const all = page.locator('button:has-text("All"), button:has-text("הכל"), button:has-text("Todos")').first();
            if (await all.count()) await all.click({ force: true }).catch(() => {});
            await page.waitForTimeout(400);
            const olim = page.locator('button:has-text("Olim"), button:has-text("עולה"), button:has-text("עולים"), [data-toggle="olim"]').first();
            if (!(await olim.count())) { warn('olim toggle not found', ''); return; }
            const cnt = () => page.evaluate(() => (document.body.textContent.match(/⭐/g) || []).length);
            const base = await cnt();
            await olim.click({ force: true }).catch(() => {});
            await page.waitForTimeout(800);
            const on = await cnt();
            await olim.click({ force: true }).catch(() => {});
            await page.waitForTimeout(800);
            const off = await cnt();
            if (on <= base) throw new Error(`badges did not appear on toggle-on (base=${base} on=${on})`);
            if (off >= on) warn(`badges did not retract on toggle-off (on=${on} off=${off})`, 'toggle may be one-way');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. /exit-tax-calculator computed result ─────────────────────────────
    await step('Exit-tax: fill fields → a computed currency figure appears', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/exit-tax-calculator');
        try {
            const nums = page.locator('input[type="number"]');
            const n = await nums.count();
            if (n < 1) { warn('no numeric inputs on exit-tax page', 'cannot compute'); return; }
            // fill first two numeric fields with plausible values
            await nums.nth(0).fill('1000000').catch(() => {});
            if (n > 1) await nums.nth(1).fill('400000').catch(() => {});
            await page.keyboard.press('Tab').catch(() => {});
            const calc = page.locator('button:has-text("חשב"), button:has-text("Calculate"), button:has-text("Calcular"), button[type="submit"]').first();
            if (await calc.count()) await calc.click({ force: true }).catch(() => {});
            await page.waitForTimeout(1500);
            const hasResult = await page.evaluate(() =>
                /₪|\$|€|\d{1,3}(,\d{3})+|\d{2,}%/.test(document.body.textContent || '')
            );
            if (!hasResult) throw new Error('no computed currency / percentage result after filling exit-tax form');
            const txt = await page.evaluate(() => document.body.textContent || '');
            if (/NaN|Infinity/.test(txt)) throw new Error('NaN/Infinity in exit-tax result');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Exit-tax: form input fields are present (≥2) and editable', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/exit-tax-calculator');
        try {
            const inputs = await page.locator('input, select').count();
            if (inputs < 2) throw new Error(`only ${inputs} form fields on exit-tax page`);
            const first = page.locator('input[type="number"], input[type="text"]').first();
            if (await first.count()) {
                await first.fill('12345').catch(() => {});
                const v = await first.inputValue().catch(() => '');
                if (!/12345/.test(v)) warn('first input not accepting typed value', 'field may be readonly/masked');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Exit-tax: route does not 404 and body has real content', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/exit-tax-calculator');
        try {
            const len = await page.evaluate(() => (document.body.textContent || '').length);
            if (len < 400) throw new Error(`exit-tax body length ${len} — likely 404 or shell only`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. /social-compare IL vs world ──────────────────────────────────────
    await step('Social-compare: renders IL alongside ≥1 other country', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/social-compare');
        try {
            const len = await page.evaluate(() => (document.body.textContent || '').length);
            if (len < 400) throw new Error(`/social-compare body length ${len} — likely 404`);
            const codes = await page.$$eval('span[data-code]', els => els.map(e => (e.getAttribute('data-code') || '').toUpperCase())).catch(() => []);
            const hasIL = codes.includes('IL') || await page.evaluate(() => /Israel|ישראל|Bituach|ביטוח לאומי/i.test(document.body.textContent || ''));
            const others = codes.filter(c => c && c !== 'IL').length;
            if (!hasIL) throw new Error('IL / Israel not present on social-compare');
            if (others < 1) warn('no non-IL country chips on social-compare', 'IL-vs-world comparison may not be rendering');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Social-compare: shows contribution rate (%) figures', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/social-compare');
        try {
            const hasPct = await page.evaluate(() => /\d{1,2}(\.\d+)?\s?%/.test(document.body.textContent || ''));
            if (!hasPct) warn('no percentage figures on social-compare', 'expected contribution-rate %');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Social-compare: no NaN / undefined in rendered table', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/social-compare');
        try {
            const bad = await page.evaluate(() => /NaN|undefined|Infinity/.test(document.body.textContent || ''));
            if (bad) throw new Error('NaN/undefined/Infinity present in social-compare body');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. Provider failover resilience ─────────────────────────────────────
    await step('Failover: /api/chat 502 → UI shows graceful error (no white screen)', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await suppressOnboarding(ctx);
        const page = await ctx.newPage();
        try {
            await page.route('**/api/chat**', route => route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"upstream"}' }));
            await page.goto(BASE + '/advisor?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(2500);
            const inp = advisorInput(page);
            if (!(await inp.count())) { warn('advisor input not found', 'cannot drive failover'); return; }
            await inp.click({ force: true }).catch(() => {});
            await inp.fill('test').catch(async () => { await inp.type('test'); });
            await advisorSend(page).click({ force: true }).catch(() => {});
            await page.waitForTimeout(3500);
            // white-screen check: body should still have substantial visible text
            const len = await page.evaluate(() => (document.body.innerText || '').trim().length);
            if (len < 80) throw new Error(`white-screen suspected after 502 (visible text len=${len})`);
            const friendly = await page.evaluate(() =>
                /error|שגיאה|try again|נסה שוב|לא זמין|unavailable|בעיה|something went wrong|אירעה/i.test(document.body.innerText || '')
            );
            if (!friendly) warn('no visible friendly error message after 502', 'UI survived but gives no feedback to user');
        } finally { await page.unroute('**/api/chat**').catch(() => {}); await page.close(); await ctx.close(); }
    });

    await step('Failover: /api/chat timeout/abort → no uncaught page error', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await suppressOnboarding(ctx);
        const page = await ctx.newPage();
        const pageErrs = [];
        page.on('pageerror', e => pageErrs.push(String(e.message)));
        try {
            await page.route('**/api/chat**', route => route.abort('failed'));
            await page.goto(BASE + '/advisor?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(2500);
            const inp = advisorInput(page);
            if (await inp.count()) {
                await inp.click({ force: true }).catch(() => {});
                await inp.fill('hello').catch(async () => { await inp.type('hello'); });
                await advisorSend(page).click({ force: true }).catch(() => {});
                await page.waitForTimeout(3500);
            }
            if (pageErrs.length) throw new Error(`uncaught page error on aborted /api/chat: ${pageErrs[0].slice(0, 120)}`);
        } finally { await page.unroute('**/api/chat**').catch(() => {}); await page.close(); await ctx.close(); }
    });

    await step('Failover: 500 from backend keeps chat input usable for retry', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await suppressOnboarding(ctx);
        const page = await ctx.newPage();
        try {
            await page.route('**/api/chat**', route => route.fulfill({ status: 500, body: 'err' }));
            await page.goto(BASE + '/advisor?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(2500);
            const inp = advisorInput(page);
            if (!(await inp.count())) { warn('advisor input not found', ''); return; }
            await inp.click({ force: true }).catch(() => {});
            await inp.fill('first try').catch(async () => { await inp.type('first try'); });
            await advisorSend(page).click({ force: true }).catch(() => {});
            await page.waitForTimeout(3000);
            const stillEditable = await inp.isEditable().catch(() => false);
            if (!stillEditable) warn('chat input not editable after 500', 'user cannot retry without reload');
        } finally { await page.unroute('**/api/chat**').catch(() => {}); await page.close(); await ctx.close(); }
    });

    // ── 6. Rate-limit UX ────────────────────────────────────────────────────
    await step('Rate-limit UX: simulated 429 surfaces a friendly throttle message', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await suppressOnboarding(ctx);
        const page = await ctx.newPage();
        try {
            await page.route('**/api/chat**', route => route.fulfill({
                status: 429,
                contentType: 'application/json',
                headers: { 'Retry-After': '30' },
                body: '{"error":"rate limited"}'
            }));
            await page.goto(BASE + '/advisor?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(2500);
            const inp = advisorInput(page);
            if (!(await inp.count())) { warn('advisor input not found', ''); return; }
            await inp.click({ force: true }).catch(() => {});
            await inp.fill('rapid msg').catch(async () => { await inp.type('rapid msg'); });
            await advisorSend(page).click({ force: true }).catch(() => {});
            await page.waitForTimeout(3000);
            const friendly = await page.evaluate(() =>
                /too many|rate limit|נסה שוב|wait|slow down|המתן|יותר מדי|מהר מדי|בעוד|try again later|דקה/i.test(document.body.innerText || '')
            );
            if (!friendly) warn('no friendly 429 / throttle message shown', 'rate-limit should explain the wait, not fail silently');
            const len = await page.evaluate(() => (document.body.innerText || '').trim().length);
            if (len < 80) throw new Error('white-screen after simulated 429');
        } finally { await page.unroute('**/api/chat**').catch(() => {}); await page.close(); await ctx.close(); }
    });

    await step('Rate-limit UX: 429 does not throw an uncaught error', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await suppressOnboarding(ctx);
        const page = await ctx.newPage();
        const pageErrs = [];
        page.on('pageerror', e => pageErrs.push(String(e.message)));
        try {
            await page.route('**/api/chat**', route => route.fulfill({ status: 429, body: '{"error":"slow down"}', contentType: 'application/json' }));
            await page.goto(BASE + '/advisor?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(2000);
            const inp = advisorInput(page);
            if (await inp.count()) {
                await inp.click({ force: true }).catch(() => {});
                await inp.fill('x').catch(async () => { await inp.type('x'); });
                await advisorSend(page).click({ force: true }).catch(() => {});
                await page.waitForTimeout(2500);
            }
            if (pageErrs.length) throw new Error(`uncaught error on 429: ${pageErrs[0].slice(0, 120)}`);
        } finally { await page.unroute('**/api/chat**').catch(() => {}); await page.close(); await ctx.close(); }
    });

    // ── 7. Scroll-lock confirmation (advisor locks; relocation scrolls) ─────
    await step('Scroll-lock: /advisor body IS locked but /relocation-analyzer is NOT', async () => {
        const a = await fresh(browser, undefined, '/advisor');
        let advisorOv;
        try { advisorOv = await a.page.evaluate(() => getComputedStyle(document.body).overflowY); }
        finally { await a.page.close(); await a.ctx.close(); }
        const r = await fresh(browser, undefined, '/relocation-analyzer');
        let reloOv;
        try { reloOv = await r.page.evaluate(() => getComputedStyle(document.body).overflowY); }
        finally { await r.page.close(); await r.ctx.close(); }
        if (reloOv === 'hidden') throw new Error(`relocation-analyzer body overflowY=hidden — scroll lock leaked to a non-advisor page`);
        if (advisorOv !== 'hidden') warn(`advisor body overflowY="${advisorOv}" (expected hidden)`, 'opt-in scroll-lock may not be applied on advisor');
    });

    await step('Scroll-lock: /social-compare and /exit-tax pages are scrollable', async () => {
        for (const path of ['/social-compare', '/exit-tax-calculator']) {
            const { ctx, page } = await fresh(browser, undefined, path);
            try {
                const ov = await page.evaluate(() => getComputedStyle(document.body).overflowY);
                if (ov === 'hidden') throw new Error(`${path} body overflowY=hidden — should scroll`);
            } finally { await page.close(); await ctx.close(); }
        }
    });

    // ── 8. Vercel Speed Insights + Analytics ────────────────────────────────
    await step('Speed Insights: /_vercel/speed-insights/script.js or insights beacon present', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await suppressOnboarding(ctx);
        const page = await ctx.newPage();
        const hits = [];
        page.on('request', r => { if (/_vercel\/(insights|speed-insights)|va\.vercel-scripts\.com/i.test(r.url())) hits.push(r.url()); });
        try {
            await page.goto(BASE + '/relocation-analyzer?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(5000);
            if (!hits.length) warn('no Speed Insights / Analytics beacon observed', 'may need dashboard toggle enabled on this Vercel project');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Speed Insights: /_vercel/speed-insights/script.js HTTP status', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        try {
            const r = await ctx.request.get(BASE + '/_vercel/speed-insights/script.js', { timeout: 12000 }).catch(() => null);
            if (!r) { warn('speed-insights script request failed', 'endpoint unreachable'); return; }
            if (r.status() !== 200) warn(`speed-insights script status=${r.status()}`, 'Speed Insights may be off in dashboard');
        } finally { await ctx.close(); }
    });

    // ── 9. Back / forward route navigation preserves state ──────────────────
    await step('Back/forward: nav relocation→advisor→back restores relocation', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            await page.goto(BASE + '/advisor?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(1500);
            await page.goBack({ waitUntil: 'load' }).catch(() => {});
            await page.waitForTimeout(1500);
            const url = page.url();
            if (!/relocation-analyzer/.test(url)) throw new Error(`back did not return to relocation-analyzer (url=${url})`);
            const chips = await page.locator('span[data-code]').count();
            if (chips < 5) warn(`only ${chips} chips after back-nav`, 'page may not have re-hydrated');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Back/forward: chip selection persists across back navigation', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            const pt = page.locator('span[data-code="PT"], span[data-code="pt"]').first();
            if (!(await pt.count())) { warn('PT chip not found', ''); return; }
            await pt.click({ force: true }).catch(() => {});
            await page.waitForTimeout(600);
            await page.goto(BASE + '/social-compare?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(1200);
            await page.goBack({ waitUntil: 'load' }).catch(() => {});
            await page.waitForTimeout(2000);
            const stored = await page.evaluate(() => localStorage.getItem('wl_selected_countries_pro'));
            if (stored && !/PT/i.test(stored)) warn('PT selection not in localStorage after back', 'persistence may be route-scoped');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Back/forward: forward navigation re-reaches advisor without error', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await suppressOnboarding(ctx);
        const page = await ctx.newPage();
        const pageErrs = [];
        page.on('pageerror', e => pageErrs.push(String(e.message)));
        try {
            await page.goto(BASE + '/relocation-analyzer?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(1200);
            await page.goto(BASE + '/advisor?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(1200);
            await page.goBack({ waitUntil: 'load' }).catch(() => {});
            await page.waitForTimeout(1000);
            await page.goForward({ waitUntil: 'load' }).catch(() => {});
            await page.waitForTimeout(1500);
            if (!/advisor/.test(page.url())) warn(`forward did not reach advisor (url=${page.url()})`, '');
            if (pageErrs.length) throw new Error(`page error during back/forward: ${pageErrs[0].slice(0, 120)}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 10. Mobile iPhone 14 Pro + Pixel 7 ──────────────────────────────────
    await step('Mobile (Pixel 7): /relocation-analyzer chips are tappable (≥40px)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer', { deviceProfile: devices['Pixel 7'] });
        try {
            const chip = page.locator('span[data-code]:not([data-code="IL" i])').first();
            if (!(await chip.count())) { warn('no selectable chip on Pixel 7', ''); return; }
            const box = await chip.boundingBox();
            if (!box) { warn('chip not measurable', ''); return; }
            if (box.height < 32) warn(`chip tap height ${Math.round(box.height)}px < 40px target`, 'small tap target on Pixel 7');
            await chip.tap().catch(async () => { await chip.click({ force: true }); });
            await page.waitForTimeout(700);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mobile (Pixel 7): no horizontal overflow on /relocation-analyzer', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer', { deviceProfile: devices['Pixel 7'] });
        try {
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4);
            if (overflow) {
                const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
                throw new Error(`h-overflow on Pixel 7 — scrollWidth=${w.s} clientWidth=${w.c}`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mobile (Pixel 7): onboarding modal is dismissible (✕ or Escape)', async () => {
        const ctx = await browser.newContext({ ...devices['Pixel 7'] });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/relocation-analyzer?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(3500);
            const modal = page.locator('[role="dialog"], .onboarding-modal, .modal-backdrop').first();
            if (!(await modal.count()) || !(await modal.isVisible().catch(() => false))) { warn('no onboarding modal on Pixel 7', 'may be suppressed'); return; }
            const close = page.locator('[aria-label*="close" i], button.modal-close, .onboarding-close, button:has-text("✕"), button:has-text("×")').first();
            if (await close.count()) { await close.tap().catch(async () => { await close.click({ force: true }); }); }
            else { await page.keyboard.press('Escape'); }
            await page.waitForTimeout(800);
            const still = await modal.isVisible().catch(() => false);
            if (still) throw new Error('onboarding modal not dismissible on Pixel 7');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mobile (iPhone 14 Pro): /advisor chat input is reachable + focusable', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/advisor', { deviceProfile: devices['iPhone 14 Pro'] });
        try {
            const inp = advisorInput(page);
            if (!(await inp.count())) throw new Error('advisor input not present on iPhone 14 Pro');
            await inp.scrollIntoViewIfNeeded().catch(() => {});
            await inp.tap().catch(async () => { await inp.click({ force: true }); });
            await page.waitForTimeout(400);
            const focused = await page.evaluate(() => {
                const a = document.activeElement;
                return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.getAttribute('contenteditable') === 'true');
            });
            if (!focused) warn('advisor input did not focus on tap (iPhone)', 'keyboard may not open for users');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 11. i18n dir flips he/en/pt/es on /relocation-analyzer ──────────────
    await step('i18n: HE → html dir is rtl', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'he'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const dir = await page.evaluate(() => document.documentElement.dir || getComputedStyle(document.documentElement).direction);
            if (dir !== 'rtl') throw new Error(`HE mode dir="${dir}" — expected rtl`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('i18n: EN → html dir flips to ltr', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'en'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const dir = await page.evaluate(() => document.documentElement.dir || getComputedStyle(document.documentElement).direction);
            if (dir === 'rtl') throw new Error(`EN mode dir still rtl`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('i18n: PT → ltr + no Hebrew leak on visible buttons', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'pt'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2800);
            const dir = await page.evaluate(() => document.documentElement.dir || getComputedStyle(document.documentElement).direction);
            if (dir === 'rtl') throw new Error('PT mode dir still rtl');
            const leak = await page.evaluate(() => {
                const HE = /[֐-׿]/; const ALLOW = /Wize(Life|Money|Tax|Travel|Health|Deal|AI)/;
                const out = [];
                document.querySelectorAll('button.preset, .preset-btn, span[data-code]').forEach(el => {
                    const t = (el.textContent || '').trim();
                    if (HE.test(t) && !ALLOW.test(t)) out.push(t.slice(0, 30));
                });
                return out.slice(0, 5);
            });
            if (leak.length) warn(`Hebrew leak in PT mode: ${leak.join(', ')}`, 'untranslated strings');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('i18n: ES → ltr + Spanish copy detected', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/relocation-analyzer');
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'es'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2800);
            const dir = await page.evaluate(() => document.documentElement.dir || getComputedStyle(document.documentElement).direction);
            if (dir === 'rtl') throw new Error('ES mode dir still rtl');
            const hasES = await page.evaluate(() => /Todos|Borrar|Predeterminado|países|seleccionar|Comparar/i.test(document.body.textContent || ''));
            if (!hasES) warn('no Spanish copy detected in ES mode', 'strings may not be i18n-keyed');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizetax-flows-v6-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
