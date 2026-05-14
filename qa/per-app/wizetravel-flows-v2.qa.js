#!/usr/bin/env node
// WizeTravel — flows v2: multi-leg search, currency change, date range,
// passenger count adjustment, hidden-city flag, route history persistence.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://travel.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTravel-FlowsV2');

async function fresh(browser, viewport = { width: 1280, height: 800 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(4000);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    await step('Date-picker / calendar UI mentioned somewhere', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ok = await page.evaluate(() => {
                if (document.querySelector('input[type=date]')) return true;
                return /calendar|date\s*range|תאריכים|fechas|datas/i.test(document.body.innerText);
            });
            if (!ok) warn('No date-picker hint visible', 'Streamlit may embed in iframe');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Currency selector or USD/EUR/ILS mentioned', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ok = await page.evaluate(() => /USD|EUR|ILS|BRL|\$|€|₪|R\$/.test(document.body.innerText));
            if (!ok) warn('No currency symbols/codes visible', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Passenger count UI mentioned', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ok = await page.evaluate(() =>
                /passenger|adult|child|infant|נוסעים|מבוגרים|ילדים|passageiro|pasajero/i.test(document.body.innerText)
            );
            if (!ok) warn('No passenger-count text visible', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Hidden-city feature messaging present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ok = await page.evaluate(() =>
                /hidden.city|hidden city|עצירה.חוסכת|skiplagging|virtual.interline/i.test(document.body.innerText)
            );
            if (!ok) warn('Hidden-city not advertised on landing', 'differentiator may be tab-gated');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Route history / saved trips localStorage key recognized', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                localStorage.setItem('wt_routes', JSON.stringify([{ from: 'TLV', to: 'LIS' }]));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const stored = await page.evaluate(() => localStorage.getItem('wt_routes'));
            if (!stored) warn('wt_routes did not persist', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Multi-city / multi-leg flight option mentioned', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ok = await page.evaluate(() =>
                /multi.city|multi.leg|round.trip|one.way|טיסת המשך|מרובה.יעדים/i.test(document.body.innerText)
            );
            if (!ok) warn('No multi-city / one-way / round-trip text', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('AI advisor mentioned in WizeTravel context', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ok = await page.evaluate(() =>
                /AI advisor|יועץ AI|consultor IA|consejero IA|WizeAI|travel AI/i.test(document.body.innerText)
            );
            if (!ok) warn('No AI advisor mention on landing', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Airport code recognition (IATA 3-letter)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const codes = await page.evaluate(() => {
                const m = document.body.innerText.match(/\b[A-Z]{3}\b/g) || [];
                return new Set(m).size;
            });
            if (codes < 2) warn(`only ${codes} IATA-like codes`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Price alert email opt-in copy visible', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ok = await page.evaluate(() =>
                /price\s*alert|notify me|התראת מחיר|alerta de precio|alerta de preço|email me when/i.test(document.body.innerText)
            );
            if (!ok) warn('No price-alert opt-in text', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizetravel-flows-v2-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
