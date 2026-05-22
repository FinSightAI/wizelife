#!/usr/bin/env node
// WizeHealth (Vitara) — security V2 battery.
// 20 health-specific security checks: PHI handling, auth boundaries, file-upload
// safety, transport security, CSP, SW behaviour, disclaimer gating.
//
// Render free tier → 10-30s cold start. Use 45-60s timeouts.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://health.wizelife.ai';
const RENDER_ORIGIN = 'https://health.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeHealth-SecurityV2');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(),
        { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3500);
    return { ctx, page };
}

// Fetch the top-level response so we can inspect headers — Render cold-starts can
// be slow so we retry once.
async function fetchHeaders(page, urlPath = '/') {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const resp = await page.request.get(BASE + urlPath, { timeout: 55000 });
            return { status: resp.status(), headers: resp.headers() };
        } catch (e) {
            if (attempt === 1) throw e;
            await page.waitForTimeout(3000);
        }
    }
    return { status: 0, headers: {} };
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. CSP strict — no unsafe-eval, no wildcards on script-src ─────────
    await step('CSP: no unsafe-eval / no wildcard on script-src', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const { headers } = await fetchHeaders(page, '/');
            const csp = headers['content-security-policy'] || headers['content-security-policy-report-only'] || '';
            if (!csp) { warn('No CSP header on /', 'add Content-Security-Policy with script-src restricted'); return; }
            const scriptSrc = (csp.match(/script-src[^;]*/i) || [''])[0];
            if (/unsafe-eval/i.test(scriptSrc)) throw new Error("script-src allows 'unsafe-eval'");
            if (/(^|\s)\*(\s|$)/.test(scriptSrc)) throw new Error('script-src contains wildcard *');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. Cache-Control: no-store on pages serving health data ────────────
    await step('HIPAA-style: Cache-Control no-store on health pages', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const { headers } = await fetchHeaders(page, '/');
            const cc = headers['cache-control'] || '';
            if (!/no-store|private/i.test(cc)) {
                warn(`Cache-Control on / is "${cc || 'unset'}"`, 'PHI-bearing routes should set no-store, private');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. File upload XSS — name with <script> renders as text ────────────
    await step('Upload preview: <script> in filename rendered as text', async () => {
        const { ctx, page } = await fresh(browser);
        let alerted = false;
        page.on('dialog', async d => { alerted = true; await d.dismiss(); });
        try {
            const fi = page.locator('input[type=file]').first();
            if (!(await fi.count())) { warn('No file input on landing', 'cannot test upload XSS'); return; }
            const evilName = '<img src=x onerror=alert("xss-' + Date.now() + '")>.png';
            await fi.setInputFiles({
                name: evilName,
                mimeType: 'image/png',
                buffer: Buffer.from('iVBORw0KGgo=', 'base64'),
            });
            await page.waitForTimeout(2500);
            if (alerted) throw new Error('Upload preview executed an XSS payload from filename');
            // Confirm the filename, if rendered, was escaped: no raw <img> tag with onerror in DOM.
            const liveBad = await page.evaluate(() =>
                !!document.querySelector('img[onerror]')
            );
            if (liveBad) throw new Error('Filename injected a live <img onerror> into the DOM');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. File upload type whitelist — .exe/.html/.svg rejected ───────────
    await step('Upload type whitelist: .exe/.html/.svg are rejected server-side', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const statuses = await page.evaluate(async () => {
                const out = [];
                const evil = [
                    { name: 'a.exe', type: 'application/x-msdownload' },
                    { name: 'a.html', type: 'text/html' },
                    { name: 'a.svg', type: 'image/svg+xml' },
                ];
                for (const e of evil) {
                    const fd = new FormData();
                    fd.append('file', new Blob(['x'], { type: e.type }), e.name);
                    try {
                        const r = await fetch('/api/upload', { method: 'POST', body: fd });
                        out.push(r.status);
                    } catch { out.push(0); }
                }
                return out;
            });
            // 200 on any of these = wide-open. 404 means endpoint not present → can't verify, warn.
            const got200 = statuses.includes(200);
            const all404 = statuses.every(s => s === 404);
            if (got200) throw new Error(`Upload of dangerous types accepted: statuses=${JSON.stringify(statuses)}`);
            if (all404) warn('No /api/upload endpoint reachable', 'verify file ingestion path & extend test');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. File size limit — multi-MB upload rejected with 413 ─────────────
    await step('Upload size limit: 12MB blob rejected (413/400/415)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const status = await page.evaluate(async () => {
                const big = new Uint8Array(12 * 1024 * 1024); // 12 MB
                const fd = new FormData();
                fd.append('file', new Blob([big], { type: 'application/pdf' }), 'big.pdf');
                try {
                    const r = await fetch('/api/upload', { method: 'POST', body: fd });
                    return r.status;
                } catch { return 0; }
            });
            if (status === 200) throw new Error('12MB upload accepted — no size guard');
            if (status === 404) { warn('No /api/upload endpoint reachable', 'cannot verify size cap externally'); return; }
            if (![400, 401, 403, 413, 415, 422, 429].includes(status)) {
                warn(`Unexpected status ${status} for oversized upload`, 'should be 413 / 400');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 6. Auth required on every /api/* path — 401 unauth ─────────────────
    await step('Auth boundary: /api/* returns 401 without Authorization', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const probes = ['/api/chat', '/api/analyze', '/api/lab-results', '/api/profile', '/api/upload'];
            const results = await page.evaluate(async (paths) => {
                const out = {};
                for (const p of paths) {
                    try {
                        const r = await fetch(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
                        out[p] = r.status;
                    } catch { out[p] = 0; }
                }
                return out;
            }, probes);
            const leaks = Object.entries(results).filter(([_, s]) => s === 200);
            if (leaks.length) throw new Error(`Unauth 200 on: ${leaks.map(([p]) => p).join(', ')}`);
            const reachable = Object.entries(results).filter(([_, s]) => s !== 0 && s !== 404);
            if (!reachable.length) warn('No /api/* endpoints reachable', 'auth boundary cannot be verified externally');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 7. Token never appears in URL (would leak via referer/access logs) ─
    await step('No token in URL: query strings free of token=/access_token=', async () => {
        const { ctx, page } = await fresh(browser);
        const offenders = [];
        page.on('request', req => {
            const u = req.url();
            if (/[?&](token|access_token|id_token|api_key)=/i.test(u)) offenders.push(u.slice(0, 180));
        });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(4000);
            if (offenders.length) throw new Error('Token in URL: ' + offenders.slice(0, 2).join(' | '));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 8. Lab result IDs not enumerable — 401 on both valid + bogus ───────
    await step('Lab result IDs: enumeration returns 401 not 404 (no info leak)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const pair = await page.evaluate(async () => {
                const a = await fetch('/api/lab-results/1').then(r => r.status).catch(() => 0);
                const b = await fetch('/api/lab-results/999999').then(r => r.status).catch(() => 0);
                return { a, b };
            });
            if (pair.a === 0 && pair.b === 0) { warn('lab-results endpoint unreachable', 'cannot verify ID enumeration externally'); return; }
            if (pair.a === 404 && pair.b === 404) return; // both not-found is acceptable
            // The leak we care about: one is 401/403 and the other is 404 — that tells an attacker which IDs exist.
            if (pair.a !== pair.b && (pair.a === 404 || pair.b === 404)) {
                throw new Error(`ID enumeration leak: id=1→${pair.a}, id=999999→${pair.b}`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 9. CORS strict — only wizelife.ai origins allowed on /api/* ────────
    await step('CORS strict: evil origin not allowed on /api/chat', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const acao = await page.evaluate(async () => {
                const r = await fetch('/api/chat', {
                    method: 'OPTIONS',
                    headers: { 'Origin': 'https://evil.example.com', 'Access-Control-Request-Method': 'POST' },
                });
                return r.headers.get('access-control-allow-origin') || '';
            });
            if (acao === '*') throw new Error('ACAO is * on /api/chat — wildcards leak PHI cross-origin');
            if (/evil\.example\.com/i.test(acao)) throw new Error('CORS reflected evil origin');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 10. PII in localStorage — no plaintext patient names / lab values ──
    await step('localStorage: no plaintext PHI/PII patterns', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const dump = await page.evaluate(() => {
                const out = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    out[k] = (localStorage.getItem(k) || '').slice(0, 1500);
                }
                return out;
            });
            const blob = JSON.stringify(dump);
            // Common PHI tokens: hemoglobin/glucose values, MRN, SSN, patient names with "patient_name".
            const phiPatterns = [
                /"patient_name"\s*:\s*"[A-Za-z]/i,
                /"mrn"\s*:\s*"\d{4,}"/i,
                /"ssn"\s*:\s*"\d{3}-?\d{2}-?\d{4}"/i,
                /hemoglobin\s*[:=]\s*\d+\.\d/i,
                /glucose\s*[:=]\s*\d{2,}/i,
            ];
            for (const p of phiPatterns) {
                if (p.test(blob)) throw new Error('PHI-like pattern in localStorage: ' + p);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 11. Session timeout — idle 30+ min behaviour (warn-only) ───────────
    await step('Session timeout: refresh/logout signal exists', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // We cannot wait 30 min; instead, probe for a refresh mechanism.
            const hasRefresh = await page.evaluate(() => {
                const src = Array.from(document.querySelectorAll('script')).map(s => s.src + (s.textContent || '')).join('\n');
                return /onIdTokenChanged|refreshToken|idleTimeout|sessionTimeout/i.test(src);
            });
            if (!hasRefresh) warn('No visible token-refresh / idle-timeout hook', 'verify Firebase onIdTokenChanged wired up');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 12. Audit log presence — warn-only (Firestore not externally visible) ─
    await step('Audit log: client emits audit signal for sensitive reads', async () => {
        const { ctx, page } = await fresh(browser);
        let auditSeen = false;
        page.on('request', req => {
            if (/audit|log_event|firestore.*audit/i.test(req.url())) auditSeen = true;
        });
        try {
            await page.waitForTimeout(5000);
            if (!auditSeen) warn('No audit-log network signal observed', 'verify /audit_log Firestore writes from health views');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 13. DICOM/PHI test data — no obvious test-patient blobs in served JS/HTML ─
    await step('No test PHI patterns leaked in served HTML/JS', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const found = await page.evaluate(async () => {
                const html = document.documentElement.outerHTML;
                const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
                let jsBlob = '';
                for (const s of scripts.slice(0, 8)) {
                    try { jsBlob += await fetch(s).then(r => r.text()); } catch {}
                }
                const all = html + '\n' + jsBlob;
                const patterns = [/PATIENT-\d+/, /MRN[-_]\d{4,}/, /\b\d{3}-\d{2}-\d{4}\b/, /TEST_PATIENT/i];
                return patterns.filter(p => p.test(all)).map(p => p.toString());
            });
            if (found.length) throw new Error('PHI patterns found in served bundle: ' + found.join(', '));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 14. CSP frame-ancestors 'none' — clickjacking prevented ────────────
    await step("Clickjacking: frame-ancestors 'none' OR X-Frame-Options: DENY", async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const { headers } = await fetchHeaders(page, '/');
            const csp = headers['content-security-policy'] || '';
            const xfo = headers['x-frame-options'] || '';
            const fa = (csp.match(/frame-ancestors[^;]*/i) || [''])[0];
            const ok = /'none'|'self'/i.test(fa) || /DENY|SAMEORIGIN/i.test(xfo);
            if (!ok) throw new Error(`No clickjacking protection — frame-ancestors="${fa}", X-Frame-Options="${xfo}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 15. HSTS preload eligible ──────────────────────────────────────────
    await step('HSTS: max-age ≥ 1y + includeSubDomains + preload', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const { headers } = await fetchHeaders(page, '/');
            const hsts = headers['strict-transport-security'] || '';
            if (!hsts) throw new Error('No Strict-Transport-Security header');
            const ma = (hsts.match(/max-age=(\d+)/i) || [])[1];
            if (!ma || parseInt(ma, 10) < 31536000) throw new Error(`HSTS max-age=${ma} < 1y`);
            if (!/includeSubDomains/i.test(hsts)) throw new Error('HSTS missing includeSubDomains');
            if (!/preload/i.test(hsts)) warn('HSTS missing "preload" directive', 'submit to hstspreload.org');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 16. X-Content-Type-Options: nosniff ────────────────────────────────
    await step('X-Content-Type-Options: nosniff present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const { headers } = await fetchHeaders(page, '/');
            const xcto = headers['x-content-type-options'] || '';
            if (!/nosniff/i.test(xcto)) throw new Error(`X-Content-Type-Options="${xcto}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 17. Permissions-Policy — camera/microphone gated ───────────────────
    await step('Permissions-Policy: camera/microphone restricted', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const { headers } = await fetchHeaders(page, '/');
            const pp = headers['permissions-policy'] || headers['feature-policy'] || '';
            if (!pp) { warn('No Permissions-Policy header', 'add Permissions-Policy: camera=(), microphone=(), geolocation=()'); return; }
            // camera and microphone must be empty list () or 'self' only.
            const bad = ['camera=*', 'microphone=*'].filter(b => pp.includes(b));
            if (bad.length) throw new Error('Wide-open features: ' + bad.join(', '));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 18. No mixed content — every script/style/img loads over https ─────
    await step('Mixed content: no http:// resources on page', async () => {
        const { ctx, page } = await fresh(browser);
        const insecure = [];
        page.on('request', req => {
            const u = req.url();
            if (u.startsWith('http://') && !u.startsWith('http://localhost')) insecure.push(u.slice(0, 160));
        });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(4000);
            if (insecure.length) throw new Error('Insecure resources: ' + insecure.slice(0, 3).join(' | '));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 19. Service Worker — registered, does NOT cache /api/* responses ───
    await step('Service Worker: registered + does not cache /api/*', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForTimeout(3500);
            const swInfo = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return { reg: false };
                const reg = await navigator.serviceWorker.getRegistration();
                if (!reg) return { reg: false };
                const keys = await caches.keys();
                let apiCached = false;
                for (const k of keys) {
                    const c = await caches.open(k);
                    const reqs = await c.keys();
                    if (reqs.some(r => /\/api\//.test(r.url))) { apiCached = true; break; }
                }
                return { reg: true, keys, apiCached };
            });
            if (!swInfo.reg) { warn('No service worker registered', 'PWA / cold-start offline shell missing'); return; }
            if (swInfo.apiCached) throw new Error('Service Worker caches /api/* responses — PHI may persist offline');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 20. Disclaimer gate — wize-disclaimer.js loaded before AI features ─
    await step('Disclaimer gate: wize-disclaimer.js present on AI route', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const present = await page.evaluate(() => {
                const has = !!document.querySelector('script[src*="wize-disclaimer"]');
                const apiPresent = !!(window.WizeDisclaimer || window.wizeDisclaimer);
                return { has, apiPresent };
            });
            if (!present.has && !present.apiPresent) {
                throw new Error('wize-disclaimer.js not loaded — AI features may run before health disclaimer accepted');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    finalize();
    await browser.close();
})();
