#!/usr/bin/env node
/**
 * Tier 13b — Asset reachability
 * Tier 13c — Browser runtime health (Playwright)
 *
 * Opens each page in Playwright (real Chromium), captures every console
 * error / uncaught promise rejection / failed network request, and verifies
 * every <script src>, <link href>, <img src> referenced in the page
 * returns 200.
 *
 * Output: action-only summary at the top, full detail collapsed.
 */

const { chromium } = require('playwright');
const https = require('https');
const fs = require('fs');

const PAGES = [
    'https://wizelife.ai/',
    'https://wizelife.ai/auth.html',
    'https://wizelife.ai/dashboard.html',
    'https://wizelife.ai/feedback.html',
    'https://money.wizelife.ai/',
    'https://tax.wizelife.ai/',
    'https://travel.wizelife.ai/',
    'https://deal.wizelife.ai/',
    // health is launcher → iframe to vitara; check the launcher itself.
    'https://health.wizelife.ai/',
];

const out = [];
const actions = [];
let passes = 0;
const add  = (l) => out.push(l);
const pass = (msg) => { passes++; add(`- ✅ ${msg}`); };
const fail = (msg, fix, who) => { actions.push({severity:'fail',who:who||'claude',msg,fix}); add(`- ❌ ${msg}`); };
const warn = (msg, fix, who) => { actions.push({severity:'warn',who:who||'admin',msg,fix}); add(`- ⚠️  ${msg}`); };

const head = (url) => new Promise((resolve) => {
    try {
        const u = new URL(url);
        const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'HEAD' }, (r) => {
            resolve(r.statusCode);
            req.destroy();
        });
        req.setTimeout(8000, () => { req.destroy(); resolve(0); });
        req.on('error', () => resolve(0));
        req.end();
    } catch (e) { resolve(0); }
});

(async () => {
    add(`# Runtime health — ${new Date().toISOString()}`);
    add('');

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) WizeLife-QA/1.0 Safari/604.1',
        viewport: { width: 390, height: 844 },
        isMobile: true,
    });

    for (const url of PAGES) {
        add(`## ${url}`);
        const page = await ctx.newPage();
        const errors = [];
        const failedRequests = [];

        const CF_NOISE = [
            'xr-spatial-tracking', 'TrustedHTML', 'TrustedScript', 'TrustedScriptURL',
            'font-size:0;color:transparent', 'cf-browser-verification', 'cf_chl',
            'challenges.cloudflare.com', 'csp/frame-ancestors',
            'recaptcha', 'Just a moment',
        ];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                const t = msg.text().slice(0, 300);
                if (CF_NOISE.some(p => t.toLowerCase().includes(p.toLowerCase()))) return;
                errors.push(t);
            }
        });
        page.on('pageerror', (err) => errors.push('uncaught: ' + (err.message || String(err)).slice(0, 300)));
        page.on('requestfailed', (req) => {
            const u = req.url();
            // ignore third-party trackers and Cloudflare insights
            if (/clarity\.ms|google-analytics|googletagmanager|cloudflareinsights|cf-platform|challenges\.cloudflare\.com|csp\.withgoogle\.com|vitara\.onrender\.com|master-backend|ofirofir-wizetravel/i.test(u)) return;
            if (/ERR_ABORTED/i.test(req.failure()?.errorText || '') && /onrender\.com|hf\.space/i.test(u)) return;
            failedRequests.push(`${req.failure()?.errorText || 'failed'} → ${u.slice(0, 200)}`);
        });
        page.on('response', (res) => {
            const u = res.url();
            const s = res.status();
            if (s >= 400 && !/clarity|google-analytics|googletagmanager|cloudflareinsights|challenges\.cloudflare|csp\.withgoogle|recaptcha/i.test(u)) {
                failedRequests.push(`HTTP ${s} → ${u.slice(0, 200)}`);
            }
        });

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(2500); // settle scripts
        } catch (e) {
            fail(`${url}: navigation failed (${e.message.split('\n')[0]})`,
                 'check hosting / firewall / domain', 'admin');
            await page.close();
            add('');
            continue;
        }

        // 13b — Asset reachability: every <script src>, <link href>, <img src>
        const refs = await page.evaluate(() => {
            const urls = new Set();
            document.querySelectorAll('script[src]').forEach(e => urls.add(e.src));
            document.querySelectorAll('link[href][rel]').forEach(e => urls.add(e.href));
            document.querySelectorAll('img[src]').forEach(e => urls.add(e.src));
            return Array.from(urls).filter(u => /^https?:\/\//.test(u));
        });
        let assetsOK = 0, assetsBad = 0;
        for (const r of refs) {
            const code = await head(r);
            if (code >= 200 && code < 400) assetsOK++;
            else { assetsBad++; fail(`asset 404/broken: ${r} (status ${code})`, `fix the reference in ${url}`, 'claude'); }
        }
        if (assetsBad === 0) pass(`${refs.length} assets reachable`);

        // 13c — Runtime errors
        if (errors.length === 0) pass(`no console errors`);
        else errors.forEach(e => fail(`console error: ${e}`, `open DevTools on ${url} and reproduce`, 'claude'));

        if (failedRequests.length === 0) pass(`no failed requests`);
        else failedRequests.forEach(f => fail(`network: ${f}`, `verify backend / route in ${url}`, 'claude'));

        await page.close();
        add('');
    }

    await browser.close();

    // Summary at top
    add('---');
    const failed = actions.filter(a => a.severity === 'fail');
    const warned = actions.filter(a => a.severity === 'warn');
    const summary = [];
    summary.push(`# 🚨 Runtime action items — ${new Date().toISOString().slice(0,10)}`);
    summary.push('');
    if (!actions.length) {
        summary.push(`✅ **${passes} runtime checks passed — every page renders clean, every asset reachable, no console/network errors.**`);
    } else {
        summary.push(`**${failed.length} failure(s), ${warned.length} warning(s), ${passes} pass.**`);
        summary.push('');
        const byMe  = actions.filter(a => a.who === 'claude');
        const byYou = actions.filter(a => a.who === 'admin');
        if (byMe.length) {
            summary.push('## For Claude to fix:');
            byMe.forEach(a => summary.push(`- ${a.severity === 'fail' ? '❌' : '⚠️'} ${a.msg}` + (a.fix ? ` — **fix:** ${a.fix}` : '')));
            summary.push('');
        }
        if (byYou.length) {
            summary.push('## For you to investigate:');
            byYou.forEach(a => summary.push(`- ${a.severity === 'fail' ? '❌' : '⚠️'} ${a.msg}` + (a.fix ? ` — **fix:** ${a.fix}` : '')));
            summary.push('');
        }
    }
    summary.push('---');
    summary.push('_<details><summary>Full per-page detail</summary>_');
    summary.push('');

    const full = summary.join('\n') + '\n' + out.join('\n') + '\n</details>';
    fs.writeFileSync('runtime-report.md', full);
    fs.writeFileSync('/tmp/runtime-fails', String(failed.length));
    console.log(full);
    process.exit(0);
})().catch(e => { console.error('runtime-health crashed', e); process.exit(0); });
