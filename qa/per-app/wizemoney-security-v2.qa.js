#!/usr/bin/env node
// WizeMoney — security v2. 20 distinct security checks for the FinSight PWA.
// Categories: headers (CSP/HSTS/XFO/RP/PP), Firestore boundary, storage hygiene,
// PWA manifest+SW scope, mixed content, SRI, iframe sandbox, auth boundary on
// hypothetical APIs, plan-tampering, XSS via URL, leaked test data.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://money.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeMoney-SecurityV2');

async function fresh(browser, path = '/', viewport = { width: 1280, height: 800 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        waitUntil: 'domcontentloaded', timeout: 30000,
    }).catch(() => {});
    await page.waitForTimeout(2500);
    return { ctx, page };
}

async function fetchHeaders(page, path) {
    return await page.evaluate(async (url) => {
        const r = await fetch(url, { method: 'GET', credentials: 'omit' });
        const h = {};
        r.headers.forEach((v, k) => { h[k.toLowerCase()] = v; });
        return { status: r.status, headers: h };
    }, BASE + path);
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. CSP header on each page, no `*` in script-src ───────────────────
    await step('CSP present on dashboard/stocks/ai-chat and no `*` in script-src', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const pages = ['/pages/dashboard.html', '/pages/stocks.html', '/pages/ai-chat.html'];
            const missing = [];
            const looseStar = [];
            for (const p of pages) {
                const { headers } = await fetchHeaders(page, p);
                const csp = headers['content-security-policy'] || headers['content-security-policy-report-only'] || '';
                if (!csp) { missing.push(p); continue; }
                // Extract script-src directive (or default-src as fallback).
                const dir = (csp.match(/script-src[^;]*/i) || csp.match(/default-src[^;]*/i) || [''])[0];
                if (/(^|\s)\*($|\s)/.test(dir)) looseStar.push(p + ': ' + dir.trim());
            }
            if (missing.length) warn(`CSP header absent on ${missing.length} page(s)`, missing.join(', '));
            if (looseStar.length) throw new Error('script-src contains `*` — ' + looseStar[0]);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. Firestore rules sentinel — unauth read of /users/<rand>/transactions ─
    await step('Firestore: unauth read of /users/<random>/transactions denied', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const result = await page.evaluate(async () => {
                // Use the firestore REST endpoint with no auth token.
                const project = 'finzilla-7f1f9';
                const uid = 'qa-random-' + Math.random().toString(36).slice(2, 12);
                const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/users/${uid}/transactions`;
                try {
                    const r = await fetch(url, { method: 'GET' });
                    const body = await r.text();
                    return { status: r.status, body: body.slice(0, 300) };
                } catch (e) { return { status: 0, body: String(e) }; }
            });
            // 200 with documents would mean rules permit anonymous read.
            // 200 with empty documents array is also a leak indicator if rules don't deny.
            if (result.status === 200 && /"documents"\s*:\s*\[/.test(result.body)) {
                throw new Error(`Firestore returned 200 with documents to unauth read — rules permit anonymous list`);
            }
            if (![401, 403].includes(result.status) && result.status !== 200) {
                warn(`Firestore returned ${result.status} (expected 401/403)`, 'verify rules deny by default');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. localStorage — no Firebase ID tokens under unexpected keys ──────
    await step('localStorage: no Firebase ID tokens leaked outside firebase:authUser:* keys', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const leaks = await page.evaluate(() => {
                const out = [];
                // Firebase ID tokens are JWTs: eyJ...{base64}.{base64}.{base64}
                const jwtRe = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (!k) continue;
                    if (k.startsWith('firebase:authUser:')) continue; // expected location
                    if (k.startsWith('firebase:')) continue;
                    const v = localStorage.getItem(k) || '';
                    if (jwtRe.test(v)) out.push(k);
                }
                return out;
            });
            if (leaks.length) throw new Error('JWT-shaped tokens in localStorage keys: ' + leaks.join(','));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. PWA manifest start_url + no internal endpoints leaked ───────────
    await step('PWA manifest: start_url matches origin, no /api/internal leaks', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const m = await page.evaluate(async () => {
                const link = document.querySelector('link[rel="manifest"]');
                if (!link) return { ok: false, why: 'no manifest link' };
                const r = await fetch(link.href);
                const txt = await r.text();
                let j; try { j = JSON.parse(txt); } catch { return { ok: false, why: 'manifest not JSON' }; }
                return { ok: true, start_url: j.start_url, scope: j.scope, raw: txt };
            });
            if (!m.ok) throw new Error(m.why);
            // start_url should be relative or same-origin.
            if (m.start_url && /^https?:\/\//i.test(m.start_url) && !m.start_url.startsWith(BASE)) {
                throw new Error('manifest start_url is cross-origin: ' + m.start_url);
            }
            if (/\/(api\/(admin|internal|keys|debug)|\.env|secret)/i.test(m.raw)) {
                throw new Error('manifest leaks suspicious internal path');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. Service Worker scope ────────────────────────────────────────────
    await step('Service Worker scope matches app origin', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForTimeout(3000);
            const info = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return null;
                const reg = await navigator.serviceWorker.getRegistration();
                if (!reg) return { registered: false };
                return { registered: true, scope: reg.scope, scriptURL: reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL };
            });
            if (!info) throw new Error('navigator.serviceWorker unavailable');
            if (!info.registered) { warn('No SW registered on /', 'GH Pages base may be /finsight/ — try root path manually'); return; }
            // Custom domain → scope should be the origin root, NOT /finsight/.
            if (!info.scope.startsWith(BASE + '/')) throw new Error('SW scope ' + info.scope + ' does not match ' + BASE);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 6. Mixed content — zero http:// resources on each tested page ──────
    await step('No mixed-content (http://) resources on dashboard/stocks/ai-chat', async () => {
        const pages = ['/pages/dashboard.html', '/pages/stocks.html', '/pages/ai-chat.html'];
        for (const p of pages) {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            const insecure = [];
            page.on('request', req => {
                const u = req.url();
                if (u.startsWith('http://') && !u.startsWith('http://localhost') && !u.startsWith('http://127.')) insecure.push(u);
            });
            try {
                await page.goto(BASE + p + '?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
                await page.waitForTimeout(3000);
                if (insecure.length) throw new Error(p + ' loaded http:// resource: ' + insecure[0]);
            } finally { await page.close(); await ctx.close(); }
        }
    });

    // ── 7. External CDN scripts have integrity= (SRI) ──────────────────────
    await step('Third-party CDN scripts (chart.js/firebase) carry SRI integrity=', async () => {
        const { ctx, page } = await fresh(browser, '/pages/stocks.html');
        try {
            const offenders = await page.evaluate(() => {
                const out = [];
                const scripts = Array.from(document.querySelectorAll('script[src]'));
                for (const s of scripts) {
                    const src = s.src || '';
                    if (/cdn\.|jsdelivr|unpkg|cdnjs|gstatic|googleapis/i.test(src) && !s.integrity) {
                        out.push(src);
                    }
                }
                return out;
            });
            if (offenders.length) warn(`${offenders.length} CDN script(s) without SRI`, offenders[0]);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 8. Iframe sandbox attribute ────────────────────────────────────────
    await step('Embedded iframes carry a sandbox attribute', async () => {
        const pages = ['/pages/dashboard.html', '/pages/ai-chat.html', '/pages/stocks.html'];
        const offenders = [];
        for (const p of pages) {
            const { ctx, page } = await fresh(browser, p);
            try {
                // Wait a beat for any post-load redirect to settle before evaluating.
                await page.waitForTimeout(1500);
                const bad = await page.evaluate(() =>
                    Array.from(document.querySelectorAll('iframe')).filter(f => !f.hasAttribute('sandbox')).map(f => f.src || '(no src)')
                ).catch(() => []);
                if (bad.length) offenders.push(p + ' → ' + bad.join(','));
            } finally { await page.close(); await ctx.close(); }
        }
        if (offenders.length) warn(`${offenders.length} iframe(s) without sandbox`, offenders[0]);
    });

    // ── 9. Form CSRF — Firestore writes require ID token ───────────────────
    await step('Firestore write without Authorization header → 401/403', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const status = await page.evaluate(async () => {
                const project = 'finzilla-7f1f9';
                const uid = 'qa-csrf-' + Math.random().toString(36).slice(2, 10);
                const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/users/${uid}/transactions`;
                const r = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fields: { description: { stringValue: 'csrf-probe' } } }),
                });
                return r.status;
            });
            if (status === 200) throw new Error('Firestore POST without auth returned 200 — write rule missing');
            if (![401, 403].includes(status)) warn(`Firestore unauth POST → ${status}`, 'expected 401/403');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 10. API endpoint exposure ──────────────────────────────────────────
    await step('Internal-sounding endpoints (/api/keys|admin|internal) not reachable', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const probes = ['/api/keys', '/api/admin', '/api/internal', '/api/debug', '/.env', '/config.json'];
            const reachable = [];
            for (const p of probes) {
                const { status } = await fetchHeaders(page, p);
                // 200 on these paths would be a serious leak. 404/403 is fine.
                if (status === 200) reachable.push(p);
            }
            if (reachable.length) throw new Error('Reachable internal probe: ' + reachable.join(','));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 11. localStorage size sanity — no >500 KB single value ─────────────
    await step('localStorage: no oversized values (>500KB) suggesting log leakage', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const big = await page.evaluate(() => {
                const out = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    const v = localStorage.getItem(k) || '';
                    if (v.length > 500_000) out.push({ key: k, size: v.length });
                }
                return out;
            });
            if (big.length) warn(`${big.length} localStorage entry >500KB`, big[0].key + ' = ' + big[0].size + ' bytes');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 12. Plan-upgrade tampering — wl_sso.plan='pro' in localStorage ─────
    await step('Plan tampering: setting wl_sso.plan=pro should not unlock Pro features', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                localStorage.setItem('wl_sso', JSON.stringify({ plan: 'pro', uid: 'qa-tamper', email: 'qa@qa', ts: Date.now() }));
                localStorage.setItem('wl_plan', 'pro');
            });
            await page.goto(BASE + '/pages/ai-chat.html?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
            await page.waitForTimeout(3000);
            const unlocked = await page.evaluate(() => {
                const txt = (document.body.textContent || '').toLowerCase();
                // If a paywall would normally gate the page, we expect upgrade/locked text.
                const hasPaywall = /upgrade|pro plan|locked|paywall|שדרג/i.test(txt);
                return { hasPaywall, sample: txt.slice(0, 200) };
            });
            // Per CLAUDE.md, PAYWALL_ACTIVE=false right now — features are intentionally open.
            // We flag this as a warning so the team remembers to verify gating when PAYWALL_ACTIVE flips.
            if (!unlocked.hasPaywall) {
                warn('Tampered plan=pro grants access', 'expected because PAYWALL_ACTIVE=false; re-verify after Stripe goes live');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 13. CORS preflight — OPTIONS /api ──────────────────────────────────
    await step('CORS preflight on /api returns no wildcard with credentials', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const res = await page.evaluate(async (origin) => {
                try {
                    const r = await fetch(origin + '/api/', {
                        method: 'OPTIONS',
                        headers: { 'Origin': 'https://evil.example', 'Access-Control-Request-Method': 'POST' },
                    });
                    const h = {};
                    r.headers.forEach((v, k) => { h[k.toLowerCase()] = v; });
                    return { status: r.status, headers: h };
                } catch (e) { return { status: 0, error: String(e) }; }
            }, BASE);
            // FinSight is static — /api/ should NOT exist. If it does and ACAO=*, that's a finding.
            const acao = (res.headers || {})['access-control-allow-origin'];
            const acac = (res.headers || {})['access-control-allow-credentials'];
            if (acao === '*' && acac === 'true') throw new Error('CORS: ACAO=* with ACAC=true — credentials with wildcard');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 14. Click-jacking — X-Frame-Options or frame-ancestors ─────────────
    await step('Click-jacking: X-Frame-Options or CSP frame-ancestors set', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const { headers } = await fetchHeaders(page, '/pages/dashboard.html');
            const xfo = headers['x-frame-options'];
            const csp = headers['content-security-policy'] || '';
            const hasFA = /frame-ancestors\s/i.test(csp);
            if (!xfo && !hasFA) throw new Error('Neither X-Frame-Options nor CSP frame-ancestors present');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 15. HSTS — present, ≥1 year, includeSubDomains ─────────────────────
    await step('HSTS: max-age >= 31536000 with includeSubDomains', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const { headers } = await fetchHeaders(page, '/');
            const hsts = headers['strict-transport-security'] || '';
            if (!hsts) throw new Error('HSTS header missing');
            const m = hsts.match(/max-age=(\d+)/i);
            const age = m ? parseInt(m[1], 10) : 0;
            if (age < 31536000) throw new Error('HSTS max-age too short: ' + age);
            if (!/includeSubDomains/i.test(hsts)) warn('HSTS missing includeSubDomains', hsts);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 16. Referrer-Policy — strict ───────────────────────────────────────
    await step('Referrer-Policy is strict (no-referrer | same-origin | strict-origin*)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const { headers } = await fetchHeaders(page, '/');
            const rp = (headers['referrer-policy'] || '').toLowerCase();
            if (!rp) throw new Error('Referrer-Policy header missing');
            const strict = /^(no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin)$/.test(rp);
            if (!strict) warn('Referrer-Policy is ' + rp, 'consider strict-origin-when-cross-origin');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 17. Permissions-Policy — sensors locked ────────────────────────────
    await step('Permissions-Policy locks camera/microphone/geolocation/payment', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const { headers } = await fetchHeaders(page, '/');
            const pp = headers['permissions-policy'] || headers['feature-policy'] || '';
            if (!pp) throw new Error('Permissions-Policy header missing');
            const needs = ['camera', 'microphone', 'geolocation', 'payment'];
            const missing = needs.filter(n => !new RegExp(n + '\\s*=\\s*\\(\\s*\\)', 'i').test(pp) && !new RegExp(n + "\\s*'none'", 'i').test(pp));
            if (missing.length === needs.length) throw new Error('Permissions-Policy does not lock any sensor: ' + pp);
            if (missing.length) warn(`Permissions-Policy permissive on: ${missing.join(',')}`, pp);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 18. XSS via URL — ?q=<script> doesn't execute ──────────────────────
    await step('URL XSS: ?q=<script>alert()</script> does not execute on dashboard/stocks', async () => {
        const targets = ['/pages/dashboard.html', '/pages/stocks.html'];
        for (const p of targets) {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            let alerted = false;
            page.on('dialog', async d => { alerted = true; await d.dismiss(); });
            try {
                const payload = encodeURIComponent('<script>alert("xss-' + Date.now() + '")</script>');
                await page.goto(BASE + p + '?q=' + payload + '&search=' + payload, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
                await page.waitForTimeout(3000);
                if (alerted) throw new Error('URL payload executed alert() on ' + p);
            } finally { await page.close(); await ctx.close(); }
        }
    });

    // ── 19. Plan bypass via localStorage flag ──────────────────────────────
    await step('Plan bypass: wl_paywall_bypass=1 in localStorage does not unlock features unsafely', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                localStorage.setItem('wl_paywall_bypass', '1');
                localStorage.setItem('PAYWALL_BYPASS', 'true');
            });
            await page.goto(BASE + '/pages/ai-chat.html?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
            await page.waitForTimeout(3000);
            // If PAYWALL_ACTIVE flips to true in future, this should still gate.
            // For now, just check that the FE doesn't honor an arbitrary localStorage flag as auth.
            const planBecamePro = await page.evaluate(() => {
                const sso = localStorage.getItem('wl_sso');
                if (!sso) return false;
                try { return JSON.parse(sso).plan === 'pro'; } catch { return false; }
            });
            if (planBecamePro) throw new Error('Setting wl_paywall_bypass mutated wl_sso.plan to pro — FE auto-grants Pro on flag');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 20. No Stripe test card numbers in served HTML/JS ──────────────────
    await step('No Stripe test card numbers (4242 4242) in served HTML/JS', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const samples = ['/index.html', '/pages/dashboard.html', '/pages/ai-chat.html', '/js/plan.js', '/js/paywall.js'];
            const hits = [];
            for (const p of samples) {
                const r = await page.evaluate(async (url) => {
                    try {
                        const res = await fetch(url);
                        if (!res.ok) return '';
                        return (await res.text()).slice(0, 200_000);
                    } catch { return ''; }
                }, BASE + p);
                if (/4242[\s-]?4242[\s-]?4242[\s-]?4242/.test(r)) hits.push(p);
                if (/sk_live_[A-Za-z0-9]{16,}/.test(r)) hits.push(p + ' (LIVE Stripe secret!)');
            }
            if (hits.length) throw new Error('Stripe test/live patterns leaked: ' + hits.join(','));
        } finally { await page.close(); await ctx.close(); }
    });

    finalize();
    await browser.close();
})();
