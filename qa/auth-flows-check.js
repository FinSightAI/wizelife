#!/usr/bin/env node
// Auth-flow coverage: signup, login, wrong password, forgot password,
// already-registered email, weak password, sign out. Uses Gmail +alias to
// avoid polluting real test accounts.
// Run: QA_TEST_BASE_EMAIL=ofirshamir57 node qa/auth-flows-check.js
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const BASE = process.env.QA_TEST_BASE_EMAIL || 'ofirshamir57';
// Use a session-unique alias so signup never collides with prior runs.
const STAMP = `${BASE}+qatmp${Date.now().toString(36).slice(-6)}@gmail.com`;
const PASSWORD = 'QaTmpPass-' + Math.floor(Math.random() * 1e6) + '!';

const { step, warn, finalize } = makeReporter('Auth-Flows');

async function gotoAuth(page) {
    await page.goto('https://wizelife.ai/auth.html?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1200);
}

(async () => {
    const browser = await chromium.launch();
    let ctx, page;
    const fresh = async () => {
        if (page) await page.close();
        if (ctx) await ctx.close();
        ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        page = await ctx.newPage();
    };

    await step('signup with valid credentials → dashboard', async () => {
        await fresh();
        await gotoAuth(page);
        await page.click('#tabSignup');
        await page.fill('#signupName', 'QaUser');
        await page.fill('#signupEmail', STAMP);
        await page.fill('#signupPassword', PASSWORD);
        await page.click('#signupBtn');
        await page.waitForURL(/dashboard\.html/, { timeout: 30000 });
    });

    await step('signup with same email again → "already registered" error', async () => {
        await fresh();
        await gotoAuth(page);
        await page.click('#tabSignup');
        await page.fill('#signupName', 'QaUser');
        await page.fill('#signupEmail', STAMP);
        await page.fill('#signupPassword', PASSWORD);
        await page.click('#signupBtn');
        await page.waitForTimeout(4000);
        const errVisible = await page.evaluate(() => {
            const e = document.getElementById('signupError');
            return e && getComputedStyle(e).display !== 'none' && /already|registered|רשום|registrado/i.test(e.textContent);
        });
        if (!errVisible) throw new Error('expected "already registered" error, got none or wrong text');
    });

    await step('signup with weak password → validation error', async () => {
        await fresh();
        await gotoAuth(page);
        await page.click('#tabSignup');
        await page.fill('#signupName', 'QaUser');
        await page.fill('#signupEmail', `${BASE}+qaweak${Date.now().toString(36).slice(-4)}@gmail.com`);
        await page.fill('#signupPassword', 'weak');
        await page.click('#signupBtn');
        await page.waitForTimeout(2000);
        const errVisible = await page.evaluate(() => {
            const e = document.getElementById('signupError');
            return e && getComputedStyle(e).display !== 'none' && e.textContent.length > 5;
        });
        if (!errVisible) throw new Error('weak password accepted');
    });

    await step('login with the just-created account → dashboard', async () => {
        await fresh();
        await gotoAuth(page);
        await page.fill('#loginEmail', STAMP);
        await page.fill('#loginPassword', PASSWORD);
        await page.click('#loginBtn');
        await page.waitForURL(/dashboard\.html/, { timeout: 30000 });
    });

    await step('login with wrong password → error shown', async () => {
        await fresh();
        await gotoAuth(page);
        await page.fill('#loginEmail', STAMP);
        await page.fill('#loginPassword', 'WrongPass-12345!');
        await page.click('#loginBtn');
        await page.waitForTimeout(4000);
        const errVisible = await page.evaluate(() => {
            const e = document.getElementById('loginError');
            return e && getComputedStyle(e).display !== 'none' && /wrong|incorrect|שגוי|incorrecto|incorrecta/i.test(e.textContent);
        });
        if (!errVisible) throw new Error('expected wrong-password error');
    });

    await step('forgot password — modal/page opens', async () => {
        await fresh();
        await gotoAuth(page);
        // Look for forgot-password link in either lang
        const link = page.locator('a:has-text("Forgot"), a:has-text("שכחת"), a:has-text("Esqueceu"), a:has-text("Olvidaste"), .forgot a, #forgotPasswordLink').first();
        if (!(await link.count())) throw new Error('forgot-password link not found');
        await link.click();
        await page.waitForTimeout(1500);
        // Either modal appears or page navigates — accept both
        const visible = await page.evaluate(() => {
            const m = document.querySelector('#resetModal, #forgotModal, [class*="reset"], [class*="forgot"]');
            return (m && getComputedStyle(m).display !== 'none') || /reset|forgot|שכחת/i.test(location.href);
        });
        if (!visible) throw new Error('forgot-password UI not visible after click');
    });

    await step('sign out from dashboard → back to auth', async () => {
        await fresh();
        await gotoAuth(page);
        await page.fill('#loginEmail', STAMP);
        await page.fill('#loginPassword', PASSWORD);
        await page.click('#loginBtn');
        await page.waitForURL(/dashboard\.html/, { timeout: 30000 });
        // Find sign-out button (varies by lang)
        const out = page.locator('button:has-text("Sign out"), button:has-text("התנתק"), button:has-text("Sair"), button:has-text("Cerrar"), #signOutBtn, #signOut, [onclick*="signOut"]').first();
        if (!(await out.count())) throw new Error('sign-out button not found');
        await out.click();
        await page.waitForTimeout(3000);
        const onAuth = /auth\.html|\/$|index\.html/.test(page.url());
        if (!onAuth) throw new Error(`after sign-out, expected auth or landing, got ${page.url()}`);
    });

    await browser.close();
    finalize('auth-flows-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
