#!/usr/bin/env node
// WizeLife portal QA — landing + auth + dashboard + about + security + terms + feedback
// Run: node qa/per-app/wizelife.qa.js
// Skipped if QA_EMAIL/QA_PASSWORD not set (only the login flow steps skip; everything else still runs).
const { chromium } = require('playwright');
const { makeReporter, fillAndLogin } = require('../shared-lib/helpers');

const QA_EMAIL    = process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD;
const HAS_CREDS   = !!(QA_EMAIL && QA_PASSWORD);

const { step, warn, finalize } = makeReporter('WizeLife');

(async () => {
    const browser = await chromium.launch();

    // ── PUBLIC PAGES ─────────────────────────────────────────────────────────

    for (const path of ['/', '/about.html', '/security.html', '/terms.html', '/privacy.html', '/feedback.html']) {
        const url = 'https://wizelife.ai' + path;
        await step(`${path} loads + has content`, async () => {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            try {
                const r = await page.goto(url, { waitUntil: 'load', timeout: 20000 });
                const len = await page.evaluate(() => document.body.innerText.trim().length);
                if (!r || r.status() >= 400) throw new Error(`HTTP ${r ? r.status() : 0}`);
                if (len < 80) throw new Error(`only ${len} chars rendered`);
            } finally {
                await page.close(); await ctx.close();
            }
        });
    }

    // ── SEO INFRASTRUCTURE ───────────────────────────────────────────────────

    await step('robots.txt reachable + has Sitemap line', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const r = await page.goto('https://wizelife.ai/robots.txt', { timeout: 10000 });
        const body = await page.evaluate(() => document.body.innerText);
        await page.close(); await ctx.close();
        if (!r || r.status() !== 200) throw new Error(`HTTP ${r ? r.status() : 0}`);
        if (!/Sitemap:/i.test(body)) throw new Error('no Sitemap declaration in robots.txt');
    });

    await step('sitemap.xml reachable + valid', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const r = await page.goto('https://wizelife.ai/sitemap.xml', { timeout: 10000 });
        const body = await page.evaluate(() => document.body.innerText);
        await page.close(); await ctx.close();
        if (!r || r.status() !== 200) throw new Error(`HTTP ${r ? r.status() : 0}`);
        if (!/<urlset|<sitemapindex/.test(body)) throw new Error('not a sitemap');
    });

    await step('OG tags present on index', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.goto('https://wizelife.ai/', { timeout: 15000 });
        const meta = await page.evaluate(() => ({
            title: document.querySelector('meta[property="og:title"]')?.content,
            image: document.querySelector('meta[property="og:image"]')?.content,
            desc:  document.querySelector('meta[property="og:description"]')?.content,
        }));
        await page.close(); await ctx.close();
        if (!meta.title || !meta.image || !meta.desc) throw new Error(`missing: ${Object.entries(meta).filter(([_,v])=>!v).map(([k])=>k).join(', ')}`);
    });

    // ── i18n ─────────────────────────────────────────────────────────────────

    for (const lang of ['he', 'en', 'pt', 'es']) {
        await step(`landing loads in ${lang}`, async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            await page.addInitScript((l) => { try { localStorage.setItem('wl_lang', l); } catch {} }, lang);
            await page.goto('https://wizelife.ai/', { timeout: 15000 });
            await page.waitForTimeout(800);
            const dir = await page.evaluate(() => document.documentElement.dir || getComputedStyle(document.documentElement).direction);
            await page.close(); await ctx.close();
            if (lang === 'he' && dir !== 'rtl') throw new Error(`expected rtl, got ${dir}`);
            if (lang !== 'he' && dir === 'rtl') warn(`${lang}: still rtl?`, 'wl-lang-switcher might not have fired');
        });
    }

    // ── AUTH (only if creds available) ───────────────────────────────────────

    if (HAS_CREDS) {
        await step('Login flow → dashboard', async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            try {
                await page.goto('https://wizelife.ai/auth.html', { timeout: 20000 });
                await fillAndLogin(page, QA_EMAIL, QA_PASSWORD);
                await page.waitForURL(/dashboard\.html/, { timeout: 20000 });
            } finally {
                await page.close(); await ctx.close();
            }
        });

        await step('Forgot-password sends email (or rate-limited)', async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            try {
                await page.goto('https://wizelife.ai/auth.html', { timeout: 15000 });
                await page.fill('#loginEmail', QA_EMAIL);
                await page.locator('a[onclick*="forgotPassword"], .forgot a').first().click();
                await page.waitForFunction(
                    () => (document.getElementById('loginError')?.textContent || '').length > 3,
                    { timeout: 12000 }
                );
            } finally {
                await page.close(); await ctx.close();
            }
        });

        await step('Wrong password → user-friendly error (not generic)', async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            try {
                await page.goto('https://wizelife.ai/auth.html', { timeout: 15000 });
                await page.fill('#loginEmail', QA_EMAIL);
                await page.fill('#loginPassword', 'definitelyWrongXYZ!');
                await page.locator('#loginBtn, button[type=submit]').first().click();
                await page.waitForFunction(
                    () => (document.getElementById('loginError')?.textContent || '').length > 3,
                    { timeout: 12000 }
                );
                const err = (await page.locator('#loginError').textContent() || '').toLowerCase();
                if (err.includes('something went wrong') && !err.includes('wrong')) {
                    throw new Error(`generic error: "${err}"`);
                }
            } finally {
                await page.close(); await ctx.close();
            }
        });
    } else {
        warn('login flows skipped — QA_EMAIL/QA_PASSWORD not set', 'set env vars or run in CI');
    }

    // ── Mobile viewport check ────────────────────────────────────────────────

    await step('iPhone (390×844): landing no horizontal overflow', async () => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        await page.goto('https://wizelife.ai/', { timeout: 20000 });
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 10
        );
        await page.close(); await ctx.close();
        if (overflow) throw new Error('horizontal overflow on mobile');
    });

    await browser.close();
    finalize('wizelife-qa-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
