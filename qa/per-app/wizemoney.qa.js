#!/usr/bin/env node
// WizeMoney QA — income, expense, goals, accounts, AI chat, reports
const { chromium } = require('playwright');
const { makeReporter, fillAndLogin } = require('../shared-lib/helpers');

const QA_EMAIL    = process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD;
const HAS_CREDS   = !!(QA_EMAIL && QA_PASSWORD);

const { step, warn, finalize } = makeReporter('WizeMoney');
const BASE = 'https://money.wizelife.ai';

(async () => {
    const browser = await chromium.launch();

    // Public access
    await step('Home loads', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        await page.goto(BASE + '/', { timeout: 30000 });
        const len = await page.evaluate(() => document.body.innerText.trim().length);
        await page.close(); await ctx.close();
        if (len < 80) throw new Error(`only ${len} chars`);
    });

    // Pages must not 404
    const PAGES = [
        '/pages/income.html',
        '/pages/bank.html',
        '/pages/credit.html',
        '/pages/stocks.html',
        '/pages/goals.html',
        '/pages/reports.html',
        '/pages/settings.html',
        '/pages/profile.html',
        '/pages/preferences.html',
        '/pages/ai-chat.html',
        '/pages/investment-advisor.html',
    ];
    for (const path of PAGES) {
        await step(`${path} reachable`, async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            const r = await page.goto(BASE + path, { timeout: 20000 });
            await page.close(); await ctx.close();
            if (!r || r.status() >= 400) throw new Error(`HTTP ${r ? r.status() : 0}`);
        });
    }

    // Authenticated flows
    if (HAS_CREDS) {
        await step('Login → reach app', async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            try {
                await page.goto(BASE + '/', { timeout: 30000 });
                if (page.url().includes('auth') || await page.locator('input[type=email]').count()) {
                    await fillAndLogin(page, QA_EMAIL, QA_PASSWORD);
                    await page.waitForSelector('.sidebar, #mainContent, .app-container', { timeout: 15000 });
                }
            } finally {
                await page.close(); await ctx.close();
            }
        });

        await step('Add income → row appears', async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            try {
                await page.goto(BASE + '/pages/income.html', { timeout: 25000 });
                if (page.url().includes('auth') || await page.locator('input[type=email]').count()) {
                    await fillAndLogin(page, QA_EMAIL, QA_PASSWORD);
                    await page.waitForURL(/income\.html/, { timeout: 15000 });
                }
                await page.locator('button[onclick*="openAddModal"], button:has-text("Add"), button:has-text("הוסף")').first().click();
                await page.waitForSelector('#incomeModal', { state: 'visible', timeout: 6000 });
                const tag = 'QA-' + Date.now();
                await page.fill('#incomeName', tag);
                await page.fill('#incomeAmount', '1234');
                await page.fill('#incomeDate', new Date().toISOString().split('T')[0]);
                await page.click('#incomeModal button[type=submit], #incomeModal .btn-primary');
                await page.waitForFunction((t) =>
                    [...document.querySelectorAll('#incomeTableBody tr')].some(r => r.textContent.includes(t)),
                    tag,
                    { timeout: 10000 }
                );
            } finally {
                await page.close(); await ctx.close();
            }
        });

        await step('AI chat responds', async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            try {
                await page.goto(BASE + '/pages/ai-chat.html', { timeout: 30000 });
                if (page.url().includes('auth') || await page.locator('input[type=email]').count()) {
                    await fillAndLogin(page, QA_EMAIL, QA_PASSWORD);
                }
                const inp = page.locator('#chatInput, textarea, input[type=text]').first();
                await inp.waitFor({ state: 'visible', timeout: 8000 });
                await inp.fill('What is compound interest?');
                const send = page.locator('#sendBtn, button:has-text("Send"), button[type=submit]').first();
                if (await send.count()) await send.click(); else await inp.press('Enter');
                await page.waitForFunction(() => {
                    const sel = '[class*="assistant"],[class*="bot"],[class*="ai"],[class*="response"],.message';
                    return [...document.querySelectorAll(sel)].some(el => el.textContent.trim().length > 20);
                }, { timeout: 90000 });
            } finally {
                await page.close(); await ctx.close();
            }
        });
    } else {
        warn('auth flows skipped — no QA_EMAIL/QA_PASSWORD');
    }

    // Mobile responsiveness
    await step('iPhone (390×844): income page no h-overflow', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        await page.goto(BASE + '/pages/income.html', { timeout: 25000 });
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 10
        );
        await page.close(); await ctx.close();
        if (overflow) throw new Error('horizontal overflow');
    });

    // Plan badge present in sidebar
    await step('SSO plan badge code present', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.goto(BASE + '/', { timeout: 25000 });
        const hasPlan = await page.evaluate(() => {
            return document.body.innerHTML.includes('wl-bar-plan') ||
                   document.body.innerHTML.includes('wl_plan') ||
                   document.body.innerHTML.includes('planBadge');
        });
        await page.close(); await ctx.close();
        if (!hasPlan) throw new Error('no plan badge UI found');
    });

    await browser.close();
    finalize('wizemoney-qa-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
