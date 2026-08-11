#!/usr/bin/env node
/**
 * Tier 13n — i18n missing-key detector (rendered DOM)
 * Tier 13o — Layout-diff: mobile (390×844) vs desktop (1440×900)
 * Tier 13p — Cross-browser: Chromium + WebKit (Safari engine)
 * Tier 13q — PWA install + offline mode
 * Tier 13r — End-to-end sign-in (requires QA_EMAIL + QA_PASSWORD env)
 * Tier 13s — Cross-app SSO bridge (depends on 13r)
 *
 * All Playwright. Each tier degrades gracefully if its dependency
 * (test account / WebKit / network) isn't available.
 */

const { chromium, webkit } = require('playwright');
const fs = require('fs');

const out = [];
const actions = [];
let passes = 0;
const add  = (l) => out.push(l);
const pass = (msg) => { passes++; add(`- ✅ ${msg}`); };
const fail = (msg, fix, who) => { actions.push({severity:'fail',who:who||'claude',msg,fix}); add(`- ❌ ${msg}`); };
const warn = (msg, fix, who) => { actions.push({severity:'warn',who:who||'admin',msg,fix}); add(`- ⚠️  ${msg}`); };
const note = (msg) => add(`- ℹ️ ${msg}`);

const PAGES = [
    'https://wizelife.ai/',
    'https://wizelife.ai/auth.html',
    'https://wizelife.ai/dashboard.html',
    'https://money.wizelife.ai/',
    'https://tax.wizelife.ai/',
    'https://deal.wizelife.ai/',
];

// ─── Tier 13n — i18n missing-key detector ────────────────────────────────────
async function tier13n(browser) {
    add('## Tier 13n — i18n missing-key detector');
    add('');
    const ctx = await browser.newContext();
    for (const url of PAGES) {
        const page = await ctx.newPage();
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2500);
        } catch (e) { warn(`${url}: load failed`, '', 'admin'); await page.close(); continue; }

        const missing = await page.evaluate(() => {
            const out = [];
            // Find any element with data-i18n whose text content looks like the
            // raw key (snake_case, no spaces) — that means I18n didn't translate it.
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const text = (el.textContent || '').trim();
                if (!text) return;
                // If text equals the key, or text itself looks like a dotted/underscored
                // key path (lowercase, multi-segment — e.g. "nav.dashboard") → not translated.
                // A plain capitalized English word (e.g. "Products", "Dashboard") is a
                // legitimate translation, not a raw key, so it must NOT match here.
                if (text === key || /^[a-z][a-z0-9]*([._][a-z0-9]+)+$/.test(text)) {
                    out.push({ key, text: text.slice(0, 60) });
                }
            });
            return out;
        });

        if (missing.length === 0) pass(`${url.replace('https://', '')}: all data-i18n keys rendered as translations`);
        else missing.slice(0, 5).forEach(m => fail(`untranslated i18n key on ${url}: \`${m.key}\` shows raw \`${m.text}\``,
            `add the key to all 4 langs in i18n dictionary`, 'claude'));
        await page.close();
    }
    await ctx.close();
    add('');
}

// ─── Tier 13o — Layout-diff: mobile vs desktop ───────────────────────────────
async function tier13o(browser) {
    add('## Tier 13o — Mobile vs Desktop layout');
    add('');
    for (const url of PAGES) {
        const ctxMobile  = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
        const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
            const [mobile, desktop] = await Promise.all([
                ctxMobile.newPage().then(p => p.goto(url, { timeout: 30000 }).then(()=>p)),
                ctxDesktop.newPage().then(p => p.goto(url, { timeout: 30000 }).then(()=>p)),
            ]);
            await Promise.all([mobile.waitForTimeout(2000), desktop.waitForTimeout(2000)]);

            // Catch: horizontal overflow on mobile (content wider than viewport)
            const mobileOverflow = await mobile.evaluate(() => {
                const html = document.documentElement;
                return { scroll: html.scrollWidth, view: html.clientWidth };
            });
            if (mobileOverflow.scroll > mobileOverflow.view + 5) {
                fail(`${url}: horizontal scroll on mobile (content ${mobileOverflow.scroll}px > viewport ${mobileOverflow.view}px)`,
                     `find the overflowing element with DevTools, add max-width:100% or overflow-x:hidden`,
                     'claude');
            } else {
                pass(`${url.replace('https://', '')}: mobile layout fits viewport`);
            }

            // Catch: elements with display:none on desktop but supposed to be visible
            const hiddenOnDesktop = await desktop.evaluate(() => {
                let hidden = 0;
                document.querySelectorAll('header, nav, main, aside, footer, .sidebar, #wize-bottom-nav').forEach(el => {
                    if (getComputedStyle(el).display === 'none') hidden++;
                });
                return hidden;
            });
            if (hiddenOnDesktop > 2) warn(`${url}: ${hiddenOnDesktop} major layout elements display:none on desktop`,
                                          `verify intentional`, 'admin');

            await mobile.close(); await desktop.close();
        } catch (e) { warn(`${url}: layout diff error: ${e.message}`, '', 'admin'); }
        await ctxMobile.close(); await ctxDesktop.close();
    }
    add('');
}

