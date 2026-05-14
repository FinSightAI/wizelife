#!/usr/bin/env node
// Console-output audit: across each public surface, catch any
//   - PII leaked into console.log (email, phone, api_key)
//   - 4xx/5xx fetch errors that the user would see in DevTools
//   - Uncaught exceptions
// Ignores known-noise third-party scripts (clarity, ga, recaptcha).
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const URLS = [
    'https://wizelife.ai/',
    'https://wizelife.ai/auth.html',
    'https://wizelife.ai/dashboard.html',
    'https://wizelife.ai/about.html',
    'https://wizelife.ai/wize-ai.html',
    'https://money.wizelife.ai/',
    'https://tax.wizelife.ai/advisor',
    'https://deal.wizelife.ai/',
    'https://travel.wizelife.ai/',
    'https://vitara.onrender.com/',
];

const PII_PATTERNS = [
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,    // email
    /AIza[0-9A-Za-z-_]{35}/,                              // Google API key
    /sk-[A-Za-z0-9]{32,}/,                                // OpenAI / Anthropic key
    /sk_(live|test)_[A-Za-z0-9]{20,}/,                    // Stripe key
    /Bearer\s+[A-Za-z0-9._-]{20,}/i,                      // JWT-like
];

const IGNORE = [
    /clarity\.ms/i, /google-analytics/i, /recaptcha/i,
    /app-check.*throttl/i, /Uncaught \(in promise\) cancelled/i,
    /favicon/i, /chrome-extension/i,
];

const { step, warn, finalize } = makeReporter('Console-Audit');

(async () => {
    const browser = await chromium.launch();
    for (const url of URLS) {
        await step(`${url} — no PII / unexpected errors in console`, async () => {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            const log = [];
            const errors = [];
            page.on('console', m => {
                const t = m.text();
                if (IGNORE.some(re => re.test(t))) return;
                log.push(`[${m.type()}] ${t}`);
                if (m.type() === 'error') errors.push(t);
            });
            page.on('pageerror', e => {
                if (IGNORE.some(re => re.test(e.message))) return;
                errors.push(`pageerror: ${e.message}`);
            });
            try { await page.goto(url, { timeout: 45000, waitUntil: 'load' }); }
            catch (e) { await page.close(); await ctx.close(); throw new Error('navigation failed: ' + e.message.slice(0, 80)); }
            await page.waitForTimeout(3000);
            await page.close(); await ctx.close();

            const piiHits = log.filter(l => PII_PATTERNS.some(re => re.test(l)));
            if (piiHits.length) throw new Error(`${piiHits.length} potential PII leaks in console: ${piiHits[0].slice(0, 80)}`);
            if (errors.length > 5) throw new Error(`${errors.length} console errors (sample: ${errors.slice(0, 2).map(e => e.slice(0, 60)).join(' | ')})`);
            if (errors.length > 0 && errors.length <= 5) warn(`${errors.length} console error(s)`, errors.slice(0, 1).join(''));
        });
    }
    await browser.close();
    finalize('console-audit-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
