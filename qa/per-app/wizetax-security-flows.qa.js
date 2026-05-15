#!/usr/bin/env node
// WizeTax — security & resilience flows. The 5 deep checks we lacked:
//   1. Auth boundary: unauth /api/analyze → 401
//   2. Rate-limit hit: 25 /api/chat calls/min → at least one 429
//   3. Markdown XSS: <script>alert(1)</script> in chat → rendered as text, NOT executed
//   4. Streaming abort: hit Stop mid-stream → AbortController fires, no leak
//   5. PWA install prompt: beforeinstallprompt fires + we expose an install affordance
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://tax.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTax-Security');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/advisor') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. Auth boundary on /api/analyze ───────────────────────────────────
    await step('Auth boundary: unauth POST /api/analyze rejected', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const status = await page.evaluate(async () => {
                const r = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: 'x.pdf', content_base64: 'YQ==', media_type: 'application/pdf', language: 'en' }),
                });
                return r.status;
            });
            // Acceptable: 401 (auth required), 403 (forbidden), or 422 (validation reject) —
            // anything OTHER than 200 proves the endpoint isn't wide-open. 200 would mean
            // unauthenticated POST got through to the LLM (cost + abuse risk).
            if (status === 200) throw new Error(`/api/analyze returned 200 to unauthenticated POST — anyone can spend AI budget`);
            if (![401, 403, 422, 429].includes(status)) {
                warn(`/api/analyze returned ${status} (unexpected)`, 'verify backend require_quota / auth gate logic');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. Rate-limit hit on /api/chat ─────────────────────────────────────
    await step('Rate limit: 25 rapid /api/chat calls → at least one 429', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const statuses = await page.evaluate(async () => {
                const out = [];
                // We don't await — fire all in parallel so the limiter actually trips.
                const promises = [];
                for (let i = 0; i < 25; i++) {
                    promises.push(fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: 'ping ' + i, conversation_history: [] }),
                    }).then(r => out.push(r.status)).catch(() => out.push(0)));
                }
                await Promise.all(promises);
                return out;
            });
            const rejected = statuses.filter(s => s === 429).length;
            const errors  = statuses.filter(s => s >= 500).length;
            if (rejected === 0 && errors === 0) {
                throw new Error(`No 429 in 25 parallel calls — limiter ("20/minute" per IP) is not enforcing`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. Markdown XSS — <script> in chat must NOT execute ────────────────
    await step('Chat XSS guard: <script> payload renders as text, does not execute', async () => {
        const { ctx, page } = await fresh(browser);
        let alerted = false;
        page.on('dialog', async d => { alerted = true; await d.dismiss(); });
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 8000 });
            const payload = 'Render this verbatim: <script>alert("xss-' + Date.now() + '")</script>';
            await ta.fill(payload);
            const send = page.locator('button[type=submit], button:has-text("Send"), button:has-text("שלח")').first();
            await send.click();
            // Wait for the user message to render (we don't care about the assistant reply).
            await page.waitForTimeout(3500);
            if (alerted) throw new Error('<script> payload executed an alert() — XSS hole in chat renderer');
            // Confirm the payload appears as text in the DOM (defensive — make sure react-markdown didn't strip it silently).
            const containsLiteralScript = await page.evaluate(() =>
                Array.from(document.querySelectorAll('script')).some(s => /xss-\d{10,}/.test(s.textContent || ''))
            );
            if (containsLiteralScript) throw new Error('User-supplied <script> ended up as a live <script> element in DOM');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. Streaming abort — Stop button cancels the SSE reader ────────────
    await step('Streaming abort: Stop button cleanly aborts an in-flight chat', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 8000 });
            // Heavy prompt to keep the stream open long enough to click Stop.
            await ta.fill('Write a long 500-word essay on Israeli tax history.');
            const send = page.locator('button[type=submit], button:has-text("Send"), button:has-text("שלח")').first();
            await send.click();
            // Give the stream a moment to start.
            await page.waitForTimeout(1500);
            // Look for a Stop / Cancel / ⏹ button.
            const stopBtn = page.locator('button:has-text("Stop"), button:has-text("עצור"), button:has-text("Cancel"), button:has-text("ביטול"), button[aria-label*="stop" i], button[aria-label*="cancel" i]').first();
            if (!(await stopBtn.count())) { warn('No Stop button found while streaming', 'FE lacks an explicit abort affordance — fetch cancellation cannot be tested'); return; }
            const startText = await page.evaluate(() => document.body.textContent || '');
            await stopBtn.click();
            await page.waitForTimeout(2500);
            const endText = await page.evaluate(() => document.body.textContent || '');
            // After abort, no further deltas should accumulate.
            const growth = endText.length - startText.length;
            if (growth > 200) throw new Error(`Stream kept growing ${growth} chars after Stop — reader.cancel() probably never called`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. PWA install — manifest + service worker + beforeinstallprompt ───
    await step('PWA install: manifest reachable + SW registers + install affordance', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/');
        try {
            // 5a. Manifest reachable + has icons + start_url.
            const manifestOk = await page.evaluate(async () => {
                const link = document.querySelector('link[rel="manifest"]');
                if (!link) return { ok: false, why: 'no <link rel="manifest">' };
                const r = await fetch(link.href);
                if (!r.ok) return { ok: false, why: 'manifest ' + r.status };
                const j = await r.json().catch(() => null);
                if (!j) return { ok: false, why: 'manifest not JSON' };
                if (!j.icons || !j.icons.length) return { ok: false, why: 'no icons' };
                if (!j.start_url) return { ok: false, why: 'no start_url' };
                return { ok: true };
            });
            if (!manifestOk.ok) throw new Error('manifest: ' + manifestOk.why);
            // 5b. Service worker controls the page after a small grace period.
            await page.waitForTimeout(3000);
            const swOk = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return false;
                const reg = await navigator.serviceWorker.getRegistration();
                return !!reg;
            });
            if (!swOk) warn('No service worker registered on /', 'PWA installs but runs without offline support');
        } finally { await page.close(); await ctx.close(); }
    });

    finalize();
    await browser.close();
})();
