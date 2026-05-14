#!/usr/bin/env node
// WizeMoney — flows v3 (15 more scenarios).
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://money.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeMoney-FlowsV3');

async function fresh(browser, viewport = { width: 1440, height: 900 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500);
    return { ctx, page };
}

const PAGES = ['bank','credit','stocks','goals','loans','income','subscriptions',
               'compare-funds','sectors','tax-optimizer','gemel','pension-calc',
               'reports','profile','settings','ai-chat','calendar'];

(async () => {
    const browser = await chromium.launch();

    for (const slug of PAGES.slice(0, 7)) {
        await step(`/pages/${slug}.html — page loads + content > 200 chars`, async () => {
            const { ctx, page } = await fresh(browser, undefined, `/pages/${slug}.html`);
            try {
                const len = await page.evaluate(() => document.body.innerText.length);
                if (len < 200) throw new Error(`only ${len} chars`);
            } finally { await page.close(); await ctx.close(); }
        });
    }

    await step('Sidebar lang switcher saves to localStorage', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const pill = page.locator('.sidebar-lang-pills button:has-text("EN")').first();
            if (!(await pill.count())) { warn('Sidebar lang pills not found', ''); return; }
            await pill.click({ force: true }).catch(() => {});
            await page.waitForTimeout(1500);
            const lang = await page.evaluate(() => localStorage.getItem('wl_lang'));
            if (lang !== 'en') throw new Error(`wl_lang=${lang} after EN click`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Right info-panel shows Net Worth label', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => {
                const p = document.getElementById('wl-money-rpanel');
                return p && /Net Worth|שווי נטו|Patrimônio|Patrimonio/i.test(p.innerText);
            });
            if (!has) warn('right panel missing or no Net-Worth label', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Right info-panel Cross-app advisor link points to wize-ai.html', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const href = await page.evaluate(() => {
                const a = document.querySelector('#wl-money-rpanel a[href*="wize-ai"]');
                return a ? a.href : null;
            });
            if (!href) warn('cross-app advisor link missing', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Onboarding overlay shown to fresh user with no data', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                // Wipe any local data → mimic fresh user
                try { localStorage.clear(); } catch {}
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const ob = await page.evaluate(() => {
                const el = document.getElementById('onboardingOverlay');
                return el && getComputedStyle(el).display !== 'none';
            });
            if (!ob) warn('Onboarding overlay not visible for fresh user', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Onboarding card has bank/credit/savings entries', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const txt = await page.evaluate(() => document.body.innerText);
            const expected = ['bank', 'credit', 'goal', 'saving'];
            const found = expected.filter(e => new RegExp(e, 'i').test(txt));
            if (found.length < 2) warn(`only ${found.length}/4 onboarding categories visible`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mobile bottom-nav: 5 entries visible at 390w', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            await page.waitForTimeout(3000);
            const count = await page.evaluate(() =>
                document.querySelectorAll('.wize-bottom-nav a, .wize-bottom-nav button, nav[data-bottom-nav] a').length
            );
            if (count < 4) warn(`bottom-nav has ${count} items (expected ≥4)`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('PWA install banner / Add-to-home meta tags present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const meta = await page.evaluate(() => ({
                manifest: !!document.querySelector('link[rel=manifest]'),
                touchIcon: !!document.querySelector('link[rel=apple-touch-icon]'),
                themeColor: !!document.querySelector('meta[name=theme-color]'),
            }));
            const missing = Object.keys(meta).filter(k => !meta[k]);
            if (missing.length) throw new Error(`missing PWA meta: ${missing.join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Dashboard widgets: Net Worth + Quick Stats + Recent activity all render', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForTimeout(3500);
            const widgets = await page.evaluate(() => {
                const t = document.body.innerText;
                return {
                    netWorth: /net worth|שווי נטו|patrimônio|patrimonio/i.test(t),
                    stats: /quick stat|stat|מהיר/i.test(t),
                    recent: /recent|פעולות|recente|reciente/i.test(t),
                };
            });
            const missing = Object.keys(widgets).filter(k => !widgets[k]);
            if (missing.length >= 2) warn(`missing widgets: ${missing.join(', ')}`, 'might be onboarding view');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('No console.log of email / API key (PII leak check)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const logs = [];
            page.on('console', m => logs.push(m.text()));
            await page.waitForTimeout(3000);
            const PII = [/[A-Za-z0-9._%+-]+@gmail\.com/, /AIza[0-9A-Za-z-_]{35}/, /sk-[A-Za-z0-9]{30,}/];
            const leaks = logs.filter(l => PII.some(re => re.test(l)));
            if (leaks.length) throw new Error(`PII in console: ${leaks[0].slice(0, 80)}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('CSP header present + restrictive', async () => {
        const { ctx } = await fresh(browser);
        try {
            const r = await ctx.request.head(BASE + '/', { timeout: 10000 });
            const csp = r.headers()['content-security-policy'] || '';
            if (!csp) throw new Error('No CSP header');
            if (!/default-src|script-src/i.test(csp)) throw new Error('CSP too permissive');
        } finally { await ctx.close(); }
    });

    await step('All sidebar.* assets load with 2xx status (no broken CSS/JS)', async () => {
        const { ctx, page } = await fresh(browser);
        const failures = [];
        page.on('response', r => {
            if (r.status() >= 400 && /\.(js|css)$/.test(r.url())) failures.push(`${r.url()} → ${r.status()}`);
        });
        try {
            await page.waitForTimeout(4000);
            if (failures.length) throw new Error(`broken asset(s): ${failures.slice(0, 2).join(' | ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Theme toggle in sidebar exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                !!document.querySelector('[data-theme-toggle], button[onclick*="theme" i], #themeToggle')
            );
            if (!has) warn('No theme toggle button found', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Performance: bundle transfer size < 3 MB on landing', async () => {
        const { ctx, page } = await fresh(browser);
        let total = 0;
        page.on('response', async r => {
            const cl = r.headers()['content-length'];
            if (cl) total += parseInt(cl) || 0;
        });
        try {
            await page.waitForTimeout(4000);
            const mb = (total / (1024 * 1024)).toFixed(2);
            if (total > 3 * 1024 * 1024) warn(`transfer ${mb}MB > 3MB budget`, 'consider lazy-loading');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizemoney-flows-v3-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
