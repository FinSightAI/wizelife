#!/usr/bin/env node
// Paywall + plan-gating: for each Pro-only feature on each app, verify that
//   - Free user sees the paywall / upgrade prompt
//   - Pro user actually accesses the feature
//   - YOLO user (where relevant — WizeAI) accesses it
// Requires test accounts:
//   QA_EMAIL_FREE / QA_PASSWORD_FREE
//   QA_EMAIL_PRO  / QA_PASSWORD_PRO
//   QA_EMAIL_YOLO / QA_PASSWORD_YOLO
// Skips silently when creds missing.
const { chromium } = require('playwright');
const { makeReporter, fillAndLogin } = require('./shared-lib/helpers');

const PRO_FEATURES = [
    // [name, plan-needed, URL after login, paywall-indicator-selector, content-indicator-selector]
    ['WizeMoney stocks',          'pro',  'https://money.wizelife.ai/pages/stocks.html',          '[class*="paywall"], [class*="upgrade"], :has-text("Upgrade")', '[class*="stock"], canvas, table'],
    ['WizeMoney compare funds',   'pro',  'https://money.wizelife.ai/pages/compare-funds.html',   '[class*="paywall"], [class*="upgrade"]', 'table, [class*="fund"], canvas'],
    ['WizeMoney simulator',       'pro',  'https://money.wizelife.ai/pages/simulator.html',       '[class*="paywall"], [class*="upgrade"]', 'canvas, [class*="result"]'],
    ['WizeMoney tax optimizer',   'pro',  'https://money.wizelife.ai/pages/tax-optimizer.html',   '[class*="paywall"], [class*="upgrade"]', '[class*="optim"], table'],
    ['WizeMoney pension',         'pro',  'https://money.wizelife.ai/pages/gemel.html',           '[class*="paywall"], [class*="upgrade"]', '[class*="pension"], [class*="fund"]'],
    ['WizeAI chat',               'yolo', 'https://wizelife.ai/wize-ai.html',                     '[class*="paywall"], [class*="upgrade"], #wizeaiPaywall', '#chatInput, #mainLayout, [class*="chat"]'],
];

const ACCOUNTS = {
    free: { email: process.env.QA_EMAIL_FREE, password: process.env.QA_PASSWORD_FREE },
    pro:  { email: process.env.QA_EMAIL_PRO,  password: process.env.QA_PASSWORD_PRO },
    yolo: { email: process.env.QA_EMAIL_YOLO, password: process.env.QA_PASSWORD_YOLO },
};

const { step, warn, finalize } = makeReporter('Paywall-Flows');

async function loginAs(browser, plan) {
    const acc = ACCOUNTS[plan];
    if (!acc.email || !acc.password) return null;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('https://wizelife.ai/auth.html?_t=' + Date.now(), { timeout: 30000 });
    await fillAndLogin(page, acc.email, acc.password);
    await page.waitForURL(/dashboard\.html/, { timeout: 30000 });
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();
    const missing = Object.entries(ACCOUNTS).filter(([k, v]) => !v.email).map(([k]) => k);
    if (missing.length === 3) {
        warn('all account credentials missing', 'set QA_EMAIL_{FREE,PRO,YOLO} + passwords to run');
        finalize('paywall-flows-report.md');
        return;
    }

    for (const [name, needed, url, paywallSel, contentSel] of PRO_FEATURES) {
        for (const plan of ['free', 'pro', 'yolo']) {
            const acc = ACCOUNTS[plan];
            if (!acc.email) continue;

            const session = await loginAs(browser, plan);
            if (!session) continue;
            const { ctx, page } = session;

            await step(`${name} — ${plan.toUpperCase()} user behaves correctly`, async () => {
                try {
                    await page.goto(url, { timeout: 35000 });
                } catch (e) { throw new Error('navigation failed: ' + e.message.slice(0, 80)); }
                await page.waitForTimeout(5000);

                const seenPaywall = await page.locator(paywallSel).first().isVisible({ timeout: 2000 }).catch(() => false);
                const seenContent = await page.locator(contentSel).first().isVisible({ timeout: 2000 }).catch(() => false);

                // Plan hierarchy: yolo >= pro >= free
                // Free should see paywall on pro+ features; pro should see pro content but YOLO paywall on yolo features
                const shouldSeeContent = (plan === 'yolo') ||
                    (plan === 'pro' && needed === 'pro') ||
                    false;
                const shouldSeePaywall = !shouldSeeContent;

                if (shouldSeePaywall && !seenPaywall) {
                    throw new Error(`${plan} expected paywall, saw none (content=${seenContent})`);
                }
                if (shouldSeeContent && !seenContent) {
                    throw new Error(`${plan} expected content, didn't see it (paywall=${seenPaywall})`);
                }
            });

            await ctx.close();
        }
    }

    await browser.close();
    finalize('paywall-flows-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
