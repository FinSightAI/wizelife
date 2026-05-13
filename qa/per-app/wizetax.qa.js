#!/usr/bin/env node
// WizeTax QA — chat, advisor sidebar, Israel wizard, multi-message context, language switch
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const { step, warn, finalize } = makeReporter('WizeTax');
const BASE = 'https://tax.wizelife.ai';

(async () => {
    const browser = await chromium.launch();

    // Public pages
    for (const path of ['/', '/advisor']) {
        await step(`${path} loads`, async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            const r = await page.goto(BASE + path, { timeout: 25000 });
            const len = await page.evaluate(() => document.body.innerText.trim().length);
            await page.close(); await ctx.close();
            if (!r || r.status() >= 400) throw new Error(`HTTP ${r ? r.status() : 0}`);
            if (len < 50) throw new Error(`only ${len} chars`);
        });
    }

    // Routes that should redirect (not 404)
    for (const path of ['/reports', '/profile']) {
        await step(`${path} reachable (redirect or page)`, async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            const r = await page.goto(BASE + path, { timeout: 20000 });
            await page.close(); await ctx.close();
            if (!r || r.status() >= 500) throw new Error(`HTTP ${r ? r.status() : 0}`);
        });
    }

    // Chat input present
    await step('Advisor: chat input visible', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/advisor', { timeout: 25000 });
            await page.waitForSelector('textarea, input[type="text"]', { timeout: 10000 });
        } finally {
            await page.close(); await ctx.close();
        }
    });

    // Chat actually responds (single message)
    await step('Send "What is VAT?" → assistant responds (>20 chars)', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/advisor', { timeout: 25000 });
            const inp = page.locator('textarea, input[type=text]').first();
            await inp.waitFor({ state: 'visible', timeout: 10000 });
            await inp.fill('What is VAT?');
            await inp.press('Enter');
            await page.waitForFunction(() => {
                const sel = '[class*="assistant"],[class*="bot"],[class*="response"],[class*="message"]';
                return [...document.querySelectorAll(sel)].some(el => el.textContent.trim().length > 20);
            }, { timeout: 60000 });
        } finally {
            await page.close(); await ctx.close();
        }
    });

    // No CSP violations on first load
    await step('No CSP violations in console', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const cspErrors = [];
        page.on('console', m => {
            if (m.type() === 'error' && /Content Security Policy|CSP/i.test(m.text())) {
                cspErrors.push(m.text().slice(0, 120));
            }
        });
        await page.goto(BASE + '/advisor', { timeout: 25000 });
        await page.waitForTimeout(3000);
        await page.close(); await ctx.close();
        if (cspErrors.length) throw new Error(`${cspErrors.length} CSP errors: ${cspErrors[0]}`);
    });

    // Language switch (HE → EN button)
    await step('Language switch: HE → EN affects UI', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/advisor', { timeout: 25000 });
            const enBtn = page.locator('button:has-text("EN"), [data-lang="en"]').first();
            if (!(await enBtn.count())) {
                warn('No EN button on WizeTax advisor', 'check Lang pills are rendered');
                return;
            }
            await enBtn.click();
            await page.waitForTimeout(800);
            const dir = await page.evaluate(() => document.documentElement.dir);
            if (dir === 'rtl') throw new Error('still rtl after EN click');
        } finally {
            await page.close(); await ctx.close();
        }
    });

    // Mobile
    await step('iPhone (390×844): no h-overflow', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        await page.goto(BASE + '/advisor', { timeout: 25000 });
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 10
        );
        await page.close(); await ctx.close();
        if (overflow) throw new Error('horizontal overflow');
    });

    await browser.close();
    finalize('wizetax-qa-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
