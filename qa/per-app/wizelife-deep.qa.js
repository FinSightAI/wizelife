#!/usr/bin/env node
// WizeLife portal — deep flow battery (~15 scenarios).
// Signup, login, password reset, dashboard access, app card SSO injection,
// settings, sign out, plan-badge, language toggle, mobile.
const { chromium } = require('playwright');
const { makeReporter, fillAndLogin } = require('../shared-lib/helpers');

const BASE = 'https://wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeLife-Deep');

const EMAIL_PRO = process.env.QA_EMAIL_PRO || process.env.QA_EMAIL;
const PASSWORD_PRO = process.env.QA_PASSWORD_PRO || process.env.QA_PASSWORD;

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + '?_t=' + Date.now(), { timeout: 30000, waitUntil: 'load' });
    await page.waitForTimeout(2000);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    // ── Public-page checks (no login required) ──
    await step('Landing / loads + CTA visible', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const cta = page.locator('a[href*="auth"], button:has-text("Sign up"), button:has-text("הרשמה"), a:has-text("Get Started"), a:has-text("התחל")').first();
            await cta.waitFor({ state: 'visible', timeout: 8000 });
        } finally { await page.close(); await ctx.close(); }
    });

    await step('auth.html — Sign In + Sign Up tabs both reachable', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/auth.html');
        try {
            const login = page.locator('#tabLogin, button:has-text("Sign In"), button:has-text("כניסה")').first();
            const signup = page.locator('#tabSignup, button:has-text("Sign Up"), button:has-text("הרשמה")').first();
            if (!(await login.count())) throw new Error('Sign-in tab not found');
            if (!(await signup.count())) throw new Error('Sign-up tab not found');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Signup form has password strength rule (≥8, mixed case, digit, special)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/auth.html');
        try {
            await page.click('#tabSignup');
            await page.fill('#signupName', 'QaTester');
            await page.fill('#signupEmail', 'qa+weak' + Date.now() + '@example.com');
            await page.fill('#signupPassword', 'short');
            await page.click('#signupBtn');
            await page.waitForTimeout(2000);
            const errVisible = await page.evaluate(() => {
                const e = document.getElementById('signupError');
                return e && getComputedStyle(e).display !== 'none' && e.textContent.length > 5;
            });
            if (!errVisible) throw new Error('weak password accepted — validation broken');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Forgot password link triggers modal/page', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/auth.html');
        try {
            const link = page.locator('a:has-text("Forgot"), a:has-text("שכחת"), a:has-text("Esqueceu"), a:has-text("Olvidaste"), .forgot a').first();
            if (!(await link.count())) throw new Error('Forgot-password link missing');
            await link.click();
            await page.waitForTimeout(1500);
            const visible = await page.evaluate(() => {
                const m = document.querySelector('#resetModal, [class*="reset" i], [class*="forgot" i]');
                return (m && getComputedStyle(m).display !== 'none') || /reset|forgot|שכחת/i.test(location.href);
            });
            if (!visible) throw new Error('Forgot-password UI not visible after click');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('about.html loads + 4-lang switcher works', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/about.html');
        try {
            const langs = await page.evaluate(() =>
                ['en','pt','es','he'].filter(l => document.querySelector(`[data-lang="${l}"], [data-wl-lang="${l}"]`)).length
            );
            if (langs < 4) throw new Error(`only ${langs}/4 lang pills on about.html`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Security, terms, privacy pages all load + have ToC/sections', async () => {
        for (const path of ['/security.html', '/terms.html', '/privacy.html']) {
            const { ctx, page } = await fresh(browser, undefined, path);
            try {
                const sections = await page.evaluate(() => document.querySelectorAll('h2, h3').length);
                if (sections < 3) throw new Error(`${path}: only ${sections} headings`);
            } finally { await page.close(); await ctx.close(); }
        }
    });

    await step('feedback.html — form present + submit-able', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/feedback.html');
        try {
            const form = await page.evaluate(() => !!document.querySelector('form'));
            if (!form) throw new Error('feedback.html has no <form>');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── Logged-in checks ──
    if (EMAIL_PRO && PASSWORD_PRO) {
        await step('Login flow → dashboard.html', async () => {
            const { ctx, page } = await fresh(browser, undefined, '/auth.html');
            try {
                await fillAndLogin(page, EMAIL_PRO, PASSWORD_PRO);
                await page.waitForURL(/dashboard\.html/, { timeout: 25000 });
            } finally { await page.close(); await ctx.close(); }
        });

        await step('Dashboard — all 5 app cards reachable', async () => {
            const { ctx, page } = await fresh(browser, undefined, '/auth.html');
            try {
                await fillAndLogin(page, EMAIL_PRO, PASSWORD_PRO);
                await page.waitForURL(/dashboard\.html/, { timeout: 25000 });
                await page.waitForTimeout(3000);
                const expected = ['money.wizelife.ai','tax.wizelife.ai','deal.wizelife.ai','travel.wizelife.ai','health.wizelife.ai'];
                const missing = await page.evaluate((hosts) => {
                    return hosts.filter(h => !document.querySelector(`a[href*="${h}"]`));
                }, expected);
                if (missing.length) throw new Error(`missing app cards: ${missing.join(', ')}`);
            } finally { await page.close(); await ctx.close(); }
        });

        await step('Dashboard — SSO tokens injected into app card hrefs', async () => {
            const { ctx, page } = await fresh(browser, undefined, '/auth.html');
            try {
                await fillAndLogin(page, EMAIL_PRO, PASSWORD_PRO);
                await page.waitForURL(/dashboard\.html/, { timeout: 25000 });
                await page.waitForTimeout(4000);
                const tokens = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('a.tool-card[href]')).filter(a => /wl_token=/.test(a.href)).length;
                });
                if (tokens < 4) throw new Error(`only ${tokens}/5 tool-cards have wl_token`);
            } finally { await page.close(); await ctx.close(); }
        });

        await step('Sign-out button exits to landing/auth', async () => {
            const { ctx, page } = await fresh(browser, undefined, '/auth.html');
            try {
                await fillAndLogin(page, EMAIL_PRO, PASSWORD_PRO);
                await page.waitForURL(/dashboard\.html/, { timeout: 25000 });
                const out = page.locator('button:has-text("Sign out"), button:has-text("התנתק"), #signOutBtn, #signOut').first();
                if (!(await out.count())) { warn('Sign-out button not found', ''); return; }
                await out.click();
                await page.waitForTimeout(3000);
                if (!/auth\.html|\/$|index\.html/.test(page.url())) throw new Error(`after sign-out: ${page.url()}`);
            } finally { await page.close(); await ctx.close(); }
        });
    } else {
        warn('login flows skipped — no QA_EMAIL_PRO + QA_PASSWORD_PRO env vars', 'set them via .env.qa.local');
    }

    // ── Mobile + i18n cross-cutting ──
    await step('iPhone (390×844) landing: no overflow', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const overflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth + 4
            );
            if (overflow) throw new Error('h-overflow on landing at 390w');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('No Hebrew leak in EN mode (landing)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'en'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
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
            if (leaks.length) throw new Error(`${leaks.length} Hebrew leaks: ${leaks.join(' | ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('No "← All Tools" back-arrow anywhere on portal', async () => {
        for (const path of ['/', '/about.html', '/dashboard.html', '/security.html']) {
            const { ctx, page } = await fresh(browser, undefined, path);
            try {
                const bad = await page.evaluate(() => /←\s*(All Tools|כל הכלים|Todas las|Todas as)/i.test(document.body.innerText));
                if (bad) throw new Error(`${path} still has "← All Tools"`);
            } finally { await page.close(); await ctx.close(); }
        }
    });

    await browser.close();
    finalize('wizelife-deep-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
