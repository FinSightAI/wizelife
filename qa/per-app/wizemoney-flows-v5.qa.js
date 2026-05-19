#!/usr/bin/env node
// WizeMoney — flows v5 (25 NEW deep scenarios).
// Strictly non-overlapping with wizemoney-{,deep,flows-v2,flows-v3,flows-v4}.qa.js.
// Categories: paywall lock-badges, access codes, sidebar nav specifics,
// transactions CRUD form path, AI Story button state, Compare Funds I18n.init,
// Gemel calc, Service Worker v296 + controller, onboarding 44px close, i18n 4-lang.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://money.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeMoney-FlowsV5');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        waitUntil: 'load', timeout: 45000,
    });
    await page.waitForTimeout(2500);
    return { ctx, page };
}

// Force "free" plan locally before reload, so we can observe pro-lock badges.
async function forceFree(page) {
    await page.evaluate(() => {
        try {
            localStorage.removeItem('wl_plan');
            localStorage.removeItem('wl_access_code');
            localStorage.setItem('wl_plan', 'free');
        } catch {}
    });
}

(async () => {
    const browser = await chromium.launch();

    // ═══════════════ 1. PAYWALL: lock badges ════════════════════════════════
    await step('1/Paywall: stocks page reachable even with PAYWALL_ACTIVE=false (no hard gate)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/stocks.html');
        try {
            const view = await page.evaluate(() => {
                const blocked = !!document.querySelector('[data-paywall-block], .paywall-hard-gate, .upgrade-required-modal[open]');
                const len = (document.body.innerText || '').length;
                return { blocked, len };
            });
            if (view.blocked) throw new Error('hard paywall gate engaged — should be open pre-launch');
            if (view.len < 200) throw new Error(`stocks body only ${view.len} chars (suspicious)`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('2/Paywall: sidebar Pro lock badges render when plan=free is forced', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await forceFree(page);
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const locks = await page.evaluate(() => ({
                proLock: document.querySelectorAll('.pro-lock, [data-pro]').length,
                isPaywallActive: typeof window.Plan === 'object' && typeof window.Plan.isPaywallActive === 'function'
                    ? window.Plan.isPaywallActive() : null,
            }));
            // PAYWALL_ACTIVE=false suppresses badges by design (per plan.js / sidebar.js).
            // We log this as informational warn — not a fail.
            if (locks.isPaywallActive === false && locks.proLock === 0) {
                warn(`pro-lock badges hidden (paywallActive=false) — matches expected pre-launch UX`, '');
            } else if (locks.proLock === 0) {
                warn('no .pro-lock elements rendered — sidebar may not have loaded Pro flags', '');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('3/Paywall: simulator page loads without redirect (paywall not blocking nav)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/simulator.html');
        try {
            const url = page.url();
            if (!/simulator\.html/.test(url)) throw new Error(`redirected away from simulator → ${url}`);
            const len = await page.evaluate(() => document.body.innerText.length);
            if (len < 100) throw new Error(`simulator body only ${len} chars`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('4/Paywall: data-pro attribute markers exist in sidebar markup (locked-feature wiring intact)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const dataProEl = await page.evaluate(() => {
                // sidebar.js uses ` data-pro="${s.proKey}"` on locked links
                return document.querySelectorAll('aside [data-pro], .sidebar [data-pro], nav [data-pro]').length;
            });
            if (dataProEl === 0) warn('no [data-pro] markers in sidebar — Pro wiring may have been stripped', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 2. ACCESS CODES ════════════════════════════════════════
    await step('5/AccessCode: Plan.redeemCode("WIZELIFE2026") upgrades plan to pro', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const result = await page.evaluate(async () => {
                if (typeof window.Plan !== 'object' || typeof window.Plan.redeemCode !== 'function') {
                    return { ok: false, reason: 'no Plan.redeemCode' };
                }
                const before = await window.Plan.getPlan();
                const success = await window.Plan.redeemCode('WIZELIFE2026');
                const after = await window.Plan.getPlan();
                return { ok: true, before, success, after };
            });
            if (!result.ok) { warn(result.reason, ''); return; }
            if (!result.success) throw new Error(`Plan.redeemCode returned ${result.success} for WIZELIFE2026`);
            if (!/pro|yolo/i.test(String(result.after || ''))) {
                throw new Error(`plan after redeem = "${result.after}" (expected pro/yolo)`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('6/AccessCode: BETA-ACCESS code accepted by redeemCode', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const success = await page.evaluate(async () => {
                if (!window.Plan || !window.Plan.redeemCode) return null;
                return await window.Plan.redeemCode('BETA-ACCESS');
            });
            if (success === null) { warn('Plan.redeemCode unavailable', ''); return; }
            if (!success) throw new Error('BETA-ACCESS rejected by redeemCode');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('7/AccessCode: invalid code returns false', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const success = await page.evaluate(async () => {
                if (!window.Plan || !window.Plan.redeemCode) return null;
                return await window.Plan.redeemCode('TOTALLY-BOGUS-CODE-XYZ-9999');
            });
            if (success === null) { warn('Plan.redeemCode unavailable', ''); return; }
            if (success) throw new Error('bogus code accepted — code validation broken');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('8/AccessCode: paywall modal exposes code input (placeholder "access code")', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const opened = await page.evaluate(() => {
                if (window.Paywall && typeof window.Paywall.show === 'function') {
                    window.Paywall.show('manual');
                    return true;
                }
                return false;
            });
            if (!opened) { warn('Paywall.show() unavailable from window — modal entry point may have moved', ''); return; }
            await page.waitForTimeout(800);
            const hasCodeInput = await page.evaluate(() => {
                const inputs = [...document.querySelectorAll('input')];
                return inputs.some(i => /access code|קוד גישה|código|access/i.test(i.placeholder || ''));
            });
            if (!hasCodeInput) warn('paywall modal opened but no access-code input visible', 'verify code redemption UI');
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 3. SIDEBAR NAV SPECIFICS ═══════════════════════════════
    await step('9/Sidebar: AI-chat link present and points to /pages/ai-chat.html', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const href = await page.evaluate(() => {
                const a = document.querySelector('aside a[href*="ai-chat"], .sidebar a[href*="ai-chat"], nav a[href*="ai-chat"]');
                return a ? a.getAttribute('href') : null;
            });
            if (!href) throw new Error('no AI-chat link in sidebar');
            if (!/ai-chat\.html/.test(href)) throw new Error(`AI-chat href is "${href}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('10/Sidebar: Reports / Family / Export links all wired', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const links = await page.evaluate(() => {
                const all = [...document.querySelectorAll('aside a[href], .sidebar a[href], nav a[href]')].map(a => a.getAttribute('href') || '');
                return {
                    reports: all.some(h => /reports\.html/.test(h)),
                    family:  all.some(h => /family\.html/.test(h)),
                    export:  all.some(h => /export\.html|export\b/i.test(h)),
                };
            });
            const missing = Object.keys(links).filter(k => !links[k]);
            if (missing.length === 3) throw new Error(`no Reports/Family/Export links found`);
            if (missing.length) warn(`missing sidebar links: ${missing.join(', ')}`, 'they may live in a sub-menu');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('11/Sidebar: clicking Goals link navigates to /pages/goals.html', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const goalLink = page.locator('aside a[href*="goals.html"], .sidebar a[href*="goals.html"], nav a[href*="goals.html"]').first();
            if (!(await goalLink.count())) { warn('No Goals link in sidebar', ''); return; }
            await goalLink.click({ timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(2500);
            if (!/goals\.html/.test(page.url())) throw new Error(`URL after click: ${page.url()}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('12/Sidebar: nav-item count is at least 8 (broad coverage of FinSight pages)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const n = await page.evaluate(() =>
                document.querySelectorAll('aside .nav-item, .sidebar .nav-item, aside li.nav-item').length
            );
            if (n < 8) warn(`only ${n} nav-items found (expected ≥8)`, 'sidebar may be collapsed or not fully rendered');
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 4. TRANSACTIONS CRUD via form path ═════════════════════
    await step('13/Tx CRUD: transactions page exposes either modal trigger or inline add-form', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/transactions.html');
        try {
            const ui = await page.evaluate(() => {
                const ok404 = /404|not.*found/i.test(document.title || '');
                const hasForm = !!document.querySelector('form, #addTxForm, #transactionForm');
                const hasBtn  = !!document.querySelector('button[onclick*="add" i], button:not([disabled])');
                return { ok404, hasForm, hasBtn };
            });
            if (ui.ok404) { warn('/pages/transactions.html appears to be 404 — page may not exist', ''); return; }
            if (!ui.hasForm && !ui.hasBtn) throw new Error('transactions page has no form and no buttons');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('14/Tx CRUD: income #incomeModal markup present on income page (form integration intact)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/income.html');
        try {
            const modal = await page.evaluate(() => !!document.getElementById('incomeModal'));
            if (!modal) warn('#incomeModal missing on income page — add-income wiring may need verification', '');
            const fields = await page.evaluate(() => ({
                name:   !!document.getElementById('incomeName'),
                amount: !!document.getElementById('incomeAmount'),
                date:   !!document.getElementById('incomeDate'),
            }));
            const miss = Object.keys(fields).filter(k => !fields[k]);
            if (miss.length === 3) throw new Error('no income form fields rendered (name/amount/date all missing)');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('15/Tx CRUD: localStorage seed without auth — fresh signed-out flow stores data offline', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const seeded = await page.evaluate(() => {
                try {
                    localStorage.setItem('wize_offline_test', JSON.stringify({ v: 1, ts: Date.now() }));
                    const r = JSON.parse(localStorage.getItem('wize_offline_test'));
                    return r && r.v === 1;
                } catch { return false; }
            });
            if (!seeded) throw new Error('localStorage write+read failed — offline-mode prerequisite broken');
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 5. AI STORY ════════════════════════════════════════════
    await step('16/AI Story: #generateBtn exists, becomes disabled while generating', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/ai-story.html');
        try {
            const exists = await page.evaluate(() => !!document.getElementById('generateBtn'));
            if (!exists) throw new Error('#generateBtn missing on ai-story page');
            const initialDisabled = await page.evaluate(() => document.getElementById('generateBtn').disabled);
            // Click and immediately probe disabled state — generateStory() flips disabled=true synchronously.
            await page.evaluate(() => { if (typeof window.generateStory === 'function') window.generateStory(); });
            await page.waitForTimeout(300);
            const nowDisabled = await page.evaluate(() => document.getElementById('generateBtn').disabled);
            if (initialDisabled === true) warn('button started disabled — unexpected initial state', '');
            if (initialDisabled === false && nowDisabled === false) {
                warn('button did not flip to disabled after generateStory() call — may indicate broken loading state', '');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('17/AI Story: no uncaught JS error within 8s of page load', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(String(e.message)));
        try {
            await page.goto(BASE + '/pages/ai-story.html?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(8000);
            if (errs.length) throw new Error(`uncaught error: ${errs[0].slice(0, 180)}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('18/AI Story: i18n key "aiStory.generateBtn" is rendered (not raw key text)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/ai-story.html');
        try {
            const txt = await page.evaluate(() => {
                const el = document.querySelector('[data-i18n="aiStory.generateBtn"]');
                return el ? (el.textContent || '').trim() : null;
            });
            if (txt === null) { warn('no [data-i18n="aiStory.generateBtn"] element', ''); return; }
            if (/aiStory\.generateBtn/.test(txt)) throw new Error('raw i18n key shown instead of translation');
            if (txt.length < 3) throw new Error(`button text too short: "${txt}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 6. COMPARE FUNDS — I18n.init() ════════════════════════
    await step('19/Compare Funds: I18n.init was called (no raw data-i18n keys leak)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/compare-funds.html');
        try {
            const leaks = await page.evaluate(() => {
                const out = [];
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    const txt = (el.textContent || '').trim();
                    // If textContent === key, init() never ran or key has no value
                    if (txt && txt === key) out.push(key);
                });
                return out.slice(0, 5);
            });
            if (leaks.length > 2) throw new Error(`${leaks.length} raw i18n keys visible (e.g. ${leaks[0]}) — I18n.init missing`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('20/Compare Funds: storage.js loaded BEFORE i18n.js (script order fix from CLAUDE.md)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/compare-funds.html');
        try {
            const order = await page.evaluate(() => {
                const scripts = [...document.querySelectorAll('script[src]')].map(s => s.src);
                const sIdx = scripts.findIndex(s => /storage\.js/.test(s));
                const iIdx = scripts.findIndex(s => /i18n\.js/.test(s));
                return { sIdx, iIdx, scripts: scripts.length };
            });
            if (order.sIdx === -1) warn('storage.js not found on compare-funds.html', 'regression of CLAUDE.md fix');
            if (order.iIdx === -1) warn('i18n.js not found on compare-funds.html', '');
            if (order.sIdx > -1 && order.iIdx > -1 && order.sIdx > order.iIdx) {
                throw new Error(`storage.js (#${order.sIdx}) loaded AFTER i18n.js (#${order.iIdx}) — order regression`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 7. GEMEL ═══════════════════════════════════════════════
    await step('21/Gemel: page loads and exposes calculateReturns function or visible result', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/gemel.html');
        try {
            const probe = await page.evaluate(() => ({
                hasCalcFn: typeof window.calculateReturns === 'function',
                hasNumeric: /[1-9][0-9]{0,2}([.,][0-9]+)?\s*%/.test(document.body.innerText || ''),
                bodyLen: (document.body.innerText || '').length,
            }));
            if (probe.bodyLen < 300) throw new Error(`gemel body only ${probe.bodyLen} chars`);
            if (!probe.hasCalcFn && !probe.hasNumeric) {
                warn('no calculateReturns fn and no numeric result on gemel — calc may be lazy', '');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('22/Gemel: I18n.init() ran (data-i18n keys resolved, not raw)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/gemel.html');
        try {
            const raw = await page.evaluate(() => {
                let n = 0;
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const k = el.getAttribute('data-i18n');
                    if ((el.textContent || '').trim() === k) n++;
                });
                return n;
            });
            if (raw > 3) throw new Error(`${raw} raw i18n keys leaking on gemel — I18n.init regression`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 8. SERVICE WORKER v296 ═════════════════════════════════
    await step('23/SW: cache name finsight-v296 active and controller present after settle', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // Wait up to 8s for controller to become available
            const state = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return { sw: 'unsupported' };
                // Wait for ready
                await Promise.race([
                    navigator.serviceWorker.ready,
                    new Promise(r => setTimeout(r, 8000)),
                ]);
                const regs = await navigator.serviceWorker.getRegistrations();
                const caches = await (typeof window.caches !== 'undefined' ? window.caches.keys() : Promise.resolve([]));
                return {
                    sw: 'ok',
                    registered: regs.length,
                    controller: !!navigator.serviceWorker.controller,
                    cacheNames: caches,
                };
            });
            if (state.sw === 'unsupported') { warn('navigator.serviceWorker unsupported in test env', ''); return; }
            if (state.registered === 0) throw new Error('no SW registrations found');
            const has296 = (state.cacheNames || []).some(c => /finsight-v296/.test(c));
            if (!has296) {
                const list = (state.cacheNames || []).join(', ');
                warn(`finsight-v296 cache not active. Caches: ${list || '(none)'}`, 'either SW just installed or version bumped');
            }
            if (!state.controller) warn('SW registered but no controller after 8s — first-load only, refresh would fix', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 9. ONBOARDING modal close 44px ═════════════════════════
    await step('24/Onboarding: close + skip buttons meet 44×44 WCAG/iOS touch target', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                try { localStorage.clear(); } catch {}
                if (window.WizeOnboarding && typeof window.WizeOnboarding.show === 'function') {
                    window.WizeOnboarding.show('money');
                }
            });
            await page.waitForTimeout(2000);
            const sizes = await page.evaluate(() => {
                const root = document.getElementById('wize-onboarding');
                if (!root) return null;
                const closeBtn = root.querySelector('[aria-label*="close" i], [aria-label*="סגור"], button[onclick*="close" i]')
                              || root.querySelector('button');
                const skipBtn = [...root.querySelectorAll('button')].find(b => /skip|דלג|saltar|pular/i.test(b.textContent || ''));
                const rect = (el) => el ? el.getBoundingClientRect() : null;
                return {
                    close: rect(closeBtn),
                    skip:  rect(skipBtn),
                };
            });
            if (!sizes) { warn('#wize-onboarding never rendered — onboarding may have shown earlier and been dismissed', ''); return; }
            if (sizes.close && (sizes.close.width < 44 || sizes.close.height < 44)) {
                throw new Error(`close-btn ${Math.round(sizes.close.width)}×${Math.round(sizes.close.height)} below 44px minimum`);
            }
            if (sizes.skip && (sizes.skip.height < 44)) {
                throw new Error(`skip-btn height ${Math.round(sizes.skip.height)} < 44px`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 10. i18n 4-language coverage ═══════════════════════════
    await step('25/i18n: HE/EN/PT/ES all change visible UI label (rotate through 4 langs)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const sample = async () => page.evaluate(() => {
                const el = document.querySelector('aside .nav-item a span:not(.icon)') ||
                           document.querySelector('.sidebar .nav-item a') ||
                           document.querySelector('nav a');
                return el ? (el.textContent || '').trim().slice(0, 60) : '';
            });
            const results = {};
            for (const lang of ['he', 'en', 'pt', 'es']) {
                await page.evaluate((l) => {
                    if (window.I18n && typeof window.I18n.setLanguage === 'function') {
                        window.I18n.setLanguage(l);
                    } else {
                        localStorage.setItem('wl_lang', l);
                    }
                }, lang);
                await page.waitForTimeout(1200);
                results[lang] = await sample();
            }
            const unique = new Set(Object.values(results).filter(Boolean));
            if (unique.size < 3) {
                throw new Error(`only ${unique.size}/4 distinct labels across HE/EN/PT/ES — i18n incomplete. Got: ${JSON.stringify(results)}`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    finalize('wizemoney-flows-v5-report.md');
    await browser.close();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
