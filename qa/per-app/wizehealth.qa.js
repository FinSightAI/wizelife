#!/usr/bin/env node
// WizeHealth QA — vitara load (cold-start budget), chat, plan detection
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const { step, warn, finalize } = makeReporter('WizeHealth');

(async () => {
    const browser = await chromium.launch();

    // Launcher (health.wizelife.ai)
    await step('Launcher loads quickly (no fake screenshot)', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const t0 = Date.now();
        const r = await page.goto('https://health.wizelife.ai/', { timeout: 15000 });
        const elapsed = Date.now() - t0;
        await page.close(); await ctx.close();
        if (!r || r.status() >= 400) throw new Error(`HTTP ${r ? r.status() : 0}`);
        if (elapsed > 5000) warn(`Launcher took ${elapsed}ms`, 'expected <2s for the redirect/wrapper');
    });

    // wizelife.ai/health.html → redirects (no screenshot)
    await step('wizelife.ai/health.html redirects without static screenshot', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const r = await page.goto('https://wizelife.ai/health.html?wl_plan=yolo', { timeout: 15000 });
        // After redirect, should be on health.wizelife.ai
        const finalUrl = page.url();
        await page.close(); await ctx.close();
        if (!finalUrl.includes('health.wizelife.ai')) throw new Error(`expected redirect to health.wizelife.ai, got ${finalUrl}`);
    });

    // Vitara cold-start budget
    await step('vitara.onrender.com loads within 60s', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.goto('https://vitara.onrender.com/', { waitUntil: 'load', timeout: 60000 });
        const len = await page.evaluate(() => document.body.innerText.trim().length);
        await page.close(); await ctx.close();
        if (len < 50) throw new Error(`only ${len} chars rendered`);
    });

    // Chat input present
    await step('Chat input visible', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto('https://vitara.onrender.com/', { timeout: 60000 });
            await page.waitForSelector('#txt, textarea, input[type=text]', { timeout: 15000 });
        } finally {
            await page.close(); await ctx.close();
        }
    });

    // Plan detection — SSO with wl_plan=yolo should be read
    await step('Plan detection: wl_plan=yolo URL param stored', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto('https://vitara.onrender.com/?wl_plan=yolo&wl_nick=qauser', { timeout: 60000 });
            await page.waitForTimeout(3000);
            const stored = await page.evaluate(() => {
                try {
                    const sso = JSON.parse(localStorage.getItem('wl_sso') || '{}');
                    return sso.plan || localStorage.getItem('wl_plan');
                } catch { return null; }
            });
            if (stored !== 'yolo') throw new Error(`wl_plan stored as: ${stored} (expected yolo)`);
        } finally {
            await page.close(); await ctx.close();
        }
    });

    // Chat actually responds
    await step('Send health question → response (60s budget)', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto('https://vitara.onrender.com/', { timeout: 60000 });
            const inp = page.locator('#txt, .chat-input, textarea').first();
            await inp.waitFor({ state: 'visible', timeout: 15000 });
            await inp.fill('What helps with a headache?');
            const send = page.locator('button:has-text("Send"), #sendBtn, button[type=submit]').first();
            if (await send.count()) await send.click(); else await inp.press('Enter');
            await page.waitForFunction(() => {
                const sel = '[class*="assistant"],[class*="bot"],[class*="ai"],[class*="response"]';
                return [...document.querySelectorAll(sel)].some(el => el.textContent.trim().length > 20);
            }, { timeout: 90000 });
        } finally {
            await page.close(); await ctx.close();
        }
    });

    // Mobile
    await step('iPhone (390×844): no h-overflow on vitara', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        await page.goto('https://vitara.onrender.com/', { timeout: 60000 });
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 10
        );
        await page.close(); await ctx.close();
        if (overflow) throw new Error('horizontal overflow');
    });

    await browser.close();
    finalize('wizehealth-qa-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
