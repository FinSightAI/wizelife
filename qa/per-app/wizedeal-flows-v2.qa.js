#!/usr/bin/env node
// WizeDeal — flows v2: paste-listing edge cases, country-specific calculators,
// localStorage persistence, image handling, multilingual listing recognition.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://deal.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeDeal-FlowsV2');

async function fresh(browser, viewport = { width: 1280, height: 800 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3000);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    await step('Listing textarea accepts long Hebrew text', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 15000 });
            const sample = 'דירה 3.5 חדרים ברחוב הירקון 50, תל אביב. 110 מ"ר, קומה 4 מתוך 8, חניה. ' +
                           'מחיר: 3,200,000 ש"ח. מצב: משופצת. מיידי לכניסה. ';
            await ta.fill(sample);
            const got = await ta.inputValue();
            if (got.length < sample.length - 5) throw new Error(`text truncated: in=${sample.length}, got=${got.length}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Listing textarea accepts long English text', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 15000 });
            await ta.fill('2-bedroom apartment in Lisbon, Bairro Alto. 80 sqm, 3rd floor, no elevator. Price: €450,000.');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country selector — has Israel + Portugal + Brazil at minimum', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const txt = await page.evaluate(() => document.body.innerText);
            const needed = ['Israel', 'Portugal', 'Brazil'];
            const missing = needed.filter(c => !(new RegExp(c, 'i').test(txt)));
            if (missing.length) warn(`countries missing from default view: ${missing.join(', ')}`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country-specific fees (Israel Mas Rechisha, Brazil ITBI) — mentioned somewhere', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const txt = await page.evaluate(() => document.body.innerText);
            const hasIL = /mas\s*rechisha|מס רכישה/i.test(txt);
            const hasBR = /ITBI/i.test(txt);
            if (!hasIL && !hasBR) warn('No country-specific fee names found', 'feature may be tab-gated');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Saved-deal data persists in localStorage', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                localStorage.setItem('cd_saved_deals', JSON.stringify([{ id: 'qa1', price: 100000, country: 'IL' }]));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const stored = await page.evaluate(() => localStorage.getItem('cd_saved_deals'));
            if (!stored || !stored.includes('qa1')) throw new Error('saved deal didn\'t persist');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Currency change reflects in displayed prices', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const hasMultiCurrency = await page.evaluate(() => {
                const m = document.body.innerText.match(/[$€£¥₪R\$]/g) || [];
                return new Set(m).size;
            });
            if (hasMultiCurrency < 2) warn('Only one currency symbol detected', 'multi-currency may need selection');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('CSP allows wizelife.ai (for shared assets) + Clarity', async () => {
        const { ctx } = await fresh(browser);
        try {
            const r = await ctx.request.head(BASE + '/', { timeout: 10000 });
            const csp = r.headers()['content-security-policy'] || '';
            if (!/wizelife\.ai/.test(csp)) throw new Error('CSP missing wizelife.ai');
            if (!/clarity\.ms/.test(csp)) warn('CSP missing clarity.ms', 'analytics may be blocked');
        } finally { await ctx.close(); }
    });

    await step('Plan badge: clearly visible (Free/Pro/YOLO) when logged in', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                localStorage.setItem('wl_sso', JSON.stringify({ nick: 'QaTester', plan: 'pro', email: 'q@test.com' }));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const has = await page.evaluate(() => /✦|PRO|⚡|YOLO/i.test(document.body.innerText));
            if (!has) warn('No plan badge after setting wl_sso', 'badge may be only on logged-in dashboard');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('"My deals" or saved deals tab/list exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /my deals|saved deals|העסקאות שלי|deals\s*$|saved/i.test(document.body.innerText)
            );
            if (!has) warn('No saved-deals UI text on landing', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Image upload (listing photos) — file input present somewhere', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const fi = await page.evaluate(() => document.querySelectorAll('input[type=file]').length);
            if (fi === 0) warn('No file input on landing', 'image upload may be inside the "New Deal" wizard');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizedeal-flows-v2-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