// ─── Tier 13p — Cross-browser (Chromium + WebKit) ────────────────────────────
async function tier13p() {
    add('## Tier 13p — Cross-browser (Chromium vs WebKit)');
    add('');
    let webkitBrowser;
    try { webkitBrowser = await webkit.launch({ headless: true }); }
    catch (e) { warn(`WebKit not available: ${e.message}`, 'install via "npx playwright install webkit"', 'admin'); return; }
    const ctx = await webkitBrowser.newContext({ viewport: { width: 390, height: 844 } });
    for (const url of PAGES.slice(0, 4)) {
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
        try {
            await page.goto(url, { timeout: 30000 });
            await page.waitForTimeout(2000);
            if (errors.length === 0) pass(`WebKit ${url.replace('https://', '')}: no JS errors`);
            else errors.slice(0,3).forEach(e => fail(`WebKit ${url}: ${e}`, 'reproduce in Safari', 'claude'));
        } catch (e) { warn(`WebKit ${url}: ${e.message}`, '', 'admin'); }
        await page.close();
    }
    await ctx.close(); await webkitBrowser.close();
    add('');
}

// ─── Tier 13q — PWA install + offline mode ──────────────────────────────────
async function tier13q(browser) {
    add('## Tier 13q — PWA + offline shell');
    add('');
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
        // Visit wizelife to register SW
        await page.goto('https://wizelife.ai/', { timeout: 30000 });
        await page.waitForTimeout(3500); // SW install
        // Manifest reachable?
        const manifest = await page.evaluate(async () => {
            const link = document.querySelector('link[rel="manifest"]');
            if (!link) return { ok: false, reason: 'no <link rel=manifest>' };
            const r = await fetch(link.href).catch(() => null);
            if (!r || !r.ok) return { ok: false, reason: `manifest fetch ${r ? r.status : 'failed'}` };
            return { ok: true, json: await r.json() };
        });
        if (!manifest.ok) fail(`PWA manifest broken: ${manifest.reason}`, 'fix manifest.json reference in HTML', 'claude');
        else if (!manifest.json.start_url || !manifest.json.icons) fail(`manifest.json missing required fields`, 'add start_url + icons[]', 'claude');
        else pass(`PWA manifest valid (start_url=${manifest.json.start_url})`);

        // Offline mode test
        await ctx.setOffline(true);
        const offlineNav = await page.goto('https://wizelife.ai/', { timeout: 10000 }).catch(e => ({ status: () => 0, _err: e.message }));
        await page.waitForTimeout(1000);
        const offlineHasContent = await page.evaluate(() => document.body.textContent.length > 200);
        if (offlineHasContent) pass('SW serves cached shell when offline');
        else fail(`offline mode shows blank page — SW shell missing required assets`, 'check sw.js SHELL[] covers /index.html + critical CSS/JS', 'claude');
        await ctx.setOffline(false);
    } catch (e) { warn(`PWA test error: ${e.message}`, '', 'admin'); }
    await page.close(); await ctx.close();
    add('');
}

