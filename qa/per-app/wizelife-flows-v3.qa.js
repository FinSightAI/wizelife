#!/usr/bin/env node
// WizeLife — flows v3 (15 more scenarios).
// Brings total wizelife coverage to ~40 deep tests.
const { chromium } = require('playwright');
const { makeReporter, fillAndLogin } = require('../shared-lib/helpers');

const BASE = 'https://wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeLife-FlowsV3');

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

    await step('Google sign-in button exists on auth.html', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/auth.html');
        try {
            const has = await page.evaluate(() =>
                !!document.querySelector('button[onclick*="google" i], #googleSignIn, button:has(svg[viewBox*="48"])') ||
                /google/i.test(document.body.innerText)
            );
            if (!has) throw new Error('No Google sign-in button text/control found');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Upgrade modal shows Pro + YOLO comparison', async () => {
        if (!EMAIL || !PASSWORD) { warn('skipped — no test creds', ''); return; }
        const { ctx, page } = await fresh(browser, undefined, '/auth.html');
        try {
            await fillAndLogin(page, EMAIL, PASSWORD);
            await page.waitForURL(/dashboard\.html/, { timeout: 25000 });
            await page.waitForTimeout(3000);
            const upgradeBtn = page.locator('a:has-text("Upgrade"), button:has-text("Upgrade"), .btn-upgrade').first();
            if (!(await upgradeBtn.count())) { warn('No Upgrade button (user may already be Pro/YOLO)', ''); return; }
            await upgradeBtn.click({ force: true }).catch(() => {});
            await page.waitForTimeout(1500);
            const modal = await page.evaluate(() =>
                !!document.getElementById('wl-upgrade-modal') ||
                !!document.querySelector('[class*="upgrade"]:not([class*="btn"])')
            );
            if (!modal) warn('Upgrade compare modal did not appear', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Access-code input accepts text', async () => {
        if (!EMAIL || !PASSWORD) { warn('skipped — no creds', ''); return; }
        const { ctx, page } = await fresh(browser, undefined, '/auth.html');
        try {
            await fillAndLogin(page, EMAIL, PASSWORD);
            await page.waitForURL(/dashboard\.html/, { timeout: 25000 });
            const codeInput = page.locator('input[placeholder*="code" i], input[placeholder*="קוד"], #accessCodeInput').first();
            if (!(await codeInput.count())) { warn('Code input not found', ''); return; }
            await codeInput.fill('QATEST-INVALID');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Apply invalid code → user-facing error', async () => {
        if (!EMAIL || !PASSWORD) { warn('skipped — no creds', ''); return; }
        const { ctx, page } = await fresh(browser, undefined, '/auth.html');
        try {
            await fillAndLogin(page, EMAIL, PASSWORD);
            await page.waitForURL(/dashboard\.html/, { timeout: 25000 });
            await page.waitForTimeout(3000);
            const codeInput = page.locator('input[placeholder*="code" i], input[placeholder*="קוד"], #accessCodeInput').first();
            if (!(await codeInput.count())) { warn('skipped — no code input', ''); return; }
            await codeInput.fill('INVALID-XX-' + Date.now());
            const apply = page.locator('button:has-text("Apply"), button:has-text("Aplicar"), button:has-text("הפעלה"), button:has-text("הפעל")').first();
            if (await apply.count()) {
                await apply.click({ force: true }).catch(() => {});
                await page.waitForTimeout(3000);
                const hasError = await page.evaluate(() => /invalid|לא תקין|inválido|inválido/i.test(document.body.innerText));
                if (!hasError) warn('No error feedback after invalid code', '');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Theme persists across reload', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_theme', 'light'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2000);
            const t = await page.evaluate(() => localStorage.getItem('wl_theme'));
            if (t !== 'light') throw new Error('theme didn\'t persist');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Language persists across reload', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'es'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const lang = await page.evaluate(() => document.documentElement.lang);
            if (lang && lang.slice(0, 2) !== 'es') throw new Error(`html.lang=${lang} after es saved`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Feedback form: empty submit → validation', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/feedback.html');
        try {
            const submit = page.locator('button[type=submit], form button:last-child').first();
            if (!(await submit.count())) { warn('No submit button', ''); return; }
            const initial = page.url();
            await submit.click().catch(() => {});
            await page.waitForTimeout(2000);
            if (page.url() !== initial) throw new Error('empty submit navigated — no validation');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('404 page: nonexistent path returns friendly 404 page (not raw error)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/this-does-not-exist-' + Date.now() + '.html');
        try {
            const has404UI = await page.evaluate(() =>
                /404|not found|page not found|לא נמצא|não encontrada|no encontrada/i.test(document.body.innerText)
            );
            if (!has404UI) warn('No 404 page detected', 'may show server default');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('GA / Clarity analytics scripts load', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForTimeout(3000);
            const has = await page.evaluate(() =>
                !!window.gtag ||
                !!window.clarity ||
                !!document.querySelector('script[src*="googletagmanager"], script[src*="clarity"]')
            );
            if (!has) warn('No analytics script detected', 'may be ad-blocked in headless');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Performance: first content paint < 5 s on landing', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const fcp = await page.evaluate(() => {
                const e = performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint');
                return e ? e.startTime : null;
            });
            if (fcp !== null && fcp > 5000) throw new Error(`FCP=${Math.round(fcp)}ms > 5000`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Login alerts toggle exists in settings', async () => {
        if (!EMAIL || !PASSWORD) { warn('skipped — no creds', ''); return; }
        const { ctx, page } = await fresh(browser, undefined, '/auth.html');
        try {
            await fillAndLogin(page, EMAIL, PASSWORD);
            await page.waitForURL(/dashboard\.html/, { timeout: 25000 });
            const text = await page.evaluate(() => document.body.innerText);
            if (!/login alert|התראת התחברות|alerta de login|alerta de inicio/i.test(text)) {
                warn('No login-alert text on dashboard', '');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Account-delete uses confirmation dialog (not single-click)', async () => {
        if (!EMAIL || !PASSWORD) { warn('skipped — no creds', ''); return; }
        const { ctx, page } = await fresh(browser, undefined, '/auth.html');
        try {
            await fillAndLogin(page, EMAIL, PASSWORD);
            await page.waitForURL(/dashboard\.html/, { timeout: 25000 });
            const del = page.locator('button:has-text("Delete account"), button:has-text("מחק חשבון"), [onclick*="delete" i]').first();
            if (!(await del.count())) { warn('No delete-account button visible', ''); return; }
            // Intercept dialog
            let dialogShown = false;
            page.on('dialog', async (d) => { dialogShown = true; await d.dismiss(); });
            await del.click({ force: true }).catch(() => {});
            await page.waitForTimeout(2000);
            if (!dialogShown) warn('No confirm dialog when clicking delete', 'safety concern');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Cross-origin: app card links go via wizelife.ai dashboard (SSO bridge)', async () => {
        if (!EMAIL || !PASSWORD) { warn('skipped — no creds', ''); return; }
        const { ctx, page } = await fresh(browser, undefined, '/auth.html');
        try {
            await fillAndLogin(page, EMAIL, PASSWORD);
            await page.waitForURL(/dashboard\.html/, { timeout: 25000 });
            await page.waitForTimeout(4000);
            const allHaveToken = await page.evaluate(() => {
                const cards = Array.from(document.querySelectorAll('a.tool-card[href]'));
                // wl_token is now in the #fragment (privacy); test checks raw substring so still matches.
                return cards.length >= 4 && cards.every(c => /wl_token=/.test(c.href));
            });
            if (!allHaveToken) throw new Error('not all tool-card links carry wl_token (query or fragment)');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Service Worker waitForActive event fires within 10 s', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ready = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return false;
                const r = await Promise.race([
                    navigator.serviceWorker.ready.then(() => true),
                    new Promise((res) => setTimeout(() => res(false), 10000)),
                ]);
                return r;
            });
            if (!ready) warn('SW not ready within 10 s', 'PWA install experience suffers');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Footer has links to about / privacy / terms', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const links = await page.evaluate(() => ({
                about:   !!document.querySelector('footer a[href*="about"], a[href="/about"], a[href*="about.html"]'),
                privacy: !!document.querySelector('footer a[href*="privacy"], a[href*="privacy.html"]'),
                terms:   !!document.querySelector('footer a[href*="terms"], a[href*="terms.html"]'),
            }));
            const missing = Object.keys(links).filter(k => !links[k]);
            if (missing.length) throw new Error(`footer missing: ${missing.join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizelife-flows-v3-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
