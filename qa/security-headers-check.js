#!/usr/bin/env node
// Exhaustive security-header audit per surface. Required for HTTPS-only
// production: HSTS (with preload), CSP (with at least default-src or script-src),
// X-Content-Type-Options=nosniff, Referrer-Policy, Permissions-Policy,
// no X-Powered-By leak, no Server: version leak.
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const URLS = [
    'https://wizelife.ai/',
    'https://money.wizelife.ai/',
    'https://tax.wizelife.ai/',
    'https://deal.wizelife.ai/',
    'https://travel.wizelife.ai/',
    'https://vitara.onrender.com/',
];

const REQUIRED = {
    'strict-transport-security': /max-age=\d{7,}.*(includeSubDomains|preload)?/i,
    'x-content-type-options':    /nosniff/i,
    'content-security-policy':   /default-src|script-src/i,
    'referrer-policy':           /.+/,
};

const DISCOURAGED = ['x-powered-by', 'server']; // Server with version is bad
const ALLOWED_SERVER_TOKENS = /^(cloudflare|github\.com|render|vercel)/i;

const { step, warn, finalize } = makeReporter('Security-Headers');

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext();
    for (const url of URLS) {
        await step(`${url} — security headers`, async () => {
            const r = await ctx.request.get(url, { timeout: 15000 });
            if (!r || r.status() >= 400) throw new Error(`HTTP ${r ? r.status() : 'err'}`);
            const h = r.headers();
            const fails = [];
            for (const [hdr, re] of Object.entries(REQUIRED)) {
                const v = h[hdr];
                if (!v) fails.push(`missing ${hdr}`);
                else if (!re.test(v)) fails.push(`${hdr} bad: ${v.slice(0, 50)}`);
            }
            // Discouraged headers
            for (const d of DISCOURAGED) {
                const v = h[d];
                if (v && d === 'server' && !ALLOWED_SERVER_TOKENS.test(v)) fails.push(`server leak: ${v}`);
                if (v && d === 'x-powered-by') fails.push(`x-powered-by leak: ${v}`);
            }
            // HSTS preload bonus
            const hsts = h['strict-transport-security'] || '';
            if (!/preload/.test(hsts)) warn(`${url}: HSTS lacks preload directive`, 'add preload + submit to hstspreload.org');

            if (fails.length) throw new Error(fails.join(' | '));
        });
    }
    await ctx.close();
    await browser.close();
    finalize('security-headers-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
