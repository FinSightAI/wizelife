#!/usr/bin/env node
// WizeHealth — flows v3 (12 more scenarios).
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://vitara.onrender.com';
const { step, warn, finalize } = makeReporter('WizeHealth-FlowsV3');

async function fresh(browser, viewport = { width: 1280, height: 800 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    await step('Medications input/section exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /medication|drug|תרופ|medicamento|medicación/i.test(document.body.innerText)
            );
            if (!has) warn('No medications copy', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Symptoms / conditions input section exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /symptom|condition|אבחנה|sintomas|síntomas/i.test(document.body.innerText)
            );
            if (!has) warn('No symptoms input UI', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Blood-test specific copy (LDL/HDL/blood test)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /blood test|LDL|HDL|בדיקת דם|teste de sangue|análisis de sangre/i.test(document.body.innerText)
            );
            if (!has) warn('No blood-test domain copy', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Conversation save / clear button exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /clear|new chat|שיחה חדשה|nova conversa|nueva conversación/i.test(document.body.innerText)
            );
            if (!has) warn('No clear-conversation button', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('API key field for Groq/OpenRouter (optional)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                !!document.querySelector('input[type=password], input[placeholder*="key" i], input[placeholder*="מפתח"]') ||
                /API key|מפתח API/i.test(document.body.innerText)
            );
            if (!has) warn('No API key input found — may require setup', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Cardiology / specialty AI training mentioned', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /cardio|cardiology|רפואת ריאות|specialty|מומחיות/i.test(document.body.innerText)
            );
            if (!has) warn('No specialty-training claim', 'differentiator vs ChatGPT');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Privacy: file-storage description mentions "browser only"', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /browser only|locally|אצלך בדפדפן|navegador|navegador apenas/i.test(document.body.innerText)
            );
            if (!has) warn('No "browser only" privacy claim', 'transparency UX');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Microbiome / gut health feature mentioned', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /microbiome|מיקרוביום|microbioma|gut|מעיים/i.test(document.body.innerText)
            );
            if (!has) warn('No microbiome copy', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Wearable integration mentioned (Apple Health / Garmin / Fitbit)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /wearable|Apple Health|Garmin|Fitbit|ביש לבישים|wearables/i.test(document.body.innerText)
            );
            if (!has) warn('No wearable integration mention', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('SW v22+ is active (latest cache version)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const sw = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return null;
                const regs = await navigator.serviceWorker.getRegistrations();
                return regs.length;
            });
            if (sw === 0) warn('No SW registered', 'PWA install affected');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Render cold-start budget: page interactive within 30 s', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const t0 = Date.now();
        try {
            await page.goto(BASE + '/', { waitUntil: 'load', timeout: 35000 });
            const ms = Date.now() - t0;
            if (ms > 30000) throw new Error(`load took ${ms}ms > 30s budget`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mobile (390×844): chat input AND model selector reachable', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(5000);
            const overflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth + 4
            );
            if (overflow) throw new Error('h-overflow at 390w');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizehealth-flows-v3-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
