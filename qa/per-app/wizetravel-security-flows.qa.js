#!/usr/bin/env node
// WizeTravel — security & resilience flows. Parallels wizetax-security-flows.
//   1. Trackers gone — confirm no gtag.js, no clarity.ms beacon loads.
//   2. AI chat XSS — <script> payload renders as text, no alert fires.
//   3. CSP cleanliness — no console CSP violations on first paint.
//   4. PWA install — manifest reachable + start_url + icons + (best-effort) SW.
//   5. Open redirect probes — common ?next= / ?redirect= params don't bounce off-site.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://travel.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTravel-Security');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        waitUntil: 'load', timeout: 45000,
    });
    await page.waitForTimeout(2500);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. Trackers removed — gtag.js + clarity.ms must NOT be requested ───
    await step('No third-party trackers (GA, Clarity) load on first paint', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const tracker = [];
        page.on('request', req => {
            const u = req.url();
            if (/googletagmanager\.com|google-analytics\.com|clarity\.ms/i.test(u)) tracker.push(u);
        });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            if (tracker.length) throw new Error(`tracker requests detected (${tracker.length}): ${tracker[0]}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. AI chat XSS guard ───────────────────────────────────────────────
    await step('AI chat XSS: <script> in user message does not execute', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/ai');
        let alerted = false;
        page.on('dialog', async d => { alerted = true; await d.dismiss(); });
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 8000 });
            const tag = 'xss-' + Date.now();
            await ta.fill('Render verbatim: <script>alert("' + tag + '")</script>');
            const send = page.locator('button:has-text("→"), button[type=submit], button:has-text("Send"), button:has-text("שלח")').first();
            if (!(await send.count())) { warn('No send button on /ai', 'cannot probe XSS path'); return; }
            await send.click();
            await page.waitForTimeout(3500);
            if (alerted) throw new Error('payload triggered alert() — XSS hole in AI chat renderer');
            const liveScript = await page.evaluate((t) =>
                Array.from(document.querySelectorAll('script')).some(s => (s.textContent || '').includes(t)),
                tag,
            );
            if (liveScript) throw new Error('user-supplied <script> ended up as a live <script> element');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. No CSP violations during first paint ────────────────────────────
    await step('CSP: zero console violations during first paint of /', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        const cspErrs = [];
        page.on('console', m => {
            if (m.type() === 'error' && /content security policy|csp|refused to (load|execute)/i.test(m.text())) {
                cspErrs.push(m.text());
            }
        });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            if (cspErrs.length) throw new Error(`${cspErrs.length} CSP violations: ${cspErrs[0].slice(0, 140)}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. PWA install — manifest + start_url + icons + SW ─────────────────
    await step('PWA: manifest reachable with start_url + icons; SW registered (best-effort)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const m = await page.evaluate(async () => {
                const link = document.querySelector('link[rel="manifest"]');
                if (!link) return { ok: false, why: 'no <link rel="manifest">' };
                const r = await fetch(link.href);
                if (!r.ok) return { ok: false, why: 'manifest ' + r.status };
                const j = await r.json().catch(() => null);
                if (!j) return { ok: false, why: 'manifest not JSON' };
                if (!j.start_url) return { ok: false, why: 'no start_url' };
                if (!j.icons || !j.icons.length) return { ok: false, why: 'no icons' };
                return { ok: true };
            });
            if (!m.ok) throw new Error('manifest: ' + m.why);
            await page.waitForTimeout(2500);
            const swOk = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return false;
                const reg = await navigator.serviceWorker.getRegistration();
                return !!reg;
            });
            if (!swOk) warn('No SW registered on /', 'PWA installable but no offline support');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. Open redirect probes ────────────────────────────────────────────
    await step('Open redirect: ?next= / ?redirect= / ?return_to= are not honoured off-site', async () => {
        const params = ['next', 'redirect', 'return_to', 'url'];
        const evil = 'https://evil.example/';
        const failures = [];
        for (const p of params) {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            try {
                await page.goto(BASE + '/?' + p + '=' + encodeURIComponent(evil), { waitUntil: 'load', timeout: 25000 });
                await page.waitForTimeout(1200);
                const host = new URL(page.url()).host;
                if (host !== new URL(BASE).host) failures.push(`?${p}= bounced to ${host}`);
            } finally { await page.close(); await ctx.close(); }
        }
        if (failures.length) throw new Error(failures.join(' · '));
    });

    finalize();
    await browser.close();
})();