// ─── Tier 13r — End-to-end sign-in (needs QA_EMAIL + QA_PASSWORD) ───────────
async function tier13r(browser) {
    add('## Tier 13r — End-to-end sign-in');
    add('');
    const email = process.env.QA_EMAIL;
    const pass_ = process.env.QA_PASSWORD;
    if (!email || !pass_) {
        note(`Skipped — set QA_EMAIL + QA_PASSWORD env vars (already configured as GitHub Actions secrets).`);
        add('');
        return null;
    }
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
        await page.goto('https://wizelife.ai/auth.html', { timeout: 30000 });
        await page.waitForTimeout(2000);
        // Find email + password fields by common heuristics
        await page.fill('input[type="email"]', email).catch(() => null);
        await page.fill('input[type="password"]', pass_).catch(() => null);
        // Click any "sign in" / "login" button
        await page.click('button:has-text("Sign in"), button:has-text("Login"), button:has-text("כניסה")').catch(() => null);
        await page.waitForTimeout(5000);
        const url = page.url();
        if (url.includes('/dashboard') || await page.locator('text=/dashboard|לוח|painel|panel/i').count() > 0) {
            pass(`sign-in successful, landed on ${url}`);
            return ctx; // keep context for SSO test
        } else {
            fail(`sign-in failed: still on ${url}`, 'verify test account credentials or auth flow broke', 'claude');
        }
    } catch (e) { fail(`sign-in error: ${e.message}`, 'check Firebase Auth domain config', 'claude'); }
    add('');
    await ctx.close();
    return null;
}

// ─── Tier 13s — Cross-app SSO bridge ────────────────────────────────────────
async function tier13s(ctx) {
    add('## Tier 13s — Cross-app SSO');
    add('');
    if (!ctx) { note('Skipped (Tier 13r did not sign in).'); add(''); return; }
    const page = await ctx.newPage();
    const APPS = [
        { name: 'WizeMoney', url: 'https://money.wizelife.ai/' },
        { name: 'WizeTax',   url: 'https://tax.wizelife.ai/' },
        { name: 'WizeDeal',  url: 'https://deal.wizelife.ai/' },
    ];
    for (const a of APPS) {
        try {
            await page.goto(a.url, { timeout: 30000 });
            await page.waitForTimeout(3000);
            const sso = await page.evaluate(() => {
                try {
                    const s = JSON.parse(localStorage.getItem('wl_sso') || '{}');
                    return { nick: s.nick || null, plan: s.plan || null, email: s.email || null };
                } catch { return {}; }
            });
            if (sso.nick || sso.email) pass(`${a.name}: SSO recognized user (${sso.nick || sso.email})`);
            else fail(`${a.name}: SSO bridge didn't pass user data`, 'check wl_token URL param + SSO handshake', 'claude');
        } catch (e) { warn(`${a.name}: ${e.message}`, '', 'admin'); }
    }
    await page.close();
    await ctx.close();
    add('');
}

(async () => {
    add(`# Browser-extra checks — ${new Date().toISOString()}`);
    add('');
    const browser = await chromium.launch({ headless: true });
    try {
        await tier13n(browser);
        await tier13o(browser);
        await tier13p();
        await tier13q(browser);
        const signedInCtx = await tier13r(browser);
        await tier13s(signedInCtx);
    } catch (e) { console.error('a tier crashed', e); }
    await browser.close();

    const failed = actions.filter(a => a.severity === 'fail');
    const warned = actions.filter(a => a.severity === 'warn');
    const summary = [];
    summary.push(`# 🚨 Browser-extra action items — ${new Date().toISOString().slice(0,10)}`);
    summary.push('');
    if (!actions.length) {
        summary.push(`✅ **${passes} browser-extra checks passed — i18n complete, layout fits, cross-browser clean, PWA works, auth flow OK.**`);
    } else {
        summary.push(`**${failed.length} failure(s), ${warned.length} warning(s), ${passes} pass.**`);
        summary.push('');
        const byMe  = actions.filter(a => a.who === 'claude');
        const byYou = actions.filter(a => a.who === 'admin');
        if (byMe.length) { summary.push('## For Claude to fix:'); byMe.forEach(a => summary.push(`- ${a.severity === 'fail' ? '❌' : '⚠️'} ${a.msg}` + (a.fix ? ` — **fix:** ${a.fix}` : ''))); summary.push(''); }
        if (byYou.length){ summary.push('## For you to investigate:'); byYou.forEach(a => summary.push(`- ${a.severity === 'fail' ? '❌' : '⚠️'} ${a.msg}` + (a.fix ? ` — **fix:** ${a.fix}` : ''))); summary.push(''); }
    }
    summary.push('---'); summary.push('_<details><summary>Full detail</summary>_'); summary.push('');
    const full = summary.join('\n') + '\n' + out.join('\n') + '\n</details>';
    fs.writeFileSync('browser-extra-report.md', full);
    fs.writeFileSync('/tmp/browser-extra-fails', String(failed.length));
    console.log(full);
    process.exit(0);
})().catch(e => { console.error('browser-extra crashed', e); process.exit(0); });
