#!/usr/bin/env node
// WizeLife portal — flows v2: access-code redeem, referral link generation,
// feedback submit, GDPR export/delete, plan-badge per account, settings.
const { chromium } = require('playwright');
const { makeReporter, fillAndLogin } = require('../shared-lib/helpers');

const BASE = 'https://wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeLife-FlowsV2');

const EMAIL = process.env.QA_EMAIL_PRO || process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD_PRO || process.env.QA_PASSWORD;

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    await step('Access-code redeem UI exists on dashboard', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/dashboard.html');
        try {
            const has = await page.evaluate(() =>
                /redeem|access code|חבר|partner|campaign|access.code|הפעל קוד/i.test(document.body.innerText)
            );
            if (!has) throw new Error('No redeem-code UI text on dashboard');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Referral link section exists on dashboard', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/dashboard.html');
        try {
            const has = await page.evaluate(() =>
                /refer|invite|הזמן חברים|partner|share your link|month free|חודש חינם/i.test(document.body.innerText)
            );
            if (!has) warn('No referral text on dashboard', 'feature may be hidden');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('GDPR export-data button exists', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/dashboard.html');
        try {
            const has = await page.evaluate(() =>
                /export\s*(my\s*)?data|ייצוא|GDPR|הורד את הנתונים שלי|download my data/i.test(document.body.innerText)
            );
            if (!has) warn('No GDPR export button text', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Account deletion / right-to-be-forgotten link exists', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/dashboard.html');
        try {
            const has = await page.evaluate(() =>
                /delete\s*(my\s*)?account|מחק חשבון|excluir conta|eliminar cuenta/i.test(document.body.innerText)
            );
            if (!has) warn('No account-delete text', 'GDPR right-to-be-forgotten compliance');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('feedback.html form has fields + submit button', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/feedback.html');
        try {
            const inputs = await page.evaluate(() => document.querySelectorAll('input, textarea').length);
            const submit = await page.evaluate(() =>
                !!document.querySelector('button[type=submit], input[type=submit], form button')
            );
            if (inputs < 1) throw new Error('No inputs on feedback form');
            if (!submit) throw new Error('No submit button on feedback form');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Cookie / consent banner: present OR explicitly omitted (Israeli law)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /cookie|cookies|הסכמה|aceptar|aceitar|GDPR consent/i.test(document.body.innerText)
            );
            // No assertion — Israel doesn't require cookie banner. Just record.
            if (!has) warn('No cookie banner visible — may be intentional (Israeli law)', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('sitemap.xml exists', async () => {
        const { ctx } = await fresh(browser);
        try {
            const r = await ctx.request.get(BASE + '/sitemap.xml', { timeout: 10000 });
            if (r.status() !== 200) throw new Error(`sitemap.xml → ${r.status()}`);
            const body = await r.text();
            if (!/wizelife\.ai/.test(body)) throw new Error('sitemap.xml has no wizelife URLs');
        } finally { await ctx.close(); }
    });

    await step('robots.txt allows crawling + points to sitemap', async () => {
        const { ctx } = await fresh(browser);
        try {
            const r = await ctx.request.get(BASE + '/robots.txt', { timeout: 10000 });
            if (r.status() !== 200) throw new Error(`robots.txt → ${r.status()}`);
            const body = await r.text();
            if (!/sitemap/i.test(body)) warn('robots.txt has no Sitemap: directive', '');
        } finally { await ctx.close(); }
    });

    await step('Schema.org Organization JSON-LD present on landing', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).some(s =>
                    /"@type":\s*"Organization"|"@type":\s*"WebSite"|"@type":\s*"SoftwareApplication"/.test(s.textContent)
                );
            });
            if (!has) warn('No schema.org Organization/WebSite/SoftwareApp JSON-LD', 'SEO impact');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Open Graph + Twitter card meta tags complete', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const m = await page.evaluate(() => ({
                og: !!document.querySelector('meta[property="og:title"]'),
                ogImage: !!document.querySelector('meta[property="og:image"]'),
                twitter: !!document.querySelector('meta[name="twitter:card"]'),
            }));
            if (!m.og || !m.ogImage) throw new Error(`missing OG tags: ${JSON.stringify(m)}`);
            if (!m.twitter) warn('Missing twitter:card meta', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('hreflang alt links for 4 languages present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const langs = await page.evaluate(() =>
                Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(l => l.hreflang)
            );
            if (langs.length < 4) warn(`only ${langs.length} hreflang link(s) — found: ${langs.join(', ')}`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('No "← All Tools" copy on any portal page', async () => {
        for (const path of ['/dashboard.html', '/about.html', '/security.html', '/terms.html']) {
            const { ctx, page } = await fresh(browser, undefined, path);
            try {
                const bad = await page.evaluate(() => /←\s*(All Tools|כל הכלים|Todas)/.test(document.body.innerText));
                if (bad) throw new Error(`${path}: stale "← All Tools" copy still present`);
            } finally { await page.close(); await ctx.close(); }
        }
    });

    await browser.close();
    finalize('wizelife-flows-v2-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
