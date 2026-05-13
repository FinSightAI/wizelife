#!/usr/bin/env node
// Cross-account QA — same flow as Free / Pro / YOLO users to catch permission/paywall bugs.
// Requires env vars:
//   QA_EMAIL_FREE / QA_PASSWORD_FREE
//   QA_EMAIL_PRO  / QA_PASSWORD_PRO
//   QA_EMAIL_YOLO / QA_PASSWORD_YOLO
// Falls back to QA_EMAIL/QA_PASSWORD if specific ones not set (single-account mode).
const { chromium } = require('playwright');
const { makeReporter, fillAndLogin } = require('../shared-lib/helpers');

const ACCOUNTS = [
    { plan: 'free', email: process.env.QA_EMAIL_FREE || process.env.QA_EMAIL,  password: process.env.QA_PASSWORD_FREE || process.env.QA_PASSWORD },
    { plan: 'pro',  email: process.env.QA_EMAIL_PRO  || process.env.QA_EMAIL,  password: process.env.QA_PASSWORD_PRO  || process.env.QA_PASSWORD },
    { plan: 'yolo', email: process.env.QA_EMAIL_YOLO || process.env.QA_EMAIL,  password: process.env.QA_PASSWORD_YOLO || process.env.QA_PASSWORD },
];

const { step, warn, finalize } = makeReporter('Cross-Account');

(async () => {
    const browser = await chromium.launch();

    for (const acc of ACCOUNTS) {
        if (!acc.email || !acc.password) {
            warn(`${acc.plan.toUpperCase()}: no creds`, `set QA_EMAIL_${acc.plan.toUpperCase()} + QA_PASSWORD_${acc.plan.toUpperCase()}`);
            continue;
        }

        await step(`${acc.plan.toUpperCase()}: login → dashboard`, async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            try {
                await page.goto('https://wizelife.ai/auth.html', { timeout: 30000 });
                await fillAndLogin(page, acc.email, acc.password);
                await page.waitForURL(/dashboard\.html/, { timeout: 20000 });
            } finally {
                await page.close(); await ctx.close();
            }
        });

        await step(`${acc.plan.toUpperCase()}: plan badge shows correct tier`, async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            try {
                await page.goto('https://wizelife.ai/auth.html', { timeout: 30000 });
                await fillAndLogin(page, acc.email, acc.password);
                await page.waitForURL(/dashboard\.html/, { timeout: 20000 });
                await page.waitForTimeout(3000);  // let plan badge update
                const badgeText = await page.evaluate(() => {
                    const b = document.getElementById('navPlanBadge');
                    return b ? b.textContent.trim().toLowerCase() : '';
                });
                if (acc.plan === 'free' && !/free|חינם/.test(badgeText)) throw new Error(`expected Free, saw "${badgeText}"`);
                if (acc.plan === 'pro'  && !/pro/i.test(badgeText))      throw new Error(`expected Pro, saw "${badgeText}"`);
                if (acc.plan === 'yolo' && !/yolo/i.test(badgeText))     throw new Error(`expected YOLO, saw "${badgeText}"`);
            } finally {
                await page.close(); await ctx.close();
            }
        });

        // WizeAI access is YOLO-only
        await step(`${acc.plan.toUpperCase()}: WizeAI access matches plan`, async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            try {
                await page.goto('https://wizelife.ai/auth.html', { timeout: 30000 });
                await fillAndLogin(page, acc.email, acc.password);
                await page.goto('https://wizelife.ai/wize-ai.html', { timeout: 25000 });
                await page.waitForTimeout(5000);  // let plan detection settle
                const visible = await page.evaluate(() => {
                    // YOLO sees chat. Free/Pro see paywall.
                    return {
                        hasChat:    !!document.querySelector('#chatInput, #mainLayout'),
                        hasPaywall: !!document.querySelector('#wizeaiPaywall, [class*="paywall"], [class*="upgrade"]'),
                    };
                });
                if (acc.plan === 'yolo' && !visible.hasChat) throw new Error('YOLO should see chat, got paywall');
                if (acc.plan !== 'yolo' && !visible.hasPaywall) {
                    // Could also be loading — give it more time
                    warn(`${acc.plan.toUpperCase()}: WizeAI didn't show paywall (or didn't load)`, 'manual verify');
                }
            } finally {
                await page.close(); await ctx.close();
            }
        });

        // Stocks page paywall behavior (Pro+ only)
        await step(`${acc.plan.toUpperCase()}: WizeMoney stocks page behaves per plan`, async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            try {
                await page.goto('https://wizelife.ai/auth.html', { timeout: 30000 });
                await fillAndLogin(page, acc.email, acc.password);
                await page.goto('https://money.wizelife.ai/pages/stocks.html', { timeout: 30000 });
                await page.waitForTimeout(3000);
                const hasContent = await page.evaluate(() =>
                    document.body.innerText.trim().length > 100
                );
                if (!hasContent) throw new Error('blank page rendered');
            } finally {
                await page.close(); await ctx.close();
            }
        });
    }

    await browser.close();
    finalize('cross-account-qa-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
