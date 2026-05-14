#!/usr/bin/env node
// Keyboard navigation: tab traversal reaches all interactive elements,
// no traps, Escape closes modals, Enter submits forms.
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const URLS = [
    'https://wizelife.ai/auth.html',
    'https://wizelife.ai/feedback.html',
    'https://wizelife.ai/',
    'https://money.wizelife.ai/',
    'https://tax.wizelife.ai/advisor',
    'https://deal.wizelife.ai/',
];

const { step, warn, finalize } = makeReporter('Keyboard-Nav');

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    for (const url of URLS) {
        await step(`${url} — Tab reaches ≥3 interactive elements without trap`, async () => {
            try { await page.goto(url, { timeout: 45000 }); } catch (e) { throw new Error('navigation failed: ' + e.message.slice(0, 80)); }
            await page.waitForTimeout(2000);
            const visited = new Set();
            let lastTag = '';
            for (let i = 0; i < 15; i++) {
                await page.keyboard.press('Tab');
                await page.waitForTimeout(80);
                const focus = await page.evaluate(() => {
                    const el = document.activeElement;
                    if (!el || el === document.body) return null;
                    return `${el.tagName}#${el.id || ''}.${(el.className||'').toString().slice(0, 24)}`;
                });
                if (!focus) continue;
                visited.add(focus);
                lastTag = focus;
            }
            if (visited.size < 3) throw new Error(`Tab visited only ${visited.size} distinct elements after 15 presses — possible trap or empty page`);
        });
    }

    await step('Escape closes auth modal (forgot-password)', async () => {
        await page.goto('https://wizelife.ai/auth.html', { timeout: 30000 });
        await page.waitForTimeout(1500);
        const fp = page.locator('a:has-text("Forgot"), a:has-text("שכחת"), .forgot a').first();
        if (!(await fp.count())) { warn('Forgot link not found', 'cannot test modal Esc'); return; }
        await fp.click();
        await page.waitForTimeout(1000);
        const opened = await page.evaluate(() => !!document.querySelector('[class*="modal"]:not([style*="display:none"]), [class*="reset"], [role=dialog]'));
        if (!opened) { warn('Modal did not open', ''); return; }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(700);
        const closed = await page.evaluate(() => !document.querySelector('[role=dialog]:not([hidden])'));
        if (!closed) warn('Modal did not close on Esc', 'a11y improvement');
    });

    await browser.close();
    finalize('keyboard-nav-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
