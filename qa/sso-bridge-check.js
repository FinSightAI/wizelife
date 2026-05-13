#!/usr/bin/env node
// SSO bridge: when a signed-in user clicks an app card on the WizeLife
// dashboard, the link should carry wl_token + wl_nick + wl_plan query params,
// and the destination app should read them.
// Run: QA_EMAIL_PRO=... QA_PASSWORD_PRO=... node qa/sso-bridge-check.js
const { chromium } = require('playwright');
const { makeReporter, fillAndLogin } = require('./shared-lib/helpers');

const EMAIL    = process.env.QA_EMAIL_PRO    || process.env.QA_EMAIL    || '';
const PASSWORD = process.env.QA_PASSWORD_PRO || process.env.QA_PASSWORD || '';

const APPS = [
    { name: 'WizeMoney',  expectedHost: 'money.wizelife.ai' },
    { name: 'WizeTax',    expectedHost: 'tax.wizelife.ai' },
    { name: 'WizeDeal',   expectedHost: 'deal.wizelife.ai' },
    { name: 'WizeTravel', expectedHost: 'travel.wizelife.ai' },
    { name: 'WizeHealth', expectedHost: 'health.wizelife.ai' },
];

const { step, warn, finalize } = makeReporter('SSO-Bridge');

(async () => {
    if (!EMAIL || !PASSWORD) {
        warn('skipped — no QA_EMAIL_PRO / QA_PASSWORD_PRO env vars', 'set creds + re-run');
        finalize('sso-bridge-report.md');
        return;
    }
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    await step('login + reach dashboard', async () => {
        await page.goto('https://wizelife.ai/auth.html?_t=' + Date.now(), { timeout: 30000 });
        await fillAndLogin(page, EMAIL, PASSWORD);
        await page.waitForURL(/dashboard\.html/, { timeout: 30000 });
    });

    await step('dashboard injects wl_token into app links', async () => {
        await page.waitForTimeout(3000);
        const hrefs = await page.evaluate((apps) => {
            const out = {};
            apps.forEach(a => {
                const links = Array.from(document.querySelectorAll(`a[href*="${a.expectedHost}"]`));
                if (links.length) out[a.name] = links[0].href;
            });
            return out;
        }, APPS);
        const missing = APPS.filter(a => !hrefs[a.name] || !/wl_token=/.test(hrefs[a.name]));
        if (missing.length === APPS.length) {
            throw new Error('No app links contain wl_token — SSO injection broken');
        }
        if (missing.length) {
            throw new Error(`Missing wl_token on: ${missing.map(a => a.name).join(', ')}`);
        }
    });

    for (const app of APPS) {
        await step(`${app.name}: clicking card lands on app with token in URL or storage`, async () => {
            await page.goto('https://wizelife.ai/dashboard.html', { timeout: 30000 });
            await page.waitForTimeout(3000);
            const link = page.locator(`a[href*="${app.expectedHost}"]`).first();
            if (!(await link.count())) throw new Error('app card link missing');
            const [popup] = await Promise.all([
                page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
                link.click(),
            ]);
            const target = popup || page;
            try { await target.waitForLoadState('load', { timeout: 30000 }); } catch (e) {}
            await target.waitForTimeout(2000);
            const reachable = target.url().includes(app.expectedHost);
            if (!reachable) throw new Error(`expected URL on ${app.expectedHost}, got ${target.url()}`);
            // Either the URL has wl_token OR storage carries wl_sso (some apps clean URL on read)
            const hasContext = await target.evaluate(() => {
                if (/wl_token=/.test(location.href)) return true;
                try {
                    return !!(localStorage.getItem('wl_sso') || localStorage.getItem('wl_token') || localStorage.getItem('wl_plan'));
                } catch (e) { return false; }
            }).catch(() => false);
            if (!hasContext) throw new Error('no wl_token in URL or wl_sso in storage — SSO not received');
            if (popup) await popup.close();
        });
    }

    await browser.close();
    finalize('sso-bridge-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
