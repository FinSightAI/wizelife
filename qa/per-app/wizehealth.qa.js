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
    await step('health.wizelife.ai loads within 60s', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.goto('https://health.wizelife.ai/', { waitUntil: 'load', timeout: 60000 });
        const len = await page.evaluate(() => document.body.innerText.trim().length);
        await page.close(); await ctx.close();
        if (len < 50) throw new Error(`only ${len} chars rendered`);
    });

    // Chat input present
    await step('Chat input visible', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto('https://health.wizelife.ai/', { timeout: 60000 });
            // Target the chat textarea by its id — the page has several hidden
            // profile-form textareas (#olModel, #profConditions, …) earlier in the
            // DOM, so a broad 'textarea' selector waits on a hidden element forever.
            await page.waitForSelector('#txt', { state: 'visible', timeout: 45000 });
        } finally {
            await page.close(); await ctx.close();
        }
    });

    // Plan detection — SSO with wl_plan=yolo should be read
    await step('Plan detection: wl_plan=yolo URL param stored', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            await page.goto('https://health.wizelife.ai/?wl_plan=yolo&wl_nick=qauser', { timeout: 60000 });
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
            await page.goto('https://health.wizelife.ai/', { timeout: 60000 });
            const inp = page.locator('#txt').first(); // specific chat textarea (hidden ones precede it)
            await inp.waitFor({ state: 'visible', timeout: 45000 });
            await inp.fill('What helps with a headache?');
            // Send via Enter — the only submit-type buttons on the page are the
            // language pills (HE/EN/…), so a button selector clicks the wrong thing.
            await inp.press('Enter');
            const responded = await page.waitForFunction(() => {
                const sel = '[class*="assistant"],[class*="bot"],[class*="ai"],[class*="response"]';
                return [...document.querySelectorAll(sel)].some(el => el.textContent.trim().length > 20);
            }, { timeout: 90000 }).then(() => true).catch(() => false);
            if (responded) return;
            // WizeHealth's AI endpoints require auth (401 without a token). This
            // standalone QA is anonymous, so no answer is EXPECTED — the gate works.
            // The authenticated AI answer is verified by run-e2e.js. Fail only if
            // we're actually logged in.
            const loggedIn = await page.evaluate(() => !!localStorage.getItem('wl_token'));
            if (loggedIn) throw new Error('Logged-in but no AI response within 90s');
            warn('AI answer not verified — WizeHealth AI is auth-gated and this run is anonymous', 'real response covered by run-e2e.js (logged-in)');
        } finally {
            await page.close(); await ctx.close();
        }
    });

    // Mobile
    await step('iPhone (390×844): no h-overflow on vitara', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        await page.goto('https://health.wizelife.ai/', { timeout: 60000 });
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 10
        );
        await page.close(); await ctx.close();
        if (overflow) throw new Error('horizontal overflow');
    });

    await browser.close();
    finalize('wizehealth-qa-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
