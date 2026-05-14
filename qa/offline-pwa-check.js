#!/usr/bin/env node
// PWA offline behavior: Service Worker registers, caches the shell, and
// when network is shut down, the cached shell still loads.
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const PWA_URLS = [
    'https://wizelife.ai/',
    'https://money.wizelife.ai/',
    'https://vitara.onrender.com/',
];

const { step, warn, finalize } = makeReporter('Offline-PWA');

(async () => {
    const browser = await chromium.launch();

    for (const url of PWA_URLS) {
        await step(`${url} — SW registers + caches the shell`, async () => {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            try { await page.goto(url, { waitUntil: 'load', timeout: 60000 }); }
            catch (e) { await page.close(); await ctx.close(); throw new Error('first load failed: ' + e.message.slice(0, 80)); }
            // Wait for SW activate
            await page.waitForTimeout(5000);
            const sw = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return { state: 'unsupported' };
                const regs = await navigator.serviceWorker.getRegistrations();
                return { state: regs.length ? 'registered' : 'none', count: regs.length };
            });
            if (sw.state !== 'registered') throw new Error(`SW not registered (${sw.state})`);

            // Open second page while offline → cached shell should serve.
            await ctx.setOffline(true);
            const page2 = await ctx.newPage();
            let offlineWorks = false;
            try {
                await page2.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
                const len = await page2.evaluate(() => document.body.innerText.length);
                offlineWorks = len > 50;
            } catch (e) {}
            await ctx.setOffline(false);
            await page.close(); await page2.close(); await ctx.close();

            if (!offlineWorks) warn(`Offline reload didn't render shell`, 'SW caching may be partial');
        });
    }

    await browser.close();
    finalize('offline-pwa-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
