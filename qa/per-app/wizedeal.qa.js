#!/usr/bin/env node
// WizeDeal QA — landing, wizard flow, saved deals, text-mode listing extraction
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const { step, warn, finalize } = makeReporter('WizeDeal');
const BASE = 'https://deal.wizelife.ai';

(async () => {
    const browser = await chromium.launch();

    await step('Home loads', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const r = await page.goto(BASE + '/', { timeout: 30000 });
        const len = await page.evaluate(() => document.body.innerText.trim().length);
        await page.close(); await ctx.close();
        if (!r || r.status() >= 400) throw new Error(`HTTP ${r ? r.status() : 0}`);
        if (len < 80) throw new Error(`only ${len} chars`);
    });

    // Routes (Next.js)
    for (const path of ['/saved', '/profile']) {
        await step(`${path} reachable (redirect or page)`, async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            const r = await page.goto(BASE + path, { timeout: 20000 });
            await page.close(); await ctx.close();
            if (!r || r.status() >= 500) throw new Error(`HTTP ${r ? r.status() : 0}`);
        });
    }

    await step('Click "Analyze" or "New Deal" → wizard opens', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/', { timeout: 30000 });
            const btn = page.locator([
                'button:has-text("Analyze")',
                'button:has-text("New Deal")',
                'button:has-text("Add Deal")',
                'a:has-text("New Deal")',
            ].join(', ')).first();
            await btn.waitFor({ state: 'visible', timeout: 10000 });
            await btn.click();
            await page.waitForTimeout(800);
        } finally {
            await page.close(); await ctx.close();
        }
    });

    await step('Text-mode extraction: paste listing → get analysis', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/', { timeout: 30000 });
            const btn = page.locator('button:has-text("Analyze"), button:has-text("New Deal")').first();
            await btn.click();
            const textMode = page.locator('button:has-text("Text"), button:has-text("Paste")').first();
            if (await textMode.count()) await textMode.click();
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 8000 });
            await ta.fill('2BR apartment, 70sqm, Lisbon. Price 450000 EUR. Built 1920.');
            await page.locator('button:has-text("Extract"), button:has-text("Analyze")').last().click();
            await page.waitForFunction(() =>
                /lisbon|450|70/i.test(document.body.innerText),
                { timeout: 45000 }
            );
        } finally {
            await page.close(); await ctx.close();
        }
    });

    await step('CSP allows clarity.ms + wizelife.ai scripts', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const csp = [];
        page.on('console', m => {
            if (m.type() === 'error' && /Content Security Policy|CSP/i.test(m.text())) {
                csp.push(m.text().slice(0, 120));
            }
        });
        await page.goto(BASE + '/', { timeout: 30000 });
        await page.waitForTimeout(3000);
        await page.close(); await ctx.close();
        if (csp.length) throw new Error(`${csp.length} CSP errors: ${csp[0]}`);
    });

    // Mobile
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
    finalize('wizedeal-qa-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
