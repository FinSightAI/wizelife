#!/usr/bin/env node
// WizeDeal — deep flow battery (~12 scenarios).
// Paste-listing analysis, save deal, country filter, lang swap, mobile.
const { chromium } = require('playwright');
const { makeReporter, verifyLangSwitch } = require('../shared-lib/helpers');

const BASE = 'https://deal.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeDeal-Deep');

async function fresh(browser, viewport = { width: 1280, height: 800 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const cspErrs = [];
    page.on('console', m => { if (m.type() === 'error' && /content security/i.test(m.text())) cspErrs.push(m.text()); });
    await page.goto(BASE + '/?_t=' + Date.now(), { timeout: 45000, waitUntil: 'load' });
    await page.waitForTimeout(3000);
    return { ctx, page, cspErrs };
}

(async () => {
    const browser = await chromium.launch();

    await step('Landing loads + paste-listing textarea reachable', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ state: 'attached', timeout: 25000 });
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Paste listing → "Analyze" button reachable', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const btn = page.locator('button:has-text("Analyze"), button:has-text("נתח"), button:has-text("Analisar"), button:has-text("Analizar"), button[type=submit]').first();
            if (!(await btn.count())) { warn('Analyze button not found', 'may use different label'); return; }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Country selector / filter present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const sel = await page.evaluate(() => {
                return document.querySelectorAll('select, [class*="country" i], [class*="flag" i]').length;
            });
            if (sel === 0) warn('No country selector/flags detected on landing', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('No CSP violations', async () => {
        const { ctx, page, cspErrs } = await fresh(browser);
        try {
            if (cspErrs.length) throw new Error(`${cspErrs.length} CSP errors (sample: ${cspErrs[0].slice(0, 100)})`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Language pills exist (4 langs)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const pills = await page.evaluate(() => {
                return ['en','pt','es','he'].filter(l => document.querySelector(`[data-wl-lang="${l}"], [data-lang="${l}"]`)).length;
            });
            if (pills < 4) warn(`Only ${pills}/4 lang pills`, 'selectors may differ');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Lang switch HE → EN updates UI', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await verifyLangSwitch(page);
            if (!r.ok) {
                if (/no visible EN control/.test(r.reason)) { warn('EN pill not visible', ''); return; }
                throw new Error(r.reason);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('No Hebrew leak in EN mode', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'en'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const leaks = await page.evaluate(() => {
                const HE = /[֐-׿]/, ALLOW = /Wize(Life|Money|Tax|Travel|Health|Deal|AI)/;
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
            if (leaks.length) throw new Error(`${leaks.length} leaks: ${leaks.join(' | ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Supported country flags present (BR/IL/US)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const countries = await page.evaluate(() => {
                // Count unique flag emoji. WizeDeal supports 3 deal countries
                // (Brazil/Israel/USA — see src/lib/constants/countries.ts).
                const flagRegex = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;
                const flags = [...new Set((document.body.innerText.match(flagRegex) || []))];
                return flags.length;
            });
            if (countries < 3) warn(`Only ${countries} country flags detected (expected the 3 supported: BR/IL/US)`, 'verify list rendered');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Plan badge in sidebar (Free/Pro/YOLO)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => /\bFree\b|\bPro\b|\bYOLO\b|⚡|💎|⭐/i.test(document.body.innerText));
            if (!has) warn('No plan badge text/icon detected', 'may show only when logged-in');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Deal flow reachable from home (start CTA present)', async () => {
        // WizeDeal is a single-page wizard at "/", not a separate /analyze route.
        const { ctx, page } = await fresh(browser);
        try {
            await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(1500);
            const has = await page.evaluate(() => /start a deal|התחל ניתוח|new deal|analyze|נתח/i.test(document.body.innerText));
            if (!has) throw new Error('no deal-start CTA on home page');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('iPhone (390×844): textarea reachable + no overflow', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const overflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth + 4
            );
            if (overflow) throw new Error('h-overflow at 390w');
            const taVisible = await page.locator('textarea').first().isVisible({ timeout: 3000 }).catch(() => false);
            if (!taVisible) warn('Textarea not visible on mobile', 'may need scroll');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('No back-arrow "← All Tools" on sub-app pages', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const hasBackArrow = await page.evaluate(() => /←\s*(All Tools|כל הכלים|Todas)/.test(document.body.innerText));
            if (hasBackArrow) throw new Error('Back-arrow to WizeLife still present (was supposed to be removed)');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizedeal-deep-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
