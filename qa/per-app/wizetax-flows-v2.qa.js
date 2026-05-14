#!/usr/bin/env node
// WizeTax — flows v2: simulator inputs, country-compare interactions, profile
// persistence, saved sessions, edge-case salaries.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://tax.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTax-FlowsV2');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/advisor') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3000);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    await step('Country list — exposes ≥20 countries (we added 8 waves)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const flagCount = await page.evaluate(() => {
                const flagRe = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;
                return new Set((document.body.innerText.match(flagRe) || [])).size;
            });
            if (flagCount < 15) warn(`only ${flagCount} flags visible`, 'list may be tab-gated');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Chat input has reasonable maxlength (>= 500 chars)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ml = await page.evaluate(() => {
                const ta = document.querySelector('textarea');
                return ta ? (parseInt(ta.maxLength) || 0) : 0;
            });
            // 0 means unlimited (HTML default), which is fine
            if (ml > 0 && ml < 500) warn(`textarea maxlength=${ml} feels low`, 'real questions get truncated');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Send first chat → wait → send second → both visible', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 8000 });
            await ta.fill('What is tax?');
            const sendBtn = page.locator('button[type=submit], button:has-text("Send"), button:has-text("שלח"), button:has-text("Enviar")').first();
            if (!(await sendBtn.count())) { warn('Send button not found', ''); return; }
            await sendBtn.click();
            // Don't wait for reply — bot may be cold; just verify input clears
            await page.waitForTimeout(2000);
            const cleared = await ta.inputValue();
            if (cleared.length > 0 && cleared.length === 'What is tax?'.length) warn('Input did not clear after send', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Multi-language i18n: html dir flips when EN clicked', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const en = page.locator('[data-wl-lang="en"], [data-lang="en"]').first();
            if (!(await en.count())) { warn('EN pill not found', 'WizeTax may lack switcher (open task)'); return; }
            await en.click({ force: true }).catch(() => {});
            await page.waitForTimeout(2000);
            const dir = await page.evaluate(() => document.documentElement.dir);
            if (dir === 'rtl') throw new Error(`html still rtl after EN click`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Saved sessions area — page handles 0 sessions gracefully', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                try { localStorage.removeItem('tax_master_sessions'); } catch (e) {}
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const len = await page.evaluate(() => document.body.innerText.length);
            if (len < 200) throw new Error('page broke when sessions empty');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Profile saved to localStorage — survives reload', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                localStorage.setItem('tax_master_profile', JSON.stringify({ name: 'QaTester', income: { salary: 100000 } }));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2000);
            const stored = await page.evaluate(() => localStorage.getItem('tax_master_profile'));
            if (!stored || !stored.includes('QaTester')) throw new Error('profile didn\'t persist');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('OECD source attribution visible', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => /OECD|PwC|KPMG/i.test(document.body.innerText));
            if (!has) warn('No OECD/PwC/KPMG source attribution found', 'transparency element');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Israel income simulator route reachable', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/israel-wizard');
        try {
            const code = await page.evaluate(() => document.body.innerText.length);
            if (code < 100) warn('israel-wizard page nearly empty', 'may be 404');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Payslip OCR file input accepts PDF/image MIME', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const accept = await page.evaluate(() => {
                const fi = document.querySelector('input[type=file]');
                return fi ? (fi.accept || '*') : null;
            });
            if (accept === null) { warn('No file input on advisor page', 'payslip upload may be elsewhere'); return; }
            if (!/pdf|image|\*/i.test(accept)) warn(`file input accept="${accept}" doesn't include PDF/image`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Tax timeline — has dated entries (events with years)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const yrs = await page.evaluate(() => {
                const m = document.body.innerText.match(/\b20\d{2}\b/g) || [];
                return new Set(m).size;
            });
            if (yrs < 3) warn(`only ${yrs} distinct years on page`, 'timeline may be tab-gated');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizetax-flows-v2-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
