#!/usr/bin/env node
// WizeDeal — security v2 (20 checks).
// Real-estate deal analyzer on Vercel/Next.js, mapped at https://deal.wizelife.ai.
// Categories: headers (CSP/HSTS/XFO/Permissions/Referrer), plan-tampering,
// localStorage hygiene + deal-data PII, CORS/CSRF, XSS, input-range hardening,
// disclaimer-gate bypass, cookie flags, iframe sandbox, mixed content,
// SW scope (no /api caching), endpoint enumeration, Vercel deploy leakage.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://deal.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeDeal-SecurityV2');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500);
    return { ctx, page };
}

async function headHeaders(ctx) {
    const r = await ctx.request.get(BASE + '/?_t=' + Date.now(), { timeout: 20000 });
    const h = {};
    const all = r.headers();
    for (const k of Object.keys(all)) h[k.toLowerCase()] = all[k];
    return { status: r.status(), headers: h };
}

(async () => {
    const browser = await chromium.launch();

    // ─── 1. CSP — explicit allow-list ────────────────────────────────────────
    await step('CSP: Content-Security-Policy header present + has explicit script-src allow-list', async () => {
        const { ctx } = await fresh(browser);
        try {
            const { headers } = await headHeaders(ctx);
            const csp = headers['content-security-policy'] || headers['content-security-policy-report-only'];
            if (!csp) throw new Error('No CSP header at all on /');
            if (!/script-src/i.test(csp)) throw new Error('CSP lacks script-src directive (wide-open scripts)');
            if (/script-src[^;]*\*\s*[;]/i.test(csp)) warn('CSP script-src includes wildcard *', 'tighten allow-list');
            if (/'unsafe-inline'/i.test(csp) && !/'nonce-/i.test(csp)) warn("CSP allows 'unsafe-inline' without nonce", 'add per-request nonce');
        } finally { await ctx.close(); }
    });

    // ─── 2. HSTS — present + ≥1y + includeSubDomains + preload ───────────────
    await step('HSTS: ≥1y max-age + includeSubDomains + preload', async () => {
        const { ctx } = await fresh(browser);
        try {
            const { headers } = await headHeaders(ctx);
            const hsts = headers['strict-transport-security'];
            if (!hsts) throw new Error('No Strict-Transport-Security header');
            const m = hsts.match(/max-age=(\d+)/);
            if (!m || parseInt(m[1], 10) < 31536000) throw new Error(`HSTS max-age too low: ${hsts}`);
            if (!/includesubdomains/i.test(hsts)) warn('HSTS missing includeSubDomains', '');
            if (!/preload/i.test(hsts)) warn('HSTS missing preload', 'cannot submit to hstspreload.org');
        } finally { await ctx.close(); }
    });

    // ─── 3. Plan tampering — wl_sso.plan=pro should NOT unlock paid feature ──
    await step('Plan tampering: setting wl_sso.plan=pro in localStorage does not unlock Pro UI', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // Snapshot baseline: do paywall markers exist before tamper?
            const before = await page.evaluate(() => ({
                paywall: /upgrade|pro|paywall|unlock|premium/i.test(document.body.innerText),
                locked: !!document.querySelector('[data-locked], .locked, .paywall, [data-paywall]'),
            }));
            await page.evaluate(() => {
                try { localStorage.setItem('wl_sso', JSON.stringify({ plan: 'pro', tier: 'pro', email: 'attacker@example.com', uid: 'fake' })); } catch (e) {}
                try { localStorage.setItem('wl_plan', 'pro'); } catch (e) {}
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const after = await page.evaluate(() => ({
                paywall: /upgrade|pro|paywall|unlock|premium/i.test(document.body.innerText),
                locked: !!document.querySelector('[data-locked], .locked, .paywall, [data-paywall]'),
            }));
            // PAYWALL_ACTIVE=false today, so we EXPECT no paywall UI either way.
            // We only fail if a Pro-only feature flips visibly from gated→ungated client-side.
            if (before.locked && !after.locked) throw new Error('Setting wl_sso.plan=pro client-side removed a paywall gate — server must re-verify plan');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 4. localStorage hygiene — no API tokens / Firebase auth in stray keys
    await step('localStorage hygiene: no API tokens / Firebase ID tokens in unexpected keys', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const leaks = await page.evaluate(() => {
                const out = [];
                const expected = /^(wl_|wize|firebase:|disclaimer|onboard|theme|lang|i18n|nextjs|__next)/i;
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    const v = localStorage.getItem(k) || '';
                    // jwt-ish patterns or obvious tokens
                    const tokeny = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/.test(v) ||
                                   /sk_(live|test)_[A-Za-z0-9]{16,}/.test(v) ||
                                   /AIza[A-Za-z0-9_-]{30,}/.test(v);
                    if (tokeny && !expected.test(k)) out.push({ k, sample: v.slice(0, 60) });
                }
                return out;
            });
            if (leaks.length) throw new Error(`Token-like values in stray keys: ${leaks.map(l => l.k).join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 5. Deal data sensitivity — saved deals don't include user PII ───────
    await step('Deal data: saved deals in localStorage do not include user PII (email, phone, full name)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const piiHits = await page.evaluate(() => {
                const out = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (!/deal|propert|invest|listing|saved|history/i.test(k)) continue;
                    const v = localStorage.getItem(k) || '';
                    if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(v)) out.push({ k, why: 'email' });
                    if (/\b(\+?\d[\d\s\-().]{7,}\d)\b/.test(v) && !/^\d+$/.test(v)) {
                        // Phone heuristic — exclude price-only payloads
                        if (/(phone|tel|mobile)/i.test(v)) out.push({ k, why: 'phone' });
                    }
                    if (/"(firstName|lastName|fullName|ssn|passport)"\s*:/.test(v)) out.push({ k, why: 'name/id field' });
                }
                return out;
            });
            if (piiHits.length) throw new Error(`Deal records carry PII: ${piiHits.map(h => h.k + ':' + h.why).join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 6. CORS — /api/* strict (no wide-open Access-Control-Allow-Origin: *)
    await step('CORS: /api/* does not return Access-Control-Allow-Origin: * with credentials', async () => {
        const { ctx } = await fresh(browser);
        try {
            const probes = ['/api/analyze', '/api/deals', '/api/calc', '/api/mortgage'];
            let tested = 0;
            for (const p of probes) {
                const r = await ctx.request.fetch(BASE + p, {
                    method: 'OPTIONS',
                    headers: { Origin: 'https://evil.example.com', 'Access-Control-Request-Method': 'POST' },
                    timeout: 10000,
                }).catch(() => null);
                if (!r) continue;
                tested++;
                const h = r.headers();
                const acao = h['access-control-allow-origin'];
                const acac = h['access-control-allow-credentials'];
                if (acao === '*' && acac === 'true') {
                    throw new Error(`${p} returns ACAO:* with credentials:true — CORS misconfig`);
                }
                if (acao === 'https://evil.example.com') {
                    throw new Error(`${p} reflects arbitrary Origin (evil.example.com) — CORS bypass`);
                }
            }
            if (tested === 0) warn('No /api/* OPTIONS preflight responses captured', 'endpoints may not exist or block OPTIONS');
        } finally { await ctx.close(); }
    });

    // ─── 7. CSRF — POST /api/analyze requires Origin check ───────────────────
    await step('CSRF: POST /api/analyze rejects mismatched Origin', async () => {
        const { ctx } = await fresh(browser);
        try {
            const r = await ctx.request.fetch(BASE + '/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example.com' },
                data: JSON.stringify({ price: 1000000, downPayment: 200000 }),
                timeout: 15000,
            }).catch(() => null);
            if (!r) { warn('Could not POST /api/analyze', 'endpoint may not exist'); return; }
            const s = r.status();
            // 200 from a foreign Origin = no CSRF/Origin check. 401/403/404/422/429 all acceptable.
            if (s === 200) {
                const acao = (r.headers()['access-control-allow-origin'] || '').toLowerCase();
                if (acao === 'https://evil.example.com' || acao === '*') {
                    throw new Error('POST /api/analyze accepted cross-origin request with permissive ACAO — CSRF risk');
                }
                warn('POST /api/analyze returned 200 to evil Origin', 'verify Origin/Referer check server-side');
            }
        } finally { await ctx.close(); }
    });

    // ─── 8. XSS in deal form — property name <script> renders as text ────────
    await step('XSS in deal form: <script> in property name renders as text, no alert()', async () => {
        const { ctx, page } = await fresh(browser);
        let alerted = false;
        page.on('dialog', async d => { alerted = true; await d.dismiss(); });
        try {
            const payload = '<script>alert("xss-' + Date.now() + '")</script>';
            // Try common text inputs (property name / address / notes)
            const input = page.locator('input[type=text]:visible, input[name*="name" i]:visible, input[name*="address" i]:visible, input[placeholder*="name" i]:visible, textarea:visible').first();
            if (!(await input.count())) { warn('No text input found on landing', 'XSS surface may be deeper in wizard'); return; }
            await input.fill(payload).catch(() => {});
            await page.waitForTimeout(1500);
            if (alerted) throw new Error('alert() fired — XSS in deal form text rendering');
            const liveScript = await page.evaluate((needle) =>
                Array.from(document.querySelectorAll('script')).some(s => (s.textContent || '').includes(needle)), 'xss-');
            if (liveScript) throw new Error('User input ended up as a live <script> element');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 9. Mortgage simulator — extreme input values do not crash ───────────
    await step('Mortgage inputs: extreme numeric values do not crash / produce NaN-only output', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const num = page.locator('input[type=number], input[inputmode="numeric"], input[inputmode="decimal"]').first();
            if (!(await num.count())) { warn('No numeric input on landing', 'simulator may live on subroute'); return; }
            await num.fill('99999999999999999');
            await page.waitForTimeout(1200);
            const sane = await page.evaluate(() => {
                const txt = document.body.innerText;
                if (/Infinity|NaN(?!\.|\d)/.test(txt)) return false;
                return true;
            });
            if (!sane) throw new Error('Page renders Infinity/NaN with extreme input — needs clamp');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 10. Negative input handling — price=-1 must not yield negative payment
    await step('Negative input: price=-1 does not yield negative monthly payment', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const num = page.locator('input[type=number], input[inputmode="numeric"], input[inputmode="decimal"]').first();
            if (!(await num.count())) { warn('No numeric input on landing', 'cannot verify negative-input clamp'); return; }
            await num.fill('-1');
            await page.waitForTimeout(1200);
            const neg = await page.evaluate(() => {
                const txt = document.body.innerText;
                // Currency-prefixed or suffixed negative numbers
                return /[-−][\d,]+(?:\.\d+)?\s*(?:\$|€|₪|R\$|USD|EUR|ILS)/i.test(txt) ||
                       /(?:\$|€|₪|R\$|USD|EUR|ILS)\s*[-−][\d,]+/i.test(txt);
            });
            if (neg) throw new Error('Negative price input yielded a negative currency value in output — clamp inputs ≥0');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 11. WizeDisclaimer gate — not bypassable via URL param ──────────────
    await step('WizeDisclaimer gate: cannot be bypassed via ?nodisclaimer / ?skipDisclaimer URL param', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        try {
            // Fresh context (no localStorage acceptance) + bypass attempt
            await page.goto(BASE + '/?nodisclaimer=1&skipDisclaimer=true&_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3000);
            const acceptedViaURL = await page.evaluate(() => !!localStorage.getItem('wl_disclaimer_accepted'));
            if (acceptedViaURL) throw new Error('URL param wrote wl_disclaimer_accepted — gate is bypassable');
            // Also verify WizeDisclaimer API does not honor query strings
            const hijack = await page.evaluate(() => {
                const u = new URL(location.href);
                return ['nodisclaimer','skipDisclaimer','bypass'].some(k => u.searchParams.has(k));
            });
            if (!hijack) warn('Could not confirm URL params were preserved through redirects', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 12. Cookie flags — Secure + HttpOnly + SameSite ─────────────────────
    await step('Cookies: any auth/session cookie has Secure + HttpOnly + SameSite', async () => {
        const { ctx } = await fresh(browser);
        try {
            const cookies = await ctx.cookies(BASE);
            const sensitive = cookies.filter(c => /sess|auth|token|jwt|sid|csrf/i.test(c.name));
            if (sensitive.length === 0) { warn('No session/auth cookies set', 'app is likely stateless / token-in-storage'); return; }
            for (const c of sensitive) {
                if (!c.secure) throw new Error(`cookie ${c.name} missing Secure`);
                if (!c.httpOnly) throw new Error(`cookie ${c.name} missing HttpOnly`);
                if (!c.sameSite || c.sameSite === 'None') warn(`cookie ${c.name} SameSite=${c.sameSite || 'unset'}`, 'use Lax or Strict');
            }
        } finally { await ctx.close(); }
    });

    // ─── 13. iframe sandbox — embedded maps/charts have sandbox attribute ────
    await step('iframe sandbox: any embedded iframe declares sandbox', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const frames = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('iframe')).map(f => ({
                    src: f.src,
                    sandbox: f.getAttribute('sandbox'),
                    referrerpolicy: f.getAttribute('referrerpolicy'),
                }));
            });
            if (frames.length === 0) return; // nothing to check — pass
            const unsandboxed = frames.filter(f => !f.sandbox && !/about:blank|^$/.test(f.src || ''));
            if (unsandboxed.length) {
                warn(`${unsandboxed.length} iframe(s) without sandbox`, unsandboxed.map(f => f.src).join(', ').slice(0, 160));
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 14. Permissions-Policy — camera + microphone + geolocation locked ───
    await step('Permissions-Policy: camera + microphone locked down', async () => {
        const { ctx } = await fresh(browser);
        try {
            const { headers } = await headHeaders(ctx);
            const pp = headers['permissions-policy'] || headers['feature-policy'];
            if (!pp) throw new Error('No Permissions-Policy header');
            // Each capability should be either =() (none) or a tight self-only allow-list.
            for (const cap of ['camera', 'microphone']) {
                const re = new RegExp(cap + '\\s*=\\s*\\(([^)]*)\\)', 'i');
                const m = pp.match(re);
                if (!m) { warn(`Permissions-Policy missing ${cap}`, 'add `' + cap + '=()`'); continue; }
                const inside = m[1].trim();
                if (inside === '*' || /\*/.test(inside)) throw new Error(`Permissions-Policy ${cap} wide-open (*)`);
            }
        } finally { await ctx.close(); }
    });

    // ─── 15. Referrer-Policy — strict ────────────────────────────────────────
    await step('Referrer-Policy: strict-origin-when-cross-origin (or stricter)', async () => {
        const { ctx } = await fresh(browser);
        try {
            const { headers } = await headHeaders(ctx);
            const rp = (headers['referrer-policy'] || '').toLowerCase();
            if (!rp) throw new Error('No Referrer-Policy header');
            const acceptable = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
            if (!acceptable.some(v => rp.includes(v))) throw new Error(`Referrer-Policy too loose: ${rp}`);
        } finally { await ctx.close(); }
    });

    // ─── 16. Mixed content — no http:// subresources on https page ───────────
    await step('Mixed content: no http:// subresource URLs on https page', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const insecure = await page.evaluate(() => {
                const urls = [];
                document.querySelectorAll('script[src], link[href], img[src], iframe[src]').forEach(el => {
                    const u = el.getAttribute('src') || el.getAttribute('href') || '';
                    if (/^http:\/\//i.test(u)) urls.push(u);
                });
                return urls;
            });
            if (insecure.length) throw new Error(`Mixed content: ${insecure.slice(0, 3).join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 17. Service Worker scope — does not cache /api responses ────────────
    await step('SW scope: service worker does not cache /api/* responses', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const apiInCache = await page.evaluate(async () => {
                if (!('caches' in window)) return { skip: true };
                const names = await caches.keys();
                if (!names.length) return { skip: true };
                const hits = [];
                for (const n of names) {
                    const c = await caches.open(n);
                    const reqs = await c.keys();
                    for (const r of reqs) {
                        if (/\/api\//.test(r.url)) hits.push(r.url);
                    }
                }
                return { skip: false, hits };
            });
            if (apiInCache.skip) { warn('No CacheStorage entries to inspect', 'SW may not be active on this app'); return; }
            if (apiInCache.hits && apiInCache.hits.length) throw new Error(`SW cached /api/ responses: ${apiInCache.hits.slice(0, 2).join(', ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ─── 18. Endpoint enumeration — /api/admin, /api/internal → 404 ──────────
    await step('Endpoint enumeration: /api/admin + /api/internal + /api/debug return 404', async () => {
        const { ctx } = await fresh(browser);
        try {
            const targets = ['/api/admin', '/api/internal', '/api/debug', '/api/private', '/api/_internal'];
            const leaks = [];
            for (const t of targets) {
                const r = await ctx.request.get(BASE + t, { timeout: 10000 }).catch(() => null);
                if (!r) continue;
                const s = r.status();
                // 200 = exposed. 401/403 also reveal existence (info leak) — flag as warn.
                if (s === 200) leaks.push(`${t} → 200 (exposed!)`);
                else if (s === 401 || s === 403) warn(`${t} → ${s}`, 'returns auth-required instead of 404 — endpoint existence leaks');
            }
            if (leaks.length) throw new Error(leaks.join('; '));
        } finally { await ctx.close(); }
    });

    // ─── 19. X-Frame-Options DENY (or CSP frame-ancestors 'none') ────────────
    await step('Clickjacking: X-Frame-Options DENY or CSP frame-ancestors none', async () => {
        const { ctx } = await fresh(browser);
        try {
            const { headers } = await headHeaders(ctx);
            const xfo = (headers['x-frame-options'] || '').toUpperCase();
            const csp = headers['content-security-policy'] || '';
            const okXFO = xfo === 'DENY' || xfo === 'SAMEORIGIN';
            const okCSP = /frame-ancestors\s+'none'/i.test(csp) || /frame-ancestors\s+'self'/i.test(csp);
            if (!okXFO && !okCSP) throw new Error(`X-Frame-Options=${xfo || 'unset'} + no frame-ancestors CSP → clickjacking exposure`);
            if (xfo && xfo !== 'DENY' && !okCSP) warn(`X-Frame-Options=${xfo}`, 'DENY is stricter than SAMEORIGIN for this app');
        } finally { await ctx.close(); }
    });

    // ─── 20. Vercel deployment leakage — no internal metadata in bundles ─────
    await step('Vercel leakage: no /_vercel/deployment metadata or VERCEL_TOKEN in client bundle', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const leaks = await page.evaluate(async () => {
                const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src).slice(0, 30);
                const findings = [];
                for (const url of scripts) {
                    try {
                        const r = await fetch(url, { credentials: 'omit' });
                        if (!r.ok) continue;
                        const t = await r.text();
                        if (/VERCEL_TOKEN|vercel_oidc_token/i.test(t)) findings.push(url + ' :: VERCEL_TOKEN');
                        if (/\/_vercel\/deployment\b/i.test(t)) findings.push(url + ' :: /_vercel/deployment ref');
                        if (/VERCEL_GIT_COMMIT_REF/.test(t)) findings.push(url + ' :: git commit ref leaked');
                    } catch (e) {}
                }
                return findings;
            });
            if (leaks.length) throw new Error(`Vercel metadata leaked in bundle: ${leaks.slice(0, 2).join('; ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizedeal-security-v2-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
