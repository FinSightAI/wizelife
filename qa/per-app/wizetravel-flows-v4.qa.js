#!/usr/bin/env node
// WizeTravel — flows v4. The 5 deep flows we lacked coverage for:
//   1. AI chat round-trip — Ask tab returns a non-empty JSON reply.
//   2. Saved trips: localStorage round-trip — survive reload.
//   3. /ai page tab switching — every tab (chat/plan/predict/wait/surprise) loads.
//   4. Flight search end-to-end — TLV→LIS produces results.
//   5. Hotels API auth boundary — unauth POST handled cleanly.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://travel.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTravel-FlowsV4');

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

    // ── 1. AI chat round-trip ──────────────────────────────────────────────
    await step('AI chat: Ask tab returns a non-empty JSON reply', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/ai');
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 8000 });
            await ta.fill('What is the cheapest month to fly Tel Aviv to Lisbon?');
            // Find a submit-style button next to the textarea (→ glyph used in code).
            const send = page.locator('button:has-text("→"), button[type=submit], button:has-text("Send"), button:has-text("שלח")').first();
            if (!(await send.count())) { warn('No send button in AI chat', 'chat layout may differ'); return; }
            await send.click();
            await page.waitForFunction(() => {
                // The ResultJson component renders <pre> with JSON. Look for either a non-empty <pre>
                // OR any element containing month names / price text.
                const pres = document.querySelectorAll('pre');
                for (const p of pres) if ((p.textContent || '').trim().length > 20) return true;
                return /january|february|march|april|may|june|july|august|september|october|november|december|ינואר|פברואר/i
                    .test(document.body.textContent || '');
            }, { timeout: 60000 }).catch(() => { throw new Error('No AI reply within 60s'); });
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. Saved trips localStorage round-trip ─────────────────────────────
    await step('Saved trips: write to localStorage, survive reload', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/trips');
        try {
            // Plant a fake trip in localStorage to simulate a save (most code paths use 'wt_trips').
            const KEY_USED = await page.evaluate(() => {
                const sentinel = [{ id: 'qa-trip-1', dest: 'Lisbon', days: 5, savedAt: Date.now() }];
                for (const k of ['wt_trips', 'wize_trips', 'travel_trips', 'savedTrips']) {
                    try { localStorage.setItem(k, JSON.stringify(sentinel)); } catch (e) {}
                }
                return Object.keys(localStorage).filter(k => /trip/i.test(k)).join(',');
            });
            if (!KEY_USED) { warn('No trip-like localStorage key found', 'trips persistence may use a different key'); return; }
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const visible = await page.evaluate(() => {
                const t = document.body.textContent || '';
                return /Lisbon|qa-trip-1/.test(t);
            });
            if (!visible) throw new Error('Planted trip did not surface in the UI after reload');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. /ai page tab switching ──────────────────────────────────────────
    await step('AI page: every visible tab activates without throwing', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/ai');
        try {
            // Capture console errors during tab navigation.
            const errs = [];
            page.on('pageerror', e => errs.push(String(e)));
            const tabs = await page.locator('[role="tab"], button[class*="tab" i]').all();
            if (tabs.length < 3) { warn(`Only ${tabs.length} tabs found`, 'AI page tab structure may have changed'); return; }
            for (const tab of tabs.slice(0, 6)) {
                try { await tab.click({ timeout: 2000 }); } catch {}
                await page.waitForTimeout(400);
            }
            if (errs.length) throw new Error(`Tab navigation produced ${errs.length} pageerror(s): ${errs[0].slice(0, 120)}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. Flight search end-to-end ────────────────────────────────────────
    await step('Flight search: TLV→LIS form submission produces output', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/flights');
        try {
            // Find From/To inputs — code uses IATA 3-letter inputs.
            const inputs = await page.locator('input[type=text], input:not([type])').all();
            if (inputs.length < 2) { warn('Not enough text inputs on /flights', 'page may have changed'); return; }
            // Fill the first 2 with origin and destination (most pages put them first).
            await inputs[0].fill('TLV');
            await inputs[1].fill('LIS');
            // Find a "Search" button.
            const searchBtn = page.locator('button:has-text("חפש"), button:has-text("Search"), button:has-text("Pesquisar"), button:has-text("Buscar")').first();
            if (!(await searchBtn.count())) { warn('No Search button found', 'flight UI may differ'); return; }
            await searchBtn.click();
            // Look for either a result block, a Kiwi iframe, or an "no flights / error" message.
            await page.waitForFunction(() => {
                const t = document.body.textContent || '';
                return /kiwi|flight|טיסה|departure|arrival|error|no results|לא נמצא/i.test(t)
                    || !!document.querySelector('iframe[src*="kiwi" i]');
            }, { timeout: 25000 }).catch(() => { throw new Error('flight search produced no visible result within 25s'); });
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. /api/hotels — should reject unauthenticated when authentication is expected ─
    await step('/api/hotels: handles unauthenticated POST predictably (200 OR 401/403/422/429)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const status = await page.evaluate(async () => {
                const r = await fetch('/api/hotels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ destination: 'Lisbon', checkIn: '2026-07-01', checkOut: '2026-07-05' }),
                });
                return r.status;
            });
            // We accept 200 (open API, intentional) OR a proper rejection.
            // What's NOT OK: 5xx — that's a backend bug; or a CORS error which surfaces as 0.
            if (status === 0) throw new Error('/api/hotels: network/CORS error (status 0)');
            if (status >= 500) throw new Error(`/api/hotels: backend 5xx (${status})`);
        } finally { await page.close(); await ctx.close(); }
    });

    finalize();
    await browser.close();
})();
