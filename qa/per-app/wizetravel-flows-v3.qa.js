#!/usr/bin/env node
// WizeTravel — flows v3 (12 more scenarios).
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://travel.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTravel-FlowsV3');

async function fresh(browser, viewport = { width: 1280, height: 800 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(4000);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    await step('Skiplagging / hidden-city warning visible (legal context)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /skiplagging|hidden.city|terms of carriage|warning|אזהרה/i.test(document.body.innerText)
            );
            if (!has) warn('No skiplagging legal-context warning', 'risk: legal');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Best time to book / cheapest months copy', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /cheapest month|best time to book|זול ביותר|melhor época|mejor época/i.test(document.body.innerText)
            );
            if (!has) warn('No best-time-to-book feature', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Visa requirements per country mentioned', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /visa|ויזה|visado|requisitos/i.test(document.body.innerText)
            );
            if (!has) warn('No visa requirements info', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Currency converter / FX rates feature', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /currency|FX|exchange rate|המרת מטבע|cambio|câmbio/i.test(document.body.innerText)
            );
            if (!has) warn('No currency converter feature', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Pet travel info OR allergens info', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /pet|animal|allergen|dog|cat|חיית מחמד/i.test(document.body.innerText)
            );
            if (!has) warn('No pet-travel info', 'niche feature');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Weather forecast per destination mentioned', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /weather|מזג אוויר|tiempo|clima|forecast/i.test(document.body.innerText)
            );
            if (!has) warn('No weather feature mentioned', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Baggage / luggage policy compare', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /baggage|luggage|מטען|equipaje|bagagem/i.test(document.body.innerText)
            );
            if (!has) warn('No baggage policy feature', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Layover / stopover smart info', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /layover|stopover|חניית.ביניים|escala/i.test(document.body.innerText)
            );
            if (!has) warn('No layover/stopover smart info', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Number of routes scanned shown (social proof)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /\d{1,3}(,\d{3})+|millions|מיליון|M\+|נסרקו|scanned/i.test(document.body.innerText)
            );
            if (!has) warn('No "X routes scanned" social proof', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Date flexibility (±3 days) option', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /flexible|±|\+\/-|flexível|flexible dates|תאריכים גמישים/i.test(document.body.innerText)
            );
            if (!has) warn('No date-flexibility feature mentioned', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Streamlit iframe loads (Kiwi or search widget)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const iframeCount = await page.evaluate(() => document.querySelectorAll('iframe').length);
            if (iframeCount === 0) warn('No iframes — Streamlit widget may have failed to load', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mobile (390×844): page renders without crash', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/', { timeout: 45000 });
            await page.waitForTimeout(4000);
            const len = await page.evaluate(() => document.body.innerText.length);
            if (len < 100) throw new Error(`mobile only ${len} chars`);
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizetravel-flows-v3-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
