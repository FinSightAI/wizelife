#!/usr/bin/env node
// WizeTravel QA — load + tab navigation + Kiwi iframe + mobile responsiveness
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const { step, warn, finalize } = makeReporter('WizeTravel');
const BASE = 'https://travel.wizelife.ai';

(async () => {
    const browser = await chromium.launch();

    await step('Home loads', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const r = await page.goto(BASE + '/', { timeout: 30000 });
        const len = await page.evaluate(() => document.body.innerText.trim().length);
        await page.close(); await ctx.close();
        if (!r || r.status() >= 400) throw new Error(`HTTP ${r ? r.status() : 0}`);
        if (len < 50) throw new Error(`only ${len} chars`);
    });

    await step('Nav/tab-bar renders', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/', { timeout: 25000 });
            const nav = page.locator('nav, [role=tablist], .tabs, .tab-bar, button[data-tab]').first();
            await nav.waitFor({ state: 'attached', timeout: 10000 });
        } finally {
            await page.close(); await ctx.close();
        }
    });

    await step('Kiwi iframe embedded (or search UI present)', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/', { timeout: 25000 });
            const el = page.locator('iframe[src*="kiwi"], iframe[src*="kiwicom"], iframe, [class*="search"]').first();
            await el.waitFor({ state: 'attached', timeout: 10000 });
        } finally {
            await page.close(); await ctx.close();
        }
    });

    await step('Tab switching (if tabs exist)', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/', { timeout: 25000 });
            const tab = page.locator('button:has-text("Hotels"), button:has-text("Events"), button[data-tab]').first();
            if (!(await tab.count())) {
                warn('No additional tabs found', 'WizeTravel may be single-view');
                return;
            }
            await tab.click();
            await page.waitForTimeout(800);
        } finally {
            await page.close(); await ctx.close();
        }
    });

    await step('iPhone (390×844): no h-overflow', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        await page.goto(BASE + '/', { timeout: 30000 });
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 10
        );
        await page.close(); await ctx.close();
        if (overflow) throw new Error('horizontal overflow');
    });

    await browser.close();
    finalize('wizetravel-qa-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
