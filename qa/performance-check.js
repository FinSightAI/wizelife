#!/usr/bin/env node
// Performance budgets: TTFB, FCP (first paint), transferred bytes,
// number of requests. Catches regressions where a bloated bundle slips in.
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const URLS = [
    'https://wizelife.ai/',
    'https://wizelife.ai/auth.html',
    'https://wizelife.ai/dashboard.html',
    'https://money.wizelife.ai/',
    'https://tax.wizelife.ai/',
    'https://deal.wizelife.ai/',
    'https://travel.wizelife.ai/',
];

const BUDGETS = {
    ttfbMs: 1500,
    fcpMs: 4000,
    transferKB: 2500,
    requests: 80,
};

const { step, warn, finalize } = makeReporter('Performance');

(async () => {
    const browser = await chromium.launch();
    for (const url of URLS) {
        await step(`${url} — within performance budget`, async () => {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            let totalBytes = 0;
            let reqCount = 0;
            page.on('response', async (resp) => {
                reqCount++;
                try {
                    const cl = resp.headers()['content-length'];
                    if (cl) totalBytes += parseInt(cl) || 0;
                } catch {}
            });
            const t0 = Date.now();
            let nav;
            try { nav = await page.goto(url, { waitUntil: 'load', timeout: 60000 }); }
            catch (e) { await page.close(); await ctx.close(); throw new Error('navigation failed: ' + e.message.slice(0, 80)); }
            const loadMs = Date.now() - t0;
            // Pull web vitals
            const metrics = await page.evaluate(() => {
                const t = performance.timing || performance.getEntriesByType('navigation')[0];
                const navE = performance.getEntriesByType('navigation')[0];
                const paint = performance.getEntriesByType('paint');
                const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime || null;
                return {
                    ttfb: navE ? Math.round(navE.responseStart - navE.requestStart) : null,
                    fcp: fcp ? Math.round(fcp) : null,
                    domLoaded: navE ? Math.round(navE.domContentLoadedEventEnd) : null,
                };
            });
            await page.close();
            await ctx.close();

            const transferKB = Math.round(totalBytes / 1024);
            const fails = [];
            if (metrics.ttfb !== null && metrics.ttfb > BUDGETS.ttfbMs) fails.push(`TTFB ${metrics.ttfb}ms > ${BUDGETS.ttfbMs}`);
            if (metrics.fcp !== null && metrics.fcp > BUDGETS.fcpMs) fails.push(`FCP ${metrics.fcp}ms > ${BUDGETS.fcpMs}`);
            if (transferKB > BUDGETS.transferKB) fails.push(`Transfer ${transferKB}KB > ${BUDGETS.transferKB}`);
            if (reqCount > BUDGETS.requests) fails.push(`Requests ${reqCount} > ${BUDGETS.requests}`);

            if (fails.length) {
                throw new Error(`${fails.join('; ')} (load=${loadMs}ms, TTFB=${metrics.ttfb}, FCP=${metrics.fcp}, transfer=${transferKB}KB, reqs=${reqCount})`);
            }
            // No throw → pass, but emit a digestible warn for awareness
            if (loadMs > 8000) warn(`${url} — slow first load (${loadMs}ms)`, 'cold-start or large bundle');
        });
    }
    await browser.close();
    finalize('performance-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
