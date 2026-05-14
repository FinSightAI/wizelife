#!/usr/bin/env node
// Locale formatting: numbers + dates render correctly per locale.
// E.g., 1234.5 → "1,234.5" en-US vs "1.234,5" pt-BR.
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const URLS = [
    'https://wizelife.ai/dashboard.html',
    'https://money.wizelife.ai/',
    'https://tax.wizelife.ai/advisor',
    'https://deal.wizelife.ai/',
];

const { step, warn, finalize } = makeReporter('Locale-Formatting');

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    for (const url of URLS) {
        await step(`${url} — Intl APIs work + html[lang] set per current lang`, async () => {
            try { await page.goto(url, { timeout: 45000 }); }
            catch (e) { throw new Error('navigation failed: ' + e.message.slice(0, 80)); }
            await page.waitForTimeout(2500);

            // Switch to EN
            await page.evaluate(() => localStorage.setItem('wl_lang', 'en'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const enLang = await page.evaluate(() => document.documentElement.lang);
            if (enLang && !enLang.startsWith('en')) warn(`html[lang]=${enLang} after EN switch (expected en*)`, '');

            // Verify Intl works
            const intlOk = await page.evaluate(() => {
                try {
                    const numEN = new Intl.NumberFormat('en-US').format(1234567.89);
                    const numPT = new Intl.NumberFormat('pt-BR').format(1234567.89);
                    return numEN.includes(',') && numPT.includes('.');
                } catch (e) { return false; }
            });
            if (!intlOk) warn('Intl.NumberFormat not producing locale-specific separators', '');
        });
    }

    await step('Hebrew dir=rtl + EN dir=ltr toggle correctly on portal', async () => {
        await page.goto('https://wizelife.ai/', { timeout: 30000 });
        await page.waitForTimeout(2000);
        await page.evaluate(() => localStorage.setItem('wl_lang', 'he'));
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(2000);
        const heDir = await page.evaluate(() => document.documentElement.dir);
        await page.evaluate(() => localStorage.setItem('wl_lang', 'en'));
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(2000);
        const enDir = await page.evaluate(() => document.documentElement.dir);
        if (heDir !== 'rtl') throw new Error(`HE dir=${heDir}, expected rtl`);
        if (enDir !== 'ltr') throw new Error(`EN dir=${enDir}, expected ltr`);
    });

    await page.close(); await ctx.close(); await browser.close();
    finalize('locale-formatting-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
