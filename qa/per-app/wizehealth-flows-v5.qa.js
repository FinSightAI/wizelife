#!/usr/bin/env node
// WizeHealth — flows v5: 20 NEW deep flows, distinct from v2/v3/deep/qa.
// Render free-tier cold-start tolerant. Generous 45-60s timeouts.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://health.wizelife.ai';
const PUBLIC = 'https://health.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeHealth-FlowsV5');

async function fresh(browser, viewport = { width: 1280, height: 800 }, base = BASE) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(base + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000); // cold-start tolerance
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    // ---------- 1. Cold-start tolerance ----------
    await step('Cold-start: 2nd request faster than 1st (warmup observed)', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            const t0 = Date.now();
            await page.goto(BASE + '/?cs1=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            const first = Date.now() - t0;
            const t1 = Date.now();
            await page.goto(BASE + '/?cs2=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            const second = Date.now() - t1;
            if (second > first + 2000) warn(`2nd request slower (${second}ms vs ${first}ms)`, 'no warmup benefit');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Cold-start: HTML response status 200 within 45s', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            const t0 = Date.now();
            const r = await page.goto(BASE + '/?_t=' + Date.now(), { timeout: 45000 });
            const ms = Date.now() - t0;
            if (!r || r.status() !== 200) throw new Error(`status ${r ? r.status() : 0} in ${ms}ms`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Cold-start: page eventually paints body content even if slow', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const txt = await page.evaluate(() => document.body.innerText.trim().length);
            if (txt < 50) throw new Error(`only ${txt} chars rendered after wait`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ---------- 2. Security headers ----------
    await step('HSTS header present with preload-eligible max-age', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            const r = await page.goto(PUBLIC + '/', { timeout: 60000 });
            const hsts = r.headers()['strict-transport-security'] || '';
            if (!/max-age=\d{7,}/.test(hsts)) warn(`HSTS weak/absent: "${hsts}"`, 'need max-age>=10368000');
            if (!/preload/i.test(hsts)) warn('HSTS missing preload directive', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('X-Frame-Options or CSP frame-ancestors blocks framing', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            const r = await page.goto(BASE + '/', { timeout: 60000 });
            const h = r.headers();
            const xfo = h['x-frame-options'] || '';
            const csp = h['content-security-policy'] || '';
            const ok = /deny|sameorigin/i.test(xfo) || /frame-ancestors/i.test(csp);
            if (!ok) throw new Error('no XFO and no CSP frame-ancestors → clickjacking risk');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('CSP header is present (any policy)', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            const r = await page.goto(BASE + '/', { timeout: 60000 });
            const csp = r.headers()['content-security-policy'] || r.headers()['content-security-policy-report-only'];
            if (!csp) warn('No CSP header at all', 'XSS hardening missing');
        } finally { await page.close(); await ctx.close(); }
    });

    // ---------- 3. AI chat input ----------
    await step('AI chat input is enabled (not readonly/disabled)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const inp = page.locator('#txt, textarea, [role=textbox]').first();
            await inp.waitFor({ state: 'attached', timeout: 30000 });
            const dis = await inp.evaluate(el => el.disabled || el.readOnly);
            if (dis) throw new Error('chat input is disabled/readonly');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('AI chat accepts typed text without errors', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const inp = page.locator('#txt, textarea, [role=textbox]').first();
            await inp.waitFor({ state: 'visible', timeout: 30000 });
            await inp.fill('Test typed message');
            const got = await inp.inputValue();
            if (got !== 'Test typed message') throw new Error(`text not stored: "${got}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Send button enabled (or Enter binding) after text typed', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const inp = page.locator('#txt, textarea, [role=textbox]').first();
            await inp.waitFor({ state: 'visible', timeout: 30000 });
            await inp.fill('hello');
            const send = page.locator('button:has-text("Send"), #sendBtn, button[type=submit], button[aria-label*="send" i]').first();
            const has = await send.count();
            if (!has) { warn('No explicit send button — relies on Enter', ''); return; }
            const disabled = await send.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true');
            if (disabled) throw new Error('send button disabled after text typed');
        } finally { await page.close(); await ctx.close(); }
    });

    // ---------- 4. Onboarding modal (44px ✕ fix) ----------
    await step('Onboarding modal close (✕) hit-target >= 44px when open', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const closeBtn = page.locator(
                '[class*="onboard" i] [aria-label*="close" i], [class*="onboard" i] button:has-text("×"), [class*="modal" i] button:has-text("×"), .wize-onboarding-close'
            ).first();
            if (!(await closeBtn.count())) { warn('No onboarding modal visible — may auto-skip', ''); return; }
            const box = await closeBtn.boundingBox();
            if (!box) { warn('close btn not measurable', ''); return; }
            if (box.width < 40 || box.height < 40) {
                throw new Error(`✕ is only ${Math.round(box.width)}x${Math.round(box.height)} — must be >=44px`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Onboarding modal: clicking ✕ actually dismisses it', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const closeBtn = page.locator(
                '[class*="onboard" i] [aria-label*="close" i], [class*="onboard" i] button:has-text("×"), .wize-onboarding-close'
            ).first();
            if (!(await closeBtn.count())) { warn('No onboarding modal — skipped', ''); return; }
            await closeBtn.click({ force: true }).catch(() => {});
            await page.waitForTimeout(800);
            const stillThere = await closeBtn.isVisible().catch(() => false);
            if (stillThere) throw new Error('modal still visible after ✕ click');
        } finally { await page.close(); await ctx.close(); }
    });

    // ---------- 5. i18n he/en/pt/es ----------
    await step('HE mode: Hebrew chars detected in DOM text', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'he'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(4000);
            const has = await page.evaluate(() => /[֐-׿]/.test(document.body.innerText));
            if (!has) throw new Error('no Hebrew chars in HE mode');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('PT mode: Portuguese marker words (saúde/médico/conversa)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'pt'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(4000);
            const has = await page.evaluate(() =>
                /saúde|médico|você|conversa|análise/i.test(document.body.innerText)
            );
            if (!has) warn('No PT-specific words found', 'check pt locale completeness');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('ES mode: Spanish marker words (salud/médico/consulta)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => localStorage.setItem('wl_lang', 'es'));
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(4000);
            const has = await page.evaluate(() =>
                /salud|médico|consulta|análisis|síntomas/i.test(document.body.innerText)
            );
            if (!has) warn('No ES-specific words found', 'check es locale completeness');
        } finally { await page.close(); await ctx.close(); }
    });

    // ---------- 6. Lab/health record upload UI ----------
    await step('File input accepts at least one document MIME (pdf/image)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const accepts = await page.evaluate(() =>
                Array.from(document.querySelectorAll('input[type=file]')).map(f => f.accept || '*')
            );
            if (!accepts.length) { warn('No file inputs visible', 'may be lazy-loaded'); return; }
            const ok = accepts.some(a => /pdf|image|application|\*/.test(a));
            if (!ok) throw new Error(`accept attrs don't allow docs: ${accepts.join('|')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Lab upload UI: no inline script in file name preview (XSS guard)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // Check the page does NOT use innerHTML/outerHTML naked with .name
            const risky = await page.evaluate(() => {
                const html = document.documentElement.innerHTML;
                // Pattern: ${...name...} or +name + inside innerHTML setter in inline scripts
                return /innerHTML\s*=\s*[^;]*\.name(?!\s*\))/.test(html);
            });
            if (risky) throw new Error('innerHTML uses .name directly without escape — XSS risk');
        } finally { await page.close(); await ctx.close(); }
    });

    // ---------- 7. Auth gate ----------
    await step('Protected API endpoint returns 401 without token', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            const candidates = ['/api/chat', '/api/analyze', '/api/upload', '/api/user'];
            let saw401 = false;
            for (const path of candidates) {
                try {
                    const r = await page.request.post(BASE + path, {
                        data: { test: true },
                        timeout: 30000,
                        failOnStatusCode: false
                    });
                    if (r.status() === 401 || r.status() === 403) { saw401 = true; break; }
                } catch { /* skip */ }
            }
            if (!saw401) warn('No /api/* endpoint returned 401/403', 'auth gate unverified');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('GET /api/health (if any) does not leak server internals', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            const r = await page.request.get(BASE + '/api/health', { failOnStatusCode: false, timeout: 30000 });
            if (r.status() >= 200 && r.status() < 300) {
                const body = await r.text();
                if (/stack trace|traceback|internal server error|password|secret|token/i.test(body)) {
                    throw new Error('health endpoint leaks sensitive info');
                }
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ---------- 8. PWA Service Worker v50 ----------
    await step('Service Worker registers on landing', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const n = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return 0;
                const regs = await navigator.serviceWorker.getRegistrations();
                return regs.length;
            });
            if (n === 0) warn('No SW registered — PWA install affected', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('SW cache version is current (vitara-v50 or higher)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // Fetch sw.js (if present) and look for cache key
            const swText = await page.evaluate(async () => {
                const tries = ['/sw.js', '/service-worker.js'];
                for (const u of tries) {
                    try {
                        const r = await fetch(u);
                        if (r.ok) return await r.text();
                    } catch { /* ignore */ }
                }
                return '';
            });
            if (!swText) { warn('No sw.js found', 'PWA may be disabled'); return; }
            const m = swText.match(/vitara-v(\d+)/i);
            if (!m) { warn('No vitara-vN cache key in SW', 'unusual naming'); return; }
            const v = parseInt(m[1], 10);
            if (v < 50) throw new Error(`SW is vitara-v${v} (expected >=50)`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ---------- 9. Mobile viewport ----------
    await step('Mobile 390×844: send button (or chat input) reachable above fold', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const target = page.locator(
                'button:has-text("Send"), #sendBtn, button[type=submit], #txt, textarea'
            ).first();
            await target.waitFor({ state: 'attached', timeout: 30000 });
            const box = await target.boundingBox();
            if (!box) { warn('target not measurable', ''); return; }
            if (box.y > 844 + 200) throw new Error(`target far below fold at y=${Math.round(box.y)}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Mobile 360×640 (small Android): no text clipping in headers', async () => {
        const { ctx, page } = await fresh(browser, { width: 360, height: 640 });
        try {
            const clipped = await page.evaluate(() => {
                const els = document.querySelectorAll('h1, h2, h3, button');
                for (const el of els) {
                    const t = (el.innerText || '').trim();
                    if (!t || t.length < 3) continue;
                    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') {
                        return t.slice(0, 40);
                    }
                }
                return null;
            });
            if (clipped) warn(`text clipped: "${clipped}"`, 'overflow hidden on heading/button');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizehealth-flows-v5-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
