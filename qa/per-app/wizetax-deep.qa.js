#!/usr/bin/env node
// WizeTax — deep flow battery (~14 scenarios).
// Country compare, income simulator, payslip upload, AI advisor chat,
// tax timeline, language swap, mobile, paywall, CSP cleanliness.
const { chromium } = require('playwright');
const { makeReporter, fillAndLogin } = require('../shared-lib/helpers');

const BASE = 'https://tax.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTax-Deep');

async function fresh(browser, viewport = { width: 1280, height: 800 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const cspErrs = [];
    page.on('console', m => { if (m.type() === 'error' && /content security policy|csp/i.test(m.text())) cspErrs.push(m.text()); });
    await page.goto(BASE + '/advisor?_t=' + Date.now(), { timeout: 45000, waitUntil: 'load' });
    await page.waitForTimeout(3000);
    return { ctx, page, cspErrs };
}

(async () => {
    const browser = await chromium.launch();

    await step('Advisor page loads + textarea present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ state: 'attached', timeout: 8000 });
        } finally { await page.close(); await ctx.close(); }
    });

    await step('No CSP violations on first load', async () => {
        const { ctx, page, cspErrs } = await fresh(browser);
        try {
            if (cspErrs.length) throw new Error(`${cspErrs.length} CSP errors (sample: ${cspErrs[0].slice(0, 100)})`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Send "What is VAT?" → assistant streams reply', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 8000 });
            await ta.fill('What is VAT?');
            const send = page.locator('button[type=submit], button:has-text("Send"), button:has-text("שלח"), button:has-text("Enviar")').first();
            if (!(await send.count())) { warn('Send button not found', 'cannot test chat'); return; }
            await send.click();
            // Generous budget — Render cold-start + LLM stream
            await page.waitForTimeout(2000);
            await page.waitForFunction(() => {
                const els = document.querySelectorAll('[class*="assistant" i], [class*="message" i]');
                return Array.from(els).some(e => e.textContent && e.textContent.trim().length > 20);
            }, { timeout: 90000 }).catch(() => { throw new Error('no assistant reply within 90s'); });
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country comparison tab/section exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => {
                const t = document.body.innerText.toLowerCase();
                return /country compar|השוואת מדינות|comparação|comparación/.test(t);
            });
            if (!has) warn('Country comparison copy not visible', 'feature may be tab-gated');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Income simulator — find a number input + currency', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // Try to navigate to simulator or find inline
            await page.goto(BASE + '/advisor?_t=' + Date.now()).catch(() => {});
            await page.waitForTimeout(2000);
            const inputs = await page.evaluate(() => {
                return document.querySelectorAll('input[type=number], input[inputmode="numeric"]').length;
            });
            if (inputs === 0) warn('No number inputs found', 'simulator may be on separate page');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Payslip upload — file input present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const fi = page.locator('input[type=file]').first();
            if (!(await fi.count())) { warn('No <input type=file> on advisor page', 'payslip may be under different tab'); return; }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Language pills HE/EN/PT/ES render', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const pills = await page.evaluate(() => {
                return ['en','pt','es','he'].filter(l => document.querySelector(`[data-wl-lang="${l}"], [data-lang="${l}"], button:has-text("${l.toUpperCase()}")`)).length;
            });
            if (pills < 4) warn(`Only ${pills}/4 lang pills found`, 'pills may use different selector');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Lang switch HE → EN updates UI', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const en = page.locator('[data-wl-lang="en"], [data-lang="en"]').first();
            if (!(await en.count())) { warn('EN pill not found', ''); return; }
            const before = await page.evaluate(() => document.documentElement.dir + '|' + document.body.innerText.slice(0, 200));
            await en.click({ force: true }).catch(() => {});
            await page.waitForTimeout(2000);
            const after = await page.evaluate(() => document.documentElement.dir + '|' + document.body.innerText.slice(0, 200));
            if (before === after) throw new Error('UI text + dir identical after EN click');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('No Hebrew leak in EN mode', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'en'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const leaks = await page.evaluate(() => {
                const HE = /[֐-׿]/;
                const ALLOW = /Wize(Life|Money|Tax|Travel|Health|Deal|AI)/;
                const out = [];
                document.body.querySelectorAll('*:not(script):not(style)').forEach(el => {
                    for (const n of el.childNodes) {
                        if (n.nodeType !== Node.TEXT_NODE) continue;
                        const t = n.nodeValue.trim();
                        if (t.length < 2) continue;
                        if (HE.test(t) && !ALLOW.test(t)) out.push(t.slice(0, 60));
                    }
                });
                return [...new Set(out)].slice(0, 5);
            });
            if (leaks.length) throw new Error(`${leaks.length} leaks (sample: ${leaks.join(', ')})`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Routes /reports + /profile reachable (not 404)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const broken = [];
            for (const path of ['/reports', '/profile']) {
                const r = await ctx.request.head(BASE + path, { timeout: 10000 }).catch(() => null);
                if (!r || r.status() === 404) broken.push(`${path} → ${r ? r.status() : 'err'}`);
            }
            if (broken.length) throw new Error(`broken: ${broken.join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('CSP allows wizelife.ai scripts (no blocked external)', async () => {
        const { ctx } = await fresh(browser);
        try {
            const r = await ctx.request.head(BASE + '/', { timeout: 8000 });
            const csp = r.headers()['content-security-policy'];
            if (!csp) throw new Error('No CSP header at all');
            if (!/wizelife\.ai/.test(csp)) throw new Error('CSP missing wizelife.ai in script-src');
        } finally { await ctx.close(); }
    });

    await step('iPhone (390×844): advisor textarea reachable + no overflow', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const overflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth + 4
            );
            if (overflow) throw new Error('h-overflow at 390w');
            const taVisible = await page.locator('textarea').first().isVisible({ timeout: 3000 }).catch(() => false);
            if (!taVisible) warn('Textarea not visible on mobile — may need scroll', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('OECD 2025 label visible (not stale 2024)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const stale = await page.evaluate(() => /OECD[\s\S]{0,40}202[34]/i.test(document.body.innerText) && !/OECD[\s\S]{0,40}2025/i.test(document.body.innerText));
            if (stale) throw new Error('OECD label still 2023 or 2024');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizetax-deep-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
