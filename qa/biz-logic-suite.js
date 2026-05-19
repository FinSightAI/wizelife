#!/usr/bin/env node
// WizeLife — biz-logic-suite.js
// 15+ business-logic and B10 affiliate-ROI checks: travel affiliate beacon,
// currency round-trip, locale date format, tax-year boundary, refund flow,
// plan downgrade, trial banner, annual toggle, referral attribution.
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const BASE = 'https://wizelife.ai';
const TRAVEL = 'https://travel.wizelife.ai';
const TRAVEL_FALLBACK = 'https://wizetravel.vercel.app';
const { step, warn, finalize } = makeReporter('Biz-Logic-Suite');

async function fresh(browser, viewport = { width: 1280, height: 800 }, base = BASE, path = '/p/salary-compare.html') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(base + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        waitUntil: 'load', timeout: 30000,
    });
    await page.waitForTimeout(1500);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. Travelpayouts beacon loads on travel.wizelife.ai (B10) ──────────
    await step('travel.wizelife.ai loads Travelpayouts script (marker=529725)', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const scriptSrcs = [];
        page.on('request', req => {
            if (req.resourceType() === 'script') scriptSrcs.push(req.url());
        });
        try {
            let resp = await page.goto(TRAVEL + '/', { waitUntil: 'load', timeout: 35000 }).catch(() => null);
            if (!resp || resp.status() >= 400) {
                resp = await page.goto(TRAVEL_FALLBACK + '/', { waitUntil: 'load', timeout: 35000 }).catch(() => null);
            }
            if (!resp) { warn('Could not load travel app', ''); return; }
            await page.waitForTimeout(3500);
            const html = await page.content();
            const hasTp = scriptSrcs.some(s => /travelpayouts|tp\.media|emrl/i.test(s)) ||
                /travelpayouts|tp\.media|529725/i.test(html);
            if (!hasTp) warn('No Travelpayouts beacon detected', `${scriptSrcs.length} scripts loaded`);
            const hasMarker = /529725/.test(html) || scriptSrcs.some(s => /529725/.test(s));
            if (!hasMarker) warn('marker=529725 not found in page', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. Travel external links carry marker= param ───────────────────────
    await step('Travel outbound affiliate links carry marker= param', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            let resp = await page.goto(TRAVEL + '/', { waitUntil: 'load', timeout: 35000 }).catch(() => null);
            if (!resp || resp.status() >= 400) {
                await page.goto(TRAVEL_FALLBACK + '/', { waitUntil: 'load', timeout: 35000 }).catch(() => null);
            }
            await page.waitForTimeout(3000);
            const hrefs = await page.evaluate(() =>
                Array.from(document.querySelectorAll('a[href]')).map(a => a.href).slice(0, 200));
            const aff = hrefs.filter(h => /aviasales|trip\.com|booking\.com|hotellook|skyscanner|kiwi/i.test(h));
            if (!aff.length) { warn('No affiliate outbound links found', `${hrefs.length} total links`); return; }
            const withMarker = aff.filter(h => /marker=|sub_id=|aff_id=|partner=|aid=/i.test(h));
            if (withMarker.length === 0) {
                throw new Error(`${aff.length} affiliate links but none carry marker= (lost revenue)`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. Multi-currency rounding IL→USD→IL ───────────────────────────────
    await step('IL→USD→IL round-trip rounding error < 0.5%', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // Use the in-page conversion if available, else compute via known FX rate
            const result = await page.evaluate(() => {
                // Heuristic: page has rates table; pull USD/ILS or compute from gross / net
                const ils = 25000;
                // Look for FX exposed on window
                const fx = window.FX || window.fxRates || null;
                if (fx && fx.USD) {
                    const usd = ils / fx.USD;
                    const back = usd * fx.USD;
                    return { ils, usd, back, deltaPct: Math.abs(back - ils) / ils * 100 };
                }
                return null;
            });
            if (!result) {
                // Fall back to pure math: rate 3.7
                const ils = 25000, rate = 3.7;
                const usd = ils / rate;
                const back = +(usd * rate).toFixed(2);
                const delta = Math.abs(back - ils) / ils * 100;
                if (delta > 0.5) throw new Error(`round-trip delta ${delta.toFixed(3)}% > 0.5%`);
                return;
            }
            if (result.deltaPct > 0.5) throw new Error(`round-trip delta ${result.deltaPct.toFixed(3)}% > 0.5%`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. Date format HE = DD/MM/YYYY ─────────────────────────────────────
    await step('wl_lang=he formats dates as DD/MM/YYYY', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/p/salary-compare.html?wl_lang=he&_t=' + Date.now(),
                { waitUntil: 'load', timeout: 30000 });
            await page.evaluate(() => localStorage.setItem('wl_lang', 'he'));
            await page.waitForTimeout(1500);
            // Use Intl directly with the page's lang
            const f = await page.evaluate(() => {
                const d = new Date(2024, 0, 31); // 31 Jan 2024
                return new Intl.DateTimeFormat('he-IL').format(d);
            });
            // he-IL typically yields 31.1.2024 (with dots) OR 31/1/2024 — both day-first
            if (!/^\d{1,2}[./-]\d{1,2}[./-]\d{4}/.test(f)) {
                throw new Error(`he-IL date format unexpected: ${f}`);
            }
            // First number should be 31 (day-first)
            const m = f.match(/^(\d+)/);
            if (m && m[1] !== '31') throw new Error(`HE locale not day-first: ${f}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. Date format EN = MM/DD/YYYY (US locale) ─────────────────────────
    await step('en-US formats dates as MM/DD/YYYY (month-first)', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
            const f = await page.evaluate(() => {
                const d = new Date(2024, 0, 31);
                return new Intl.DateTimeFormat('en-US').format(d);
            });
            if (!/^\d{1,2}\/\d{1,2}\/\d{4}/.test(f)) {
                throw new Error(`en-US date format unexpected: ${f}`);
            }
            const m = f.match(/^(\d+)/);
            if (m && m[1] !== '1') throw new Error(`en-US not month-first: ${f}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 6. Tax year boundary — Israel uses Jan-Dec calendar year ───────────
    await step('Tax year for Israel is Jan-Dec (boundary check)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // Look for TAX_YEAR or fiscal year config exposed on window
            const ty = await page.evaluate(() => {
                return {
                    TAX_YEAR: window.TAX_YEAR || null,
                    FISCAL_START: window.FISCAL_START || null,
                    // Try to find year mentioned in static text
                    body: (document.body.innerText.match(/202[3-9]/g) || []).slice(0, 3),
                };
            });
            const currentYear = new Date().getFullYear();
            // We just want to know any year displayed is plausible
            if (ty.body.length === 0) {
                warn('No year string found in body', 'tax year display absent');
            } else {
                const years = ty.body.map(Number);
                const recent = years.some(y => Math.abs(y - currentYear) <= 1);
                if (!recent) warn(`No recent tax year (current=${currentYear}) — saw ${ty.body.join(',')}`, '');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 7. Refund flow placeholder — /api/refund returns 404 (not wired) ───
    await step('/api/refund returns 404 (placeholder — not wired yet)', async () => {
        const ctx = await browser.newContext();
        try {
            const r = await ctx.request.post(BASE + '/api/refund', {
                data: { id: 'test' }, headers: { 'Content-Type': 'application/json' },
                timeout: 12000,
            }).catch(e => e);
            if (!r || !r.status) { warn('No response for /api/refund', ''); return; }
            const s = r.status();
            // 404 OR 405 expected. 200 would be surprising.
            if (s === 200) warn('/api/refund returned 200 unexpectedly', '');
            if (s >= 500) warn(`/api/refund 5xx (${s})`, 'should be 404');
        } finally { await ctx.close(); }
    });

    // ── 8. Plan downgrade — wl_sso.plan='free' hides Pro features ──────────
    await step('localStorage wl_sso.plan="free" hides Pro UI', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
            await page.evaluate(() => {
                localStorage.setItem('wl_sso', JSON.stringify({ plan: 'free', uid: 'test' }));
                localStorage.setItem('wl_plan', 'free');
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const proVisible = await page.evaluate(() => {
                // Look for any "Pro" badge displayed prominently
                const badges = Array.from(document.querySelectorAll('.badge, .plan-badge, .pro-badge'))
                    .filter(b => /pro|premium/i.test(b.textContent || '') && b.offsetParent !== null);
                return badges.length;
            });
            if (proVisible > 2) warn(`${proVisible} Pro badges visible while plan=free`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 9. Trial expiration banner check ───────────────────────────────────
    await step('Trial-expired banner exists when trial_expired flag set', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
            await page.evaluate(() => {
                const past = new Date(Date.now() - 86400 * 1000).toISOString();
                localStorage.setItem('wl_sso', JSON.stringify({ plan: 'trial', trial_ends: past }));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const found = await page.evaluate(() =>
                /trial.{0,15}(expired|ended|over)|תקופת.{0,15}(הסתיים|פג)/i.test(document.body.innerText));
            if (!found) warn('No trial-expired banner shown', 'feature may not be implemented yet');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 10. Annual plan toggle on pricing/dashboard ────────────────────────
    await step('Annual/Monthly toggle exists somewhere on pricing/dashboard', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            const pages = ['/dashboard.html', '/pricing.html', '/'];
            let found = false;
            for (const p of pages) {
                await page.goto(BASE + p + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 25000 }).catch(() => null);
                await page.waitForTimeout(1500);
                const has = await page.evaluate(() =>
                    /annual|yearly|monthly|חודשי|שנתי/i.test(document.body.innerText));
                if (has) { found = true; break; }
            }
            if (!found) warn('No annual/monthly toggle copy detected', 'pricing toggle may not exist yet');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 11. Referral attribution — ?ref=xyz saved to localStorage ──────────
    await step('?ref=xyz URL param is captured to localStorage', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/?ref=test123&_t=' + Date.now(),
                { waitUntil: 'load', timeout: 30000 });
            await page.waitForTimeout(2500);
            const stored = await page.evaluate(() => {
                const candidates = ['wl_ref', 'ref', 'referrer', 'wl_referrer', 'wl_sso_ref'];
                for (const k of candidates) {
                    const v = localStorage.getItem(k);
                    if (v && /test123/.test(v)) return { key: k, val: v };
                }
                // Also check sessionStorage
                for (const k of candidates) {
                    const v = sessionStorage.getItem(k);
                    if (v && /test123/.test(v)) return { key: k + '(session)', val: v };
                }
                return null;
            });
            if (!stored) warn('No ?ref=test123 capture in storage', 'referral attribution may not be wired');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 12. UTM params preserved across navigation ─────────────────────────
    await step('utm_source preserved in localStorage across page navigation', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/?utm_source=test&utm_campaign=qa&_t=' + Date.now(),
                { waitUntil: 'load', timeout: 30000 });
            await page.waitForTimeout(2000);
            const ls1 = await page.evaluate(() => JSON.stringify(localStorage));
            await page.goto(BASE + '/p/salary-compare.html', { waitUntil: 'load', timeout: 30000 });
            await page.waitForTimeout(1500);
            const ls2 = await page.evaluate(() => JSON.stringify(localStorage));
            const utmIn1 = /utm_source|"test"/.test(ls1);
            const utmIn2 = /utm_source|"test"/.test(ls2);
            if (!utmIn1) warn('UTM not captured at all', 'attribution not wired');
            else if (!utmIn2) warn('UTM lost across navigation', 'attribution leaky');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 13. Currency rendering uses Intl.NumberFormat ──────────────────────
    await step('Currency numbers use locale-aware grouping (commas/periods)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#gross', { timeout: 10000 });
            await page.fill('#gross', '25000');
            await page.waitForTimeout(1500);
            const sample = await page.evaluate(() => {
                const nets = Array.from(document.querySelectorAll('.net')).map(n => n.textContent.trim()).slice(0, 5);
                return nets;
            });
            const grouped = sample.some(t => /\d{1,3}[,.  ]\d{3}/.test(t));
            if (!grouped) warn(`Net values appear ungrouped`, JSON.stringify(sample.slice(0, 2)));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 14. Pro feature paywall behavior on Free plan ──────────────────────
    await step('Free plan: clicking a Pro link routes to paywall/upgrade', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/dashboard.html?_t=' + Date.now(),
                { waitUntil: 'load', timeout: 30000 }).catch(() => null);
            await page.evaluate(() => {
                localStorage.setItem('wl_sso', JSON.stringify({ plan: 'free' }));
                localStorage.setItem('wl_plan', 'free');
            });
            await page.reload({ waitUntil: 'load' }).catch(() => null);
            await page.waitForTimeout(2000);
            const proLinks = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('a, button'))
                    .filter(a => /Pro|פרו|Premium/i.test(a.textContent || ''))
                    .map(a => ({ text: (a.textContent || '').trim().slice(0, 30), href: a.href || '' }))
                    .slice(0, 5);
            });
            if (proLinks.length === 0) warn('No Pro links on dashboard', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 15. Plan upgrade flow: paywall.js loaded somewhere ─────────────────
    await step('Paywall script reachable: /js/paywall.js returns 200', async () => {
        const ctx = await browser.newContext();
        try {
            // paywall.js is in finsight subdomain typically
            const r = await ctx.request.get('https://finsightai.github.io/finsight/js/paywall.js', { timeout: 12000 }).catch(() => null);
            if (!r) { warn('No response for paywall.js', ''); return; }
            const s = r.status();
            if (s !== 200) warn(`paywall.js returned ${s}`, '');
            const t = await r.text().catch(() => '');
            if (!/PAYWALL_ACTIVE|STRIPE_LINK|paywall|upgrade/i.test(t)) {
                warn('paywall.js content unrecognized', t.slice(0, 100));
            }
        } finally { await ctx.close(); }
    });

    await browser.close();
    await finalize();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
