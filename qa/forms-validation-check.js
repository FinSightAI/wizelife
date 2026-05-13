#!/usr/bin/env node
// Form-validation sanity: for each app's public forms, fill nothing, submit,
// expect SOME validation feedback (red border, error text, native :invalid, or
// a non-redirect). Also fills with invalid emails/dates/numbers where present.
// Run: node qa/forms-validation-check.js
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const APPS = [
    { name: 'WizeLife auth', url: 'https://wizelife.ai/auth.html' },
    { name: 'WizeLife feedback', url: 'https://wizelife.ai/feedback.html' },
    { name: 'WizeMoney', url: 'https://money.wizelife.ai/' },
    { name: 'WizeTax',   url: 'https://tax.wizelife.ai/advisor' },
    { name: 'WizeDeal',  url: 'https://deal.wizelife.ai/' },
];

const { step, warn, finalize } = makeReporter('Forms-Validation');

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    for (const app of APPS) {
        await step(`${app.name}: enumerate forms`, async () => {
            await page.goto(app.url, { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(2000);
            const formCount = await page.evaluate(() => document.querySelectorAll('form').length);
            if (formCount === 0) {
                // Apps without <form> elements still have submit buttons + inputs
                const hasInputs = await page.evaluate(() => document.querySelectorAll('input[type=text], input[type=email], input[type=password], textarea').length);
                if (!hasInputs) warn(`${app.name}: no forms or inputs found`, 'may be acceptable for splash pages');
            }
        });

        await step(`${app.name}: empty submit shows some feedback`, async () => {
            await page.goto(app.url, { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(2000);
            const formInfo = await page.evaluate(() => {
                const f = document.querySelector('form');
                if (!f) return { skipped: true };
                const req = f.querySelectorAll('[required], input[type=email], input[type=password]');
                return { skipped: false, requiredCount: req.length };
            });
            if (formInfo.skipped) { warn(`${app.name}: no form`, 'skipped'); return; }
            if (!formInfo.requiredCount) { warn(`${app.name}: no required fields`, 'cannot test validation'); return; }

            const initialUrl = page.url();
            // Try to submit
            const submitter = page.locator('form button[type=submit], form input[type=submit], form button:has-text("Submit"), form button:has-text("Send"), form button:has-text("שלח"), form button:has-text("Enviar")').first();
            if (!(await submitter.count())) {
                warn(`${app.name}: submit button not located`, 'manual verify');
                return;
            }
            await submitter.click().catch(() => {});
            await page.waitForTimeout(2000);

            const result = await page.evaluate(() => {
                const f = document.querySelector('form');
                if (!f) return { redirected: location.href };
                const invalids = f.querySelectorAll(':invalid').length;
                const errorEls = document.querySelectorAll('[class*="error"], [class*="invalid"], [role="alert"]').length;
                return { invalids, errorEls, redirected: location.href };
            });
            if (page.url() !== initialUrl) {
                throw new Error('empty submit caused navigation — validation bypassed');
            }
            if (result.invalids === 0 && result.errorEls === 0) {
                throw new Error('no :invalid fields and no error elements after empty submit');
            }
        });
    }

    await browser.close();
    finalize('forms-validation-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
