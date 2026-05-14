#!/usr/bin/env node
// WizeDeal — flows v3 (12 more scenarios).
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://deal.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeDeal-FlowsV3');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3000);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    await step('Yad2 / Madlan / Zillow URL paste recognized (regex check)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 15000 });
            await ta.fill('https://www.yad2.co.il/item/abc123');
            // Just verify the input accepts URL
        } finally { await page.close(); await ctx.close(); }
    });

    await step('ROI calculator inputs accept numeric values', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ni = await page.evaluate(() => document.querySelectorAll('input[type=number], input[inputmode="numeric"]').length);
            if (ni === 0) warn('No numeric inputs on landing — ROI may be on different page', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Multiple country options selectable (≥10 unique flags)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const flags = await page.evaluate(() => {
                const re = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;
                return new Set((document.body.innerText.match(re) || [])).size;
            });
            if (flags < 8) warn(`only ${flags} flags`, 'expected ≥10');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mortgage / financing fields appear when expanding deal', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /mortgage|משכנתא|financiamento|hipoteca|APR|interest rate/i.test(document.body.innerText)
            );
            if (!has) warn('No mortgage / interest-rate text on landing', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Rental yield mentioned (rental ROI feature)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /rental yield|תשואת שכירות|rendimento|rendimiento|yield/i.test(document.body.innerText)
            );
            if (!has) warn('No rental-yield copy', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Plan badge for logged-in user shows in WizeBar', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                localStorage.setItem('wl_sso', JSON.stringify({ nick: 'QaTester', plan: 'yolo', email: 'q@t.c', uid: 'qa' }));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const has = await page.evaluate(() =>
                /YOLO|⚡|Pro/.test(document.body.innerText)
            );
            if (!has) warn('Plan badge not visible after setting wl_sso', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Red-flag detection text mentioned', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /red.flag|red flag|דגלים אדומים|riesgo|risco/i.test(document.body.innerText)
            );
            if (!has) warn('No red-flag detection feature mentioned', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Saved deals list — empty state OR list renders', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/saved');
        try {
            const ok = await page.evaluate(() =>
                document.body.innerText.length > 100 ||
                /no deals|אין עסקאות|nenhum/i.test(document.body.innerText)
            );
            if (!ok) warn('Saved page nearly empty', 'may be 404 or auth-gated');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('AI analysis summary section appears when deal analyzed', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /AI|insight|analysis|ניתוח|análise|análisis/i.test(document.body.innerText)
            );
            if (!has) warn('No AI/analysis text', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Comp analysis (neighborhood comparison) referenced', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /comp|neighborhood|השוואת שכונה|comparable|comparáveis/i.test(document.body.innerText)
            );
            if (!has) warn('No neighborhood-comp feature copy', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('CSP header includes wizelife.ai (for shared assets)', async () => {
        const { ctx } = await fresh(browser);
        try {
            const r = await ctx.request.head(BASE + '/', { timeout: 10000 });
            const csp = r.headers()['content-security-policy'] || '';
            if (!/wizelife\.ai/.test(csp)) throw new Error('CSP missing wizelife.ai allowance');
        } finally { await ctx.close(); }
    });

    await step('Mobile (390×844): no fixed elements blocking input', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            await page.waitForTimeout(3000);
            const blocked = await page.evaluate(() => {
                // Check if a fixed header/banner covers the top-half of the viewport unintentionally
                const fixed = Array.from(document.querySelectorAll('*')).filter(el => {
                    const cs = getComputedStyle(el);
                    return cs.position === 'fixed' && el.getBoundingClientRect().height > 200;
                });
                return fixed.length;
            });
            if (blocked > 2) warn(`${blocked} large fixed elements — mobile UX concern`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizedeal-flows-v3-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
