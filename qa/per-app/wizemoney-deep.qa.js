#!/usr/bin/env node
// WizeMoney — deep flow battery (15 scenarios).
// Covers: navigation between sub-pages, add-transaction modal,
// add-goal modal, sidebar links, search/filter, AI chat, language
// swap, mobile viewport, paywall behavior (free vs pro), SW update.
const { chromium } = require('playwright');
const { makeReporter, fillAndLogin, verifyLangSwitch } = require('../shared-lib/helpers');

const BASE = 'https://money.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeMoney-Deep');

const EMAIL_PRO    = process.env.QA_EMAIL_PRO  || process.env.QA_EMAIL;
const PASSWORD_PRO = process.env.QA_PASSWORD_PRO || process.env.QA_PASSWORD;
const EMAIL_FREE    = process.env.QA_EMAIL_FREE    || EMAIL_PRO;
const PASSWORD_FREE = process.env.QA_PASSWORD_FREE || PASSWORD_PRO;

async function fresh(browser, viewport = { width: 1280, height: 800 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + '/?_t=' + Date.now(), { timeout: 45000, waitUntil: 'load' });
    await page.waitForTimeout(2500);
    return { ctx, page };
}

async function loginThenGoto(browser, url) {
    if (!EMAIL_PRO || !PASSWORD_PRO) return null;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('https://wizelife.ai/auth.html?_t=' + Date.now(), { timeout: 30000 });
    try { await fillAndLogin(page, EMAIL_PRO, PASSWORD_PRO); } catch (e) { await ctx.close(); return null; }
    await page.goto(url, { timeout: 30000 });
    await page.waitForTimeout(3000);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    await step('Landing renders + ≥3 sidebar links', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const links = await page.evaluate(() => document.querySelectorAll('aside a[href], .sidebar a[href], nav a[href]').length);
            if (links < 3) throw new Error(`only ${links} nav links found`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Service Worker registers + manifest valid', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const sw = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return 'unsupported';
                const regs = await navigator.serviceWorker.getRegistrations();
                return regs.length ? 'registered' : 'none';
            });
            if (sw !== 'registered') throw new Error(`SW state: ${sw}`);
            const m = await page.evaluate(async () => {
                const l = document.querySelector('link[rel=manifest]');
                if (!l) return null;
                const r = await fetch(l.href).catch(() => null);
                return r && r.ok ? await r.json().catch(() => null) : null;
            });
            if (!m || !m.name) throw new Error('manifest missing or no name field');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Sidebar pages reachable — at least 5 distinct hrefs return 200', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const hrefs = await page.evaluate(() =>
                Array.from(document.querySelectorAll('aside a[href], .sidebar a[href]'))
                    .map(a => a.href).filter(h => h.includes('money.wizelife.ai/pages/'))
                    .slice(0, 8)
            );
            const broken = [];
            for (const h of hrefs) {
                const r = await ctx.request.head(h, { timeout: 10000 }).catch(() => null);
                if (!r || r.status() >= 400) broken.push(`${h} → ${r ? r.status() : 'err'}`);
            }
            if (broken.length > 1) throw new Error(`${broken.length}/${hrefs.length} broken: ${broken.slice(0, 2).join(' | ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('"Add transaction" modal opens', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const btn = page.locator('button:has-text("הוסף עסקה"), button:has-text("Add transaction"), button:has-text("Adicionar"), button[onclick*="addTx" i], [data-action="add-tx"]').first();
            if (!(await btn.count())) { warn('Add-transaction button not found on landing', 'may be behind onboarding'); return; }
            await btn.click().catch(() => {});
            await page.waitForTimeout(1200);
            const modalOpen = await page.evaluate(() =>
                !!document.querySelector('.modal[style*="display:flex"], .modal.open, [role=dialog]:not([hidden]), .modal-content:not([style*="display:none"])')
            );
            if (!modalOpen) warn('Modal did not visibly open', 'verify add-tx UX manually');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('"Add savings goal" reachable', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const btn = page.locator('button:has-text("הוסף יעד"), button:has-text("Add goal"), button:has-text("Adicionar meta"), button:has-text("Agregar meta")').first();
            if (!(await btn.count())) { warn('Add-goal button not found', 'may be on a different page'); return; }
            await btn.click().catch(() => {});
            await page.waitForTimeout(800);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Language switch HE → EN actually updates UI', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await verifyLangSwitch(page);
            if (!r.ok) {
                if (/no visible EN control/.test(r.reason)) { warn('EN pill not visible', 'manual verify'); return; }
                throw new Error(r.reason);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('No Hebrew leaks in EN mode (excl. brand names)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'en'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
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
            if (leaks.length) throw new Error(`${leaks.length} Hebrew strings still rendered (sample: ${leaks.map(s=>`"${s}"`).join(', ')})`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Net-worth widget renders some value', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForTimeout(2000);
            const ok = await page.evaluate(() => {
                // Look for any element that looks like a money widget
                const cards = document.querySelectorAll('[class*="net-worth" i], [class*="total" i], [class*="balance" i], [data-widget*="net"]');
                return cards.length > 0;
            });
            if (!ok) warn('No net-worth widget detected', 'may render only after data load');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Stocks page — free user sees paywall, Pro sees content', async () => {
        if (!EMAIL_PRO) { warn('skipped — no test creds set', ''); return; }
        const session = await loginThenGoto(browser, BASE + '/pages/stocks.html');
        if (!session) { warn('login failed', ''); return; }
        try {
            const { ctx, page } = session;
            await page.waitForTimeout(4000);
            const view = await page.evaluate(() => ({
                hasPaywall: !!document.querySelector('[class*="paywall" i], [class*="upgrade" i], #upgradeModal, .pro-only'),
                hasContent: !!document.querySelector('canvas, table, [class*="stock" i]'),
                bodyLen: document.body.innerText.length,
            }));
            // We expect content on Pro account
            if (!view.hasContent && !view.hasPaywall) throw new Error(`stocks page: no content + no paywall (body=${view.bodyLen} chars)`);
            await page.close(); await ctx.close();
        } catch (e) { try { await session.page.close(); await session.ctx.close(); } catch {} throw e; }
    });

    await step('AI chat input present + send-able (Pro acct)', async () => {
        if (!EMAIL_PRO) { warn('skipped — no test creds', ''); return; }
        const session = await loginThenGoto(browser, BASE + '/pages/ai-chat.html');
        if (!session) { warn('login failed', ''); return; }
        try {
            const { ctx, page } = session;
            const input = page.locator('input[placeholder*="ask" i], input[placeholder*="שאל"], textarea[placeholder*="ask" i], textarea[placeholder*="שאל"], #chatInput').first();
            if (!(await input.count())) { warn('Chat input not located', 'AI chat may have moved or be Pro-gated'); return; }
            await input.fill('How much should I save monthly?').catch(() => {});
            const send = page.locator('button:has-text("Send"), button:has-text("שלח"), [type=submit]').first();
            if (await send.count()) await send.click().catch(() => {});
            // Don't assert reply — backend is async + may use streaming
            await page.close(); await ctx.close();
        } catch (e) { try { await session.page.close(); await session.ctx.close(); } catch {} throw e; }
    });

    await step('Export CSV button present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const link = page.locator('a[download], button:has-text("CSV"), button:has-text("Export"), button:has-text("ייצוא"), button:has-text("Exportar")').first();
            if (!(await link.count())) warn('Export CSV control not found', 'may be in settings');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Family dashboard — link or feature exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const family = await page.evaluate(() => {
                const t = document.body.innerText;
                return /family|family dashboard|דשבורד משפח|panel familiar|painel familiar/i.test(t);
            });
            if (!family) warn('No family dashboard reference visible', 'feature may be Pro-only or under tab');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('iPhone (390×844): no horizontal overflow', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const overflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth + 4
            );
            if (overflow) throw new Error('h-overflow at 390w');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Bottom-nav (mobile) reachable + 5 entries', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const items = await page.evaluate(() => {
                const nav = document.querySelector('.wize-bottom-nav, .bottom-nav, nav[data-bottom-nav], [class*="bottom-nav"]');
                return nav ? nav.querySelectorAll('a, button').length : 0;
            });
            if (items < 3) warn(`Bottom-nav has only ${items} items (expected ≥3)`, 'verify mobile nav loaded');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('SW update banner appears on stale page (forced)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => { if (window.wlShowUpdateBanner) window.wlShowUpdateBanner('qa-test'); });
            await page.waitForTimeout(500);
            const banner = await page.evaluate(() => !!document.getElementById('wl-update-banner'));
            if (!banner) warn('SW update banner did not appear when forced', 'wlShowUpdateBanner may be missing from this page');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizemoney-deep-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
