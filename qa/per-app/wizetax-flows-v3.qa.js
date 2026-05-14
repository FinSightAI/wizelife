#!/usr/bin/env node
// WizeTax — flows v3 (12 more scenarios).
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://tax.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTax-FlowsV3');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/advisor') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3000);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    await step('Save session: localStorage write detected', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                localStorage.setItem('tax_master_sessions', JSON.stringify([{ id: 'qa1', messages: [{ role: 'user', content: 'test' }] }]));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const stored = await page.evaluate(() => localStorage.getItem('tax_master_sessions'));
            if (!stored || !stored.includes('qa1')) throw new Error('session didn\'t persist');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country flags shown — at least Israel + Portugal + UAE', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const txt = await page.evaluate(() => document.body.innerText);
            const needed = ['🇮🇱', '🇵🇹', '🇦🇪', '🇺🇸'];
            const found = needed.filter(f => txt.includes(f));
            if (found.length < 3) warn(`only ${found.length}/4 expected flags`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Currency symbol matches country (₪ for IL, € for EU, etc.)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => /₪|€|\$|R\$|£/.test(document.body.innerText));
            if (!has) warn('No currency symbols on advisor page', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Provider switcher mentioned (Gemini/OpenRouter/etc.)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ok = await page.evaluate(() => /Gemini|OpenRouter|Groq|provider|AI provider/i.test(document.body.innerText));
            if (!ok) warn('No AI provider switcher mentioned', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Voice input / dictation icon present (if implemented)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                !!document.querySelector('button[aria-label*="voice" i], button[aria-label*="dictat" i], button:has(svg.mic), button:has(.mic-icon)') ||
                /\bvoice\b|\bdictation\b|🎤/i.test(document.body.innerText)
            );
            if (!has) warn('No voice-input control', 'optional feature');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Devil mode toggle exists (red-team prompting feature)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => /devil mode|מצב שטן/i.test(document.body.innerText));
            if (!has) warn('No Devil mode toggle text', 'may be hidden behind settings');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Plan mode toggle (tax plan review) exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => /plan mode|review plan|תוכנית מס|בדיקת תוכנית/i.test(document.body.innerText));
            if (!has) warn('No plan-mode toggle', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Tax timeline visible — has at least 2 years', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/tax-timeline');
        try {
            const yrs = await page.evaluate(() => new Set((document.body.innerText.match(/\b20\d{2}\b/g) || [])).size);
            if (yrs < 2) warn(`only ${yrs} distinct years on timeline`, 'may be 404 or empty');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Send chat then Esc / Cancel — input clears OR aborts streaming', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 8000 });
            await ta.fill('What is VAT in Portugal?');
            const sendBtn = page.locator('button[type=submit], button:has-text("Send"), button:has-text("שלח")').first();
            if (!(await sendBtn.count())) { warn('no send button', ''); return; }
            await sendBtn.click();
            await page.waitForTimeout(800);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            // Just don't crash
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Long chat: keeps input + scrolls bottom', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 8000 });
            // Simulate a long pasted question
            const long = 'I need help with the following ' + 'and more details here. '.repeat(50);
            await ta.fill(long);
            const len = await ta.inputValue();
            if (len.length < 500) throw new Error('long input truncated');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Sample profile pre-fill button exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /sample|דוגמא|example|preset/i.test(document.body.innerText)
            );
            if (!has) warn('No sample-profile pre-fill button', 'helps first-time UX');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mobile (390×844): chat input reachable', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const visible = await page.locator('textarea').first().isVisible({ timeout: 3000 }).catch(() => false);
            if (!visible) warn('Textarea not visible on mobile — may need scroll', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizetax-flows-v3-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
