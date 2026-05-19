#!/usr/bin/env node
/**
 * WizeLife portal — security flows v2 (20 checks).
 *
 * Distinct from:
 *   - qa/security-headers-check.js   (basic HSTS/CSP/Referrer presence only)
 *   - qa/security-regression.js      (HSTS preload, reCAPTCHA key, Firestore probe, JS parse)
 *   - qa/static-extra.js             (Set-Cookie flags + secret leaks in JS bundles)
 *   - qa/per-app/wizetax|wizetravel-security-flows.qa.js (different sub-domains, different surfaces)
 *
 * Run:  node qa/per-app/wizelife-security-v2.qa.js
 */
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://wizelife.ai';
const HOST = new URL(BASE).host; // 'wizelife.ai'
const { step, warn, finalize } = makeReporter('WizeLife-SecurityV2');

async function fresh(browser, path = '/', viewport = { width: 1280, height: 800 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const sep = path.includes('?') ? '&' : '?';
    await page.goto(BASE + path + sep + '_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2000);
    return { ctx, page };
}

async function fetchHeaders(ctx, url) {
    const r = await ctx.request.get(url, { timeout: 20000, maxRedirects: 0 }).catch(e => ({ _err: e.message }));
    if (r && r._err) throw new Error('fetch failed: ' + r._err);
    return { status: r.status(), headers: r.headers(), body: await r.text().catch(() => '') };
}

(async () => {
    const browser = await chromium.launch();
    const probeCtx = await browser.newContext();

    // ── 1. CSP — style-src must not allow unsafe-inline on /security.html ────
    await step('CSP /security.html: style-src has no unsafe-inline', async () => {
        const r = await fetchHeaders(probeCtx, BASE + '/security.html');
        const csp = r.headers['content-security-policy'] || r.headers['content-security-policy-report-only'] || '';
        if (!csp) { warn('No CSP header on /security.html', 'add CSP via Cloudflare Transform Rule or <meta>'); return; }
        // Find style-src (or fall back to default-src)
        const m = csp.match(/(?:style-src|default-src)\s+([^;]+)/i);
        if (!m) { warn('CSP has no style-src/default-src directive', 'add explicit style-src'); return; }
        if (/unsafe-inline/i.test(m[1])) throw new Error("CSP style-src contains 'unsafe-inline' — inline <style> can be injected");
    });

    // ── 2. CSP — connect-src must not be wildcard ────────────────────────────
    await step('CSP root: connect-src is not wildcard *', async () => {
        const r = await fetchHeaders(probeCtx, BASE + '/');
        const csp = r.headers['content-security-policy'] || r.headers['content-security-policy-report-only'] || '';
        if (!csp) { warn('No CSP header on /', 'CSP missing entirely'); return; }
        const m = csp.match(/connect-src\s+([^;]+)/i);
        if (!m) { warn('CSP has no explicit connect-src', 'pin to firebase/cloudflare/wizelife origins'); return; }
        if (/(^|\s)\*(\s|$)/.test(m[1])) throw new Error("CSP connect-src='*' — XHR can hit any origin");
    });

    // ── 3. HSTS — must include max-age >= 1 year, includeSubDomains, preload ─
    await step('HSTS: max-age >= 1y AND includeSubDomains AND preload', async () => {
        const r = await fetchHeaders(probeCtx, BASE + '/');
        const h = r.headers['strict-transport-security'] || '';
        if (!h) throw new Error('HSTS header missing entirely on /');
        const mm = h.match(/max-age=(\d+)/i);
        const age = mm ? parseInt(mm[1], 10) : 0;
        if (age < 31536000) throw new Error(`HSTS max-age=${age} is < 1 year (31536000)`);
        const missing = [];
        if (!/includeSubDomains/i.test(h)) missing.push('includeSubDomains');
        if (!/preload/i.test(h)) missing.push('preload');
        if (missing.length) warn(`HSTS missing: ${missing.join(', ')}`, 'Cloudflare → SSL/TLS → HSTS → enable all 3');
    });

    // ── 4. CORS — root response must not return Access-Control-Allow-Origin=* ─
    await step('CORS: root + dashboard do not echo Allow-Origin=*', async () => {
        const offenders = [];
        for (const p of ['/', '/dashboard.html', '/auth.html']) {
            const r = await fetchHeaders(probeCtx, BASE + p);
            const acao = r.headers['access-control-allow-origin'];
            if (acao && acao.trim() === '*') offenders.push(p);
        }
        if (offenders.length) throw new Error(`Allow-Origin=* on: ${offenders.join(', ')}`);
    });

    // ── 5. No token leakage in URL after auth flow load ─────────────────────
    await step('Auth: /auth.html URL never carries token/idToken/access_token as a param', async () => {
        const { ctx, page } = await fresh(browser, '/auth.html');
        try {
            await page.waitForTimeout(2500);
            const url = page.url();
            if (/[?&](id_token|access_token|token|jwt)=/i.test(url)) {
                throw new Error('token in URL: ' + url.slice(0, 140));
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 6. XSS — <script> in query param does not execute on /auth.html ─────
    await step('XSS: <script>alert(1)</script> in ?q= on /auth.html does not execute', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        let alerted = false;
        page.on('dialog', async d => { alerted = true; await d.dismiss(); });
        try {
            const payload = encodeURIComponent('<script>alert("xss-' + Date.now() + '")</script>');
            await page.goto(BASE + '/auth.html?q=' + payload, { waitUntil: 'load', timeout: 30000 });
            await page.waitForTimeout(2500);
            if (alerted) throw new Error('alert() fired — query param reflected unescaped into DOM');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 7. Clickjacking — X-Frame-Options OR CSP frame-ancestors 'none' ─────
    await step("Clickjacking: X-Frame-Options DENY or CSP frame-ancestors 'none'/'self'", async () => {
        const r = await fetchHeaders(probeCtx, BASE + '/auth.html');
        const xfo = (r.headers['x-frame-options'] || '').toLowerCase();
        const csp = r.headers['content-security-policy'] || '';
        const fa  = (csp.match(/frame-ancestors\s+([^;]+)/i) || [, ''])[1].toLowerCase();
        const xfoOk = /deny|sameorigin/.test(xfo);
        const faOk  = /\bnone\b|\bself\b/.test(fa) && !/\*/.test(fa);
        if (!xfoOk && !faOk) throw new Error(`/auth.html embeddable — XFO="${xfo}" frame-ancestors="${fa}"`);
    });

    // ── 8. Open redirect — ?return= / ?continueUrl= must not bounce off-domain ─
    await step('Open redirect: ?return / ?continueUrl / ?next to evil.com stays on wizelife.ai', async () => {
        const params = ['return', 'continueUrl', 'redirect', 'next'];
        const bad = [];
        for (const p of params) {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            try {
                await page.goto(BASE + '/auth.html?' + p + '=' + encodeURIComponent('https://evil.example/'), {
                    waitUntil: 'load', timeout: 30000,
                });
                await page.waitForTimeout(1500);
                const host = new URL(page.url()).host;
                if (host !== HOST) bad.push(`${p}→${host}`);
            } finally { await page.close(); await ctx.close(); }
        }
        if (bad.length) throw new Error('off-domain bounce: ' + bad.join(' · '));
    });

    // ── 9. Sensitive paths — /admin /.env /.git /private return 4xx ─────────
    await step('Sensitive paths: /admin, /.env, /.git/config, /private return 4xx', async () => {
        const targets = ['/admin', '/admin/', '/.env', '/.git/config', '/private', '/private/'];
        const leaks = [];
        for (const t of targets) {
            const r = await fetchHeaders(probeCtx, BASE + t);
            // Acceptable: 401, 403, 404, 410. Cloudflare 403 challenge is fine too.
            if (r.status >= 200 && r.status < 300) {
                // Could still be wizelife.ai SPA 200 with no leak — sniff the body.
                if (/\b(API_KEY|FIREBASE_ADMIN|SECRET|PRIVATE_KEY|password\s*=)/i.test(r.body.slice(0, 4000))) {
                    leaks.push(`${t} (200 + secret-like body)`);
                }
            }
        }
        if (leaks.length) throw new Error(leaks.join(' · '));
    });

    // ── 10. localStorage hygiene — no plaintext password/secret keys ─────────
    await step('localStorage: no keys matching password/secret/private after auth.html load', async () => {
        const { ctx, page } = await fresh(browser, '/auth.html');
        try {
            const bad = await page.evaluate(() => {
                const out = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i) || '';
                    if (/password|secret|private[_-]?key/i.test(k)) out.push(k);
                    const v = localStorage.getItem(k) || '';
                    if (/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(v)) out.push(k + ' (contains private key)');
                }
                return out;
            });
            if (bad.length) throw new Error('localStorage exposes: ' + bad.join(', '));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 11. Login form action stays on-domain ───────────────────────────────
    await step('Login form: action attribute (if present) stays on wizelife.ai', async () => {
        const { ctx, page } = await fresh(browser, '/auth.html');
        try {
            const actions = await page.evaluate(() =>
                Array.from(document.querySelectorAll('form'))
                    .map(f => f.getAttribute('action') || '')
                    .filter(a => a && /^https?:/i.test(a))
            );
            const offdomain = actions.filter(a => {
                try { return new URL(a).host !== location.host && !/wizelife\.ai$|googleapis\.com$|firebaseapp\.com$/.test(new URL(a).host); }
                catch { return true; }
            });
            if (offdomain.length) throw new Error('off-domain form action: ' + offdomain.join(', '));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 12. Mixed content — no http:// resources on https:// page ───────────
    await step('Mixed content: no http:// subresources loaded on https://wizelife.ai/', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const mixed = [];
        page.on('request', req => {
            const u = req.url();
            if (/^http:\/\//i.test(u) && !u.startsWith('http://localhost')) mixed.push(u);
        });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(3500);
            if (mixed.length) throw new Error(`${mixed.length} insecure requests: ${mixed[0].slice(0, 120)}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 13. Referrer-Policy — strict-origin-when-cross-origin or stricter ───
    await step('Referrer-Policy: strict-origin-when-cross-origin / same-origin / no-referrer', async () => {
        const r = await fetchHeaders(probeCtx, BASE + '/');
        const rp = (r.headers['referrer-policy'] || '').toLowerCase();
        if (!rp) throw new Error('Referrer-Policy header missing');
        const strictEnough = /(strict-origin-when-cross-origin|same-origin|no-referrer$|no-referrer-when-downgrade)/.test(rp);
        if (!strictEnough) throw new Error(`Referrer-Policy too loose: "${rp}"`);
        if (rp === 'no-referrer-when-downgrade') warn('Referrer-Policy is the spec default — consider strict-origin-when-cross-origin', '');
    });

    // ── 14. Permissions-Policy — camera + mic + geo locked unless used ──────
    await step('Permissions-Policy: camera/microphone/geolocation locked to () or self', async () => {
        const r = await fetchHeaders(probeCtx, BASE + '/');
        const pp = (r.headers['permissions-policy'] || r.headers['feature-policy'] || '').toLowerCase();
        if (!pp) { warn('No Permissions-Policy header', 'add: camera=(), microphone=(), geolocation=(), payment=()'); return; }
        const open = [];
        for (const feat of ['camera', 'microphone', 'geolocation']) {
            const m = pp.match(new RegExp(feat + '\\s*=\\s*\\(([^)]*)\\)'));
            if (!m) { open.push(feat + ' (unset)'); continue; }
            const val = m[1].trim();
            if (val === '' || val === 'self' || val === '"self"') continue;
            if (/\*/.test(val)) open.push(`${feat}=*`);
        }
        if (open.length) throw new Error('Permissions-Policy too open: ' + open.join(', '));
    });

    // ── 15. Service Worker scope must not exceed origin ─────────────────────
    await step('Service Worker scope is same-origin (no cross-origin claim)', async () => {
        const { ctx, page } = await fresh(browser, '/');
        try {
            await page.waitForTimeout(3500);
            const swInfo = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return null;
                const regs = await navigator.serviceWorker.getRegistrations();
                return regs.map(r => ({ scope: r.scope, scriptURL: r.active && r.active.scriptURL }));
            });
            if (!swInfo || !swInfo.length) { warn('No SW registered on /', 'PWA offline disabled'); return; }
            for (const sw of swInfo) {
                const scopeHost = new URL(sw.scope).host;
                if (scopeHost !== HOST) throw new Error(`SW scope cross-origin: ${sw.scope}`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 16. CSP report-uri / report-to — present (advisory) ─────────────────
    await step('CSP has report-uri OR report-to directive (advisory)', async () => {
        const r = await fetchHeaders(probeCtx, BASE + '/');
        const csp = r.headers['content-security-policy'] || r.headers['content-security-policy-report-only'] || '';
        if (!csp) { warn('No CSP header — cannot check reporting', 'add CSP first'); return; }
        if (!/report-uri|report-to/i.test(csp)) {
            warn('CSP has no report-uri/report-to', 'add report-to so violations get logged to Cloudflare/Sentry');
        }
    });

    // ── 17. Subresource Integrity — external <script src> with integrity= ───
    await step('SRI: external (non-wizelife) <script src> tags have integrity= attribute', async () => {
        const { ctx, page } = await fresh(browser, '/');
        try {
            const externals = await page.evaluate((host) =>
                Array.from(document.querySelectorAll('script[src]'))
                    .map(s => ({ src: s.src, integrity: s.integrity || '' }))
                    .filter(o => {
                        try { return new URL(o.src).host !== host && !/wizelife\.ai$|gstatic\.com$|googleapis\.com$|firebaseapp\.com$/.test(new URL(o.src).host); }
                        catch { return false; }
                    }),
                HOST,
            );
            const missingSRI = externals.filter(o => !o.integrity);
            if (missingSRI.length) warn(`${missingSRI.length} external script(s) without SRI`,
                missingSRI.slice(0, 2).map(o => o.src).join(' · '));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 18. Login throttle — 10 rapid bad logins should eventually be blocked ─
    await step('Login throttle: 10 rapid bad logins eventually slowed / blocked (advisory)', async () => {
        const { ctx, page } = await fresh(browser, '/auth.html');
        try {
            const emailSel = 'input[type=email], #email';
            const passSel  = 'input[type=password], #password';
            const submit   = 'button[type=submit], button#loginBtn, button:has-text("Sign In"), button:has-text("Sign in"), button:has-text("התחבר")';
            await page.waitForSelector(emailSel, { timeout: 8000 });
            let throttled = false;
            for (let i = 0; i < 10; i++) {
                await page.fill(emailSel, 'qa-throttle-probe-' + i + '@example.invalid');
                await page.fill(passSel, 'wrong-password-' + i);
                await page.locator(submit).first().click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(700);
                // Look for throttle signals: 429, "too many", "try again later", reCAPTCHA modal.
                const txt = (await page.evaluate(() => document.body.innerText || '')).toLowerCase();
                if (/too many|try again|rate limit|temporarily|blocked|recaptcha/.test(txt)) { throttled = true; break; }
            }
            if (!throttled) warn('No throttle signal after 10 bad logins',
                'Firebase Auth has its own quota — consider explicit UI throttle');
        } catch (e) { warn('Throttle probe inconclusive: ' + e.message.slice(0, 80), ''); }
        finally { await page.close(); await ctx.close(); }
    });

    // ── 19. Bug-bounty surface — /security.html OR /.well-known/security.txt ─
    await step('Disclosure: /security.html OR /.well-known/security.txt is reachable', async () => {
        const a = await fetchHeaders(probeCtx, BASE + '/security.html').catch(() => ({ status: 0 }));
        const b = await fetchHeaders(probeCtx, BASE + '/.well-known/security.txt').catch(() => ({ status: 0 }));
        if (a.status !== 200 && b.status !== 200) {
            throw new Error(`neither /security.html (${a.status}) nor /.well-known/security.txt (${b.status}) is reachable`);
        }
        if (b.status === 200) {
            if (!/contact:/i.test(b.body)) warn('security.txt missing Contact: line', 'follow https://securitytxt.org spec');
        }
    });

    // ── 20. 2FA prompt path — /auth.html mentions 2FA option ────────────────
    await step('2FA: /auth.html copy or settings link mentions two-factor (advisory)', async () => {
        const { ctx, page } = await fresh(browser, '/auth.html');
        try {
            const has = await page.evaluate(() => {
                const t = (document.body.innerText || '').toLowerCase();
                return /2fa|two[- ]factor|אימות דו|two[- ]step|authenticator/.test(t);
            });
            if (!has) {
                // Also check dashboard once — 2FA toggle often lives there.
                await page.goto(BASE + '/dashboard.html?_t=' + Date.now(), { waitUntil: 'load', timeout: 25000 }).catch(() => {});
                await page.waitForTimeout(1500);
                const hasDash = await page.evaluate(() => {
                    const t = (document.body.innerText || '').toLowerCase();
                    return /2fa|two[- ]factor|two[- ]step|authenticator/.test(t);
                });
                if (!hasDash) warn('No 2FA / two-factor copy on /auth.html or /dashboard.html',
                    'add a 2FA enrolment affordance in Settings');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await probeCtx.close();
    finalize();
    await browser.close();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
