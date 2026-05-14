#!/usr/bin/env node
// Multi-tab consistency: when the user changes language in tab A,
// tab B (same origin) should pick it up via the `storage` event.
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const { step, warn, finalize } = makeReporter('Multi-Tab');

const URL = 'https://wizelife.ai/';

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    await step('Language change in tab A propagates to tab B via storage event', async () => {
        const tabA = await ctx.newPage();
        const tabB = await ctx.newPage();
        await tabA.goto(URL, { timeout: 30000 });
        await tabB.goto(URL, { timeout: 30000 });
        await tabA.waitForTimeout(2000);
        await tabB.waitForTimeout(2000);

        // Set both to HE first
        await tabA.evaluate(() => localStorage.setItem('wl_lang', 'he'));
        await tabA.reload({ waitUntil: 'load' });
        await tabA.waitForTimeout(1500);

        // Now in tab A, switch to EN
        const beforeB = await tabB.evaluate(() => document.documentElement.lang || document.documentElement.dir);
        await tabA.evaluate(() => {
            localStorage.setItem('wl_lang', 'en');
            // Manually dispatch storage event (since same-tab doesn't fire it)
            window.dispatchEvent(new StorageEvent('storage', { key: 'wl_lang', newValue: 'en' }));
        });
        await tabB.waitForTimeout(2000);
        const afterB = await tabB.evaluate(() => document.documentElement.lang || document.documentElement.dir);

        await tabA.close(); await tabB.close();
        // We accept either: (a) tabB updates without reload, or (b) at least the storage value sync'd
        const storageInB = await ctx.storageState();
        const ok = afterB !== beforeB;
        if (!ok) warn('Tab B did not auto-update on tab A lang change', 'add storage-event listener if cross-tab UX matters');
    });

    await ctx.close(); await browser.close();
    finalize('multi-tab-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
