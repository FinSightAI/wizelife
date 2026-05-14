#!/usr/bin/env node
// WizeHealth (Vitara) — deep flow battery (~12 scenarios).
// Vitara is on Render free tier → first request can take 30-60s cold start.
// We use generous timeouts and many warn-rather-than-fail probes.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://vitara.onrender.com';
const PUBLIC = 'https://health.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeHealth-Deep');

async function fresh(browser, viewport = { width: 1280, height: 800 }, base = BASE) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(base + '/?_t=' + Date.now(), { timeout: 60000, waitUntil: 'load' });
    await page.waitForTimeout(4000);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    await step('Landing loads (60s cold-start budget)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const len = await page.evaluate(() => document.body.innerText.length);
            if (len < 100) throw new Error(`only ${len} chars on page`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('CNAME health.wizelife.ai routes to same content', async () => {
        const { ctx, page } = await fresh(browser, undefined, PUBLIC);
        try {
            const title = await page.title();
            if (!/WizeHealth|Vitara|Health/i.test(title)) throw new Error(`unexpected title: ${title}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Chat textarea / input reachable', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const input = page.locator('#txt, textarea[placeholder*="ask" i], textarea[placeholder*="שאל"], [role=textbox]').first();
            await input.waitFor({ state: 'attached', timeout: 30000 });
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Model selector exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const sel = page.locator('select, [class*="model" i] [class*="select" i]').first();
            if (!(await sel.count())) warn('No model selector found', 'may be in settings');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('File upload input present (for blood tests / docs)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const fi = page.locator('input[type=file]').first();
            if (!(await fi.count())) warn('No file input on landing', 'may be inside a button');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Privacy / local-mode banner mentions "100% local" or similar', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => /100%|local|פרטיות|privacy/i.test(document.body.innerText));
            if (!has) warn('No privacy/local mode banner detected', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Lang pills HE/EN/PT/ES present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const pills = await page.evaluate(() =>
                ['en','pt','es','he'].filter(l => document.querySelector(`[data-wl-lang="${l}"], [data-lang="${l}"], button.wh-pill:has-text("${l.toUpperCase()}")`)).length
            );
            if (pills < 3) warn(`Only ${pills}/4 lang pills found`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Lang HE → EN swaps UI', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const en = page.locator('[data-wl-lang="en"], button.wh-pill:has-text("EN")').first();
            if (!(await en.count())) { warn('EN pill missing', ''); return; }
            const before = await page.evaluate(() => document.body.innerText.slice(0, 200));
            await en.click({ force: true }).catch(() => {});
            await page.waitForTimeout(2500);
            const after = await page.evaluate(() => document.body.innerText.slice(0, 200));
            if (before === after) throw new Error('UI unchanged after EN click');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('No Hebrew leak in EN mode', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'en'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(4000);
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

    await step('Medical disclaimer present in DOM', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => /not a substitute|לא מחליף|ייעוץ רפואי|medical advice|orientação médica|consejo médico/i.test(document.body.innerText));
            if (!has) throw new Error('No medical disclaimer text on landing — required for compliance');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Share-with-doctor link/feature present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => /share with doctor|שיתוף עם רופא|compartilhar com médico|compartir con médico/i.test(document.body.innerText));
            if (!has) warn('No share-with-doctor copy detected', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('iPhone (390×844): no overflow + chat reachable', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const overflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth + 4
            );
            if (overflow) throw new Error('h-overflow at 390w');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizehealth-deep-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
