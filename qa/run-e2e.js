#!/usr/bin/env node
// E2E flow tests — actual user journeys per app.
// Skipped if QA_EMAIL/QA_PASSWORD secrets aren't available.

const { chromium } = require('playwright');
const fs = require('fs');

const QA_EMAIL = process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD;

const out = ['# E2E flows\n'];
const fails = [];

if (!QA_EMAIL || !QA_PASSWORD) {
    out.push('_skipped — QA_EMAIL/QA_PASSWORD secrets missing_');
    fs.writeFileSync('e2e-report.md', out.join('\n'));
    process.exit(0);
}

async function step(label, fn) {
    try {
        await fn();
        out.push(`- ✅ ${label}`);
        return true;
    } catch (e) {
        out.push(`- ❌ ${label} — ${e.message.slice(0, 200)}`);
        fails.push(label);
        return false;
    }
}

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext();

    // ── Flow 1: WizeLife login → dashboard ──
    out.push('## Flow 1 — WizeLife login → dashboard');
    let page = await ctx.newPage();
    let loggedIn = false;
    await step('Open auth.html', async () => {
        await page.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
    });
    await step('Fill credentials', async () => {
        await page.fill('input[type=email]', QA_EMAIL);
        await page.fill('input[type=password]', QA_PASSWORD);
    });
    loggedIn = await step('Submit login → reach dashboard', async () => {
        const btn = page.locator('button:has-text("Sign In"), button:has-text("Sign in"), button:has-text("Login"), button:has-text("התחבר"), button:has-text("Entrar"), button#loginBtn').first();
        await btn.click({ timeout: 5000 });
        await page.waitForURL(/dashboard\.html/, { timeout: 15000 });
    });

    if (loggedIn) {
        await step('Dashboard shows nickname', async () => {
            const navName = await page.locator('#navUserName').first().textContent({ timeout: 5000 });
            if (!navName || navName === '—') throw new Error(`empty nick (got: '${navName}')`);
        });
        await step('Plan badge visible', async () => {
            const badge = page.locator('#navPlanBadge').first();
            const txt = await badge.textContent({ timeout: 5000 });
            if (!txt) throw new Error('no plan badge');
        });
        await step('Referral link generated', async () => {
            const refLink = await page.locator('#refLink').first().inputValue({ timeout: 5000 });
            if (!refLink || !refLink.includes('?ref=')) throw new Error(`bad link: ${refLink}`);
        });
    }
    await page.close();

    // ── Flow 2: Feedback page submit ──
    out.push('\n## Flow 2 — Feedback submission');
    page = await ctx.newPage();
    await step('Open feedback', async () => {
        await page.goto('https://wizelife.ai/feedback.html?app=money', { waitUntil: 'domcontentloaded', timeout: 25000 });
    });
    await step('App pill pre-selected', async () => {
        const active = page.locator('#appPills .pill.active').first();
        if (!(await active.count())) throw new Error('no preselected app pill');
    });
    await page.close();

    // ── Flow 3: Cross-app SSO — open WizeMoney with token, expect logged-in state ──
    out.push('\n## Flow 3 — WizeMoney loads (no SSO)');
    page = await ctx.newPage();
    await step('WizeMoney loads + sidebar visible', async () => {
        await page.goto('https://finsightai.github.io/finsight/', { waitUntil: 'load', timeout: 30000 });
        const sidebar = page.locator('.sidebar, .app-container').first();
        await sidebar.waitFor({ state: 'attached', timeout: 10000 });
    });
    await step('WizeBar Sign-in pill visible (logged out)', async () => {
        // wait for SW + sidebar.js to inject the bar
        await page.waitForTimeout(2000);
        const exists = await page.evaluate(() => !!document.getElementById('wl-bar-signin') || !!document.getElementById('wl-bar'));
        if (!exists) throw new Error('no WizeBar');
    });
    await page.close();

    // ── Flow 4: WizeTax advisor reachable + chat input present ──
    out.push('\n## Flow 4 — WizeTax UI');
    page = await ctx.newPage();
    await step('Tax advisor loads', async () => {
        await page.goto('https://tax.wizelife.ai/advisor', { waitUntil: 'load', timeout: 30000 });
    });
    await step('Chat input present', async () => {
        await page.waitForSelector('textarea, input[type=text]', { timeout: 10000 });
    });
    await step('Sidebar with categories present', async () => {
        const cats = await page.locator('.wt-cat, [open], details').count();
        if (cats === 0) throw new Error('no sidebar categories');
    });
    await page.close();

    // ── Flow 5: WizeDeal home loads ──
    out.push('\n## Flow 5 — WizeDeal');
    page = await ctx.newPage();
    await step('WizeDeal home loads', async () => {
        await page.goto('https://deal.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    await step('Big WizeDeal title rendered', async () => {
        // search body text — more resilient than h1 selector under CF/SSR
        await page.waitForFunction(() => document.body.innerText.length > 100, { timeout: 8000 });
        const body = await page.locator('body').innerText();
        if (!/wize.*deal/i.test(body)) throw new Error('WizeDeal marker not found in page body');
    });
    await page.close();

    // ── Flow 5b: Feedback form — real Firestore write ──
    out.push('\n## Flow 5b — Feedback form (real submit)');
    page = await ctx.newPage();
    await step('Open feedback', async () => {
        await page.goto('https://wizelife.ai/feedback.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    });
    await step('Select app pill (WizeMoney)', async () => {
        const pill = page.locator('[data-app="finsight"]').first();
        await pill.waitFor({ timeout: 5000 });
        await pill.click();
    });
    await step('Fill loved field', async () => {
        await page.fill('#loved', 'QA automated test — please ignore');
    });
    await step('Submit feedback form', async () => {
        await page.click('[type="submit"]');
    });
    await step('Success message visible (proves Firestore write worked)', async () => {
        // The ok-msg div appears only after a successful Firestore add()
        const ok = page.locator('.ok-msg');
        await ok.waitFor({ timeout: 10000 });
        const txt = await ok.textContent();
        if (!txt || txt.trim().length < 3) throw new Error('success message empty');
    });
    await page.close();

    // ── Flow 6: WizeHealth ──
    out.push('\n## Flow 6 — WizeHealth');
    page = await ctx.newPage();
    await step('WizeHealth loads', async () => {
        await page.goto('https://vitara.onrender.com/', { waitUntil: 'load', timeout: 60000 });
    });
    await step('Welcome screen + chat input', async () => {
        await page.waitForSelector('#txt, .chat-input, textarea', { timeout: 15000 });
    });
    await page.close();

    // ── Flow 7b: WizeTax chat — real streaming response ──
    out.push('\n## Flow 7b — WizeTax chat (real API call)');
    page = await ctx.newPage();
    await step('WizeTax advisor loads', async () => {
        await page.goto('https://tax.wizelife.ai/advisor', { waitUntil: 'domcontentloaded', timeout: 20000 });
    });
    await step('Chat input present', async () => {
        await page.waitForSelector('textarea, input[type="text"], [contenteditable]', { timeout: 10000 });
    });
    await step('Send a simple tax question', async () => {
        const input = page.locator('textarea, input[type="text"]').first();
        await input.fill('What is VAT?');
        await input.press('Enter');
    });
    await step('Response streams in (proves backend alive + LLM responding)', async () => {
        // Wait for at least one assistant message to appear in the DOM
        await page.waitForFunction(
            () => {
                const msgs = document.querySelectorAll('[class*="assistant"], [class*="bot"], [class*="response"], [class*="message"]');
                return [...msgs].some(el => el.textContent && el.textContent.trim().length > 20);
            },
            { timeout: 45000 }
        );
    });
    await page.close();

    await ctx.close();
    await browser.close();

    out.push(`\n---\n**E2E failures**: ${fails.length}`);
    if (fails.length) out.push(fails.map(f => `- ${f}`).join('\n'));
    fs.writeFileSync('e2e-report.md', out.join('\n'));
    fs.writeFileSync('/tmp/e2e-fails', String(fails.length));
    console.log(out.join('\n'));
}

main().catch(e => {
    out.push(`\n❌ Fatal: ${e.message}`);
    fs.writeFileSync('e2e-report.md', out.join('\n'));
    fs.writeFileSync('/tmp/e2e-fails', '999');
    process.exit(0);
});
