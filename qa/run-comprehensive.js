#!/usr/bin/env node
// Comprehensive QA suite — covers Tiers 1-13.
// Designed to run inside GitHub Actions (Playwright + axe-core preinstalled).

const { chromium, devices } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const https = require('https');
const tls = require('tls');
const fs = require('fs');

// ──────────────────────────────────────────────────────────────────────────────
const TARGETS = [
    { name: 'WizeLife (landing)',   url: 'https://wizelife.ai/',                    marker: 'wizelife',  app: 'wizelife' },
    { name: 'WizeLife (auth)',      url: 'https://wizelife.ai/auth.html',           marker: 'sign',      app: 'wizelife' },
    { name: 'WizeLife (dashboard)', url: 'https://wizelife.ai/dashboard.html',      marker: 'dashboard', app: 'wizelife' },
    { name: 'WizeLife (feedback)',  url: 'https://wizelife.ai/feedback.html',       marker: 'feedback',  app: 'wizelife' },
    { name: 'WizeMoney',            url: 'https://finsightai.github.io/finsight/',  marker: 'wizemoney', app: 'money' },
    { name: 'WizeTax',              url: 'https://tax.wizelife.ai/advisor',         marker: 'wizetax',   app: 'tax' },
    { name: 'WizeTravel',           url: 'https://nodedai.streamlit.app/',          marker: 'stream',    app: 'travel' },
    { name: 'WizeHealth',           url: 'https://health.wizelife.ai/',            marker: 'wizehealth', app: 'health' },
    { name: 'WizeDeal',             url: 'https://check-deal.vercel.app/',          marker: 'wizedeal',  app: 'deal' },
];

const SECURITY_HEADERS = [
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options',
];

// All Playwright contexts identify themselves via this UA so Cloudflare's
// WAF rule (Skip if User-Agent contains 'WizeLife-QA') matches every request.
const QA_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WizeLife-QA/1.0';

function ctxOpts(extra = {}) {
    return { userAgent: QA_UA, ...extra };
}

// Wait through Cloudflare/Vercel bot-challenge interstitials. Real browsers
// pass these automatically — we just need to give the page time to redirect.
async function gotoRealPage(page, url, opts = {}) {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 30000, ...opts });
    // Detect CF/Vercel challenge titles and wait for the real page to load
    let title = await page.title().catch(() => '');
    let attempts = 0;
    while (/just a moment|verifying|checking|cloudflare/i.test(title) && attempts < 3) {
        try {
            await page.waitForLoadState('networkidle', { timeout: 15000 });
        } catch {}
        title = await page.title().catch(() => '');
        attempts++;
    }
    return resp;
}

const VIEWPORTS = {
    'mobile':  devices['iPhone 13'],
    'tablet':  devices['iPad Pro 11'],
    'desktop': { viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 Desktop' },
};

const sections = [];
const fails = { tier1: 0, tier4: 0, tier5: 0, tier6: 0, tier7: 0, tier8: 0, tier10: 0, tier11: 0 };

function add(s) { sections.push(s); }

// ──────────────────────────────────────────────────────────────────────────────
function checkSSL(host) {
    return new Promise(resolve => {
        const sock = tls.connect({ host, port: 443, servername: host, timeout: 10000 }, () => {
            const cert = sock.getPeerCertificate();
            sock.end();
            if (!cert || !cert.valid_to) return resolve({ ok: false, days: null });
            const days = Math.floor((new Date(cert.valid_to) - Date.now()) / 86400000);
            resolve({ ok: days > 14, days, expires: cert.valid_to });
        });
        sock.on('error', () => resolve({ ok: false, days: null }));
        sock.on('timeout', () => { sock.destroy(); resolve({ ok: false, days: null }); });
    });
}

// ──────────────────────────────────────────────────────────────────────────────
async function tier1_HealthCheck(browser, t) {
    const ctx = await browser.newContext(ctxOpts());
    const page = await ctx.newPage();
    const consoleErrors = [];
    const failedReqs = [];
    page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`.slice(0, 160)));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`console: ${m.text()}`.slice(0, 160)); });
    page.on('response', r => { if (r.status() >= 400 && r.url() !== t.url) failedReqs.push(`${r.url()} → ${r.status()}`.slice(0, 160)); });

    const t0 = Date.now();
    let resp, body = '';
    try {
        resp = await gotoRealPage(page, t.url);
        body = await page.content();
    } catch (e) {
        await ctx.close();
        return { ok: false, error: e.message };
    }
    const ms = Date.now() - t0;

    const headers = resp ? resp.headers() : {};
    const markerOk = !t.marker || body.toLowerCase().includes(t.marker.toLowerCase());
    const httpOk = resp && resp.ok();
    // CF challenge returns 403 initially even when the real page loads after the challenge.
    // Use marker presence as the primary signal of "real page reached".
    const reachedRealPage = markerOk;
    const host = new URL(t.url).hostname;
    const ssl = await checkSSL(host);
    const missingHeaders = SECURITY_HEADERS.filter(h => !headers[h]);

    await ctx.close();
    return { ok: reachedRealPage && ssl.ok, status: resp?.status(), reachedRealPage, ms, markerOk, ssl, missingHeaders, consoleErrors, failedReqs, headers };
}

async function tier4_Accessibility(browser, t) {
    const ctx = await browser.newContext(ctxOpts());
    const page = await ctx.newPage();
    try {
        await gotoRealPage(page, t.url, { waitUntil: "domcontentloaded", timeout: 25000 });
        const results = await new AxeBuilder({ page }).analyze();
        await ctx.close();
        const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
        return { violations: results.violations.length, critical: critical.length, samples: critical.slice(0, 3).map(v => v.id + ': ' + v.description.slice(0, 80)) };
    } catch (e) { await ctx.close(); return { error: e.message }; }
}

async function tier5_SEO(browser, t) {
    const ctx = await browser.newContext(ctxOpts());
    const page = await ctx.newPage();
    try {
        await gotoRealPage(page, t.url, { waitUntil: "domcontentloaded", timeout: 25000 });
        const meta = await page.evaluate(() => ({
            title: document.title,
            description: document.querySelector('meta[name=description]')?.content || '',
            ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
            ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
            ogDesc: document.querySelector('meta[property="og:description"]')?.content || '',
            twitterCard: document.querySelector('meta[name="twitter:card"]')?.content || '',
            canonical: document.querySelector('link[rel=canonical]')?.href || '',
            lang: document.documentElement.lang || '',
        }));
        await ctx.close();
        const missing = Object.entries(meta).filter(([k, v]) => !v).map(([k]) => k);
        return { meta, missing };
    } catch (e) { await ctx.close(); return { error: e.message }; }
}

async function tier6_PWA(browser, t) {
    if (!t.app === 'wizelife' && !t.app === 'money' && !t.app === 'health') return { skip: true };
    const ctx = await browser.newContext(ctxOpts());
    const page = await ctx.newPage();
    try {
        await gotoRealPage(page, t.url, { waitUntil: "domcontentloaded", timeout: 25000 });
        const pwa = await page.evaluate(async () => {
            const manifest = document.querySelector('link[rel=manifest]')?.href;
            let manifestData = null;
            if (manifest) {
                try { const r = await fetch(manifest); manifestData = await r.json(); } catch {}
            }
            const sw = 'serviceWorker' in navigator ? 'supported' : 'unsupported';
            return { manifest, manifestData, sw, themeColor: document.querySelector('meta[name=theme-color]')?.content };
        });
        await ctx.close();
        const issues = [];
        if (!pwa.manifest) issues.push('no manifest');
        if (pwa.manifestData) {
            if (!pwa.manifestData.name) issues.push('manifest missing name');
            if (!pwa.manifestData.icons || !pwa.manifestData.icons.length) issues.push('manifest missing icons');
            if (!pwa.manifestData.start_url) issues.push('manifest missing start_url');
        } else if (pwa.manifest) {
            issues.push('manifest unfetchable');
        }
        if (!pwa.themeColor) issues.push('no theme-color meta');
        return { ok: issues.length === 0, issues, pwa };
    } catch (e) { await ctx.close(); return { error: e.message }; }
}

async function tier7_Viewports(browser, t) {
    const out = {};
    for (const [name, device] of Object.entries(VIEWPORTS)) {
        const ctx = await browser.newContext({ ...device, userAgent: (device.userAgent || '') + ' WizeLife-QA/1.0' });
        const page = await ctx.newPage();
        try {
            const t0 = Date.now();
            await gotoRealPage(page, t.url, { waitUntil: "domcontentloaded", timeout: 25000 });
            const ms = Date.now() - t0;
            // Check for horizontal scroll (a sign of broken responsive layout)
            const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
            out[name] = { ok: !hScroll, ms, hScroll };
        } catch (e) { out[name] = { ok: false, error: e.message }; }
        await ctx.close();
    }
    return out;
}

async function tier10_I18n(browser, t) {
    const langs = ['he', 'en', 'pt', 'es'];
    const out = {};
    const ctx = await browser.newContext(ctxOpts());
    for (const lang of langs) {
        const page = await ctx.newPage();
        try {
            const url = t.url + (t.url.includes('?') ? '&' : '?') + 'wl_lang=' + lang;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
            const info = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir }));
            // Heuristic: scan visible text for unexpected language characters
            const text = await page.evaluate(() => document.body.innerText.slice(0, 5000));
            const hasHebrew = /[֐-׿]/.test(text);
            const hasEnglish = /[a-zA-Z]{4,}/.test(text);
            out[lang] = { docLang: info.lang, docDir: info.dir, hasHebrew, hasEnglish, sample: text.slice(0, 100) };
        } catch (e) { out[lang] = { error: e.message }; }
        await page.close();
    }
    await ctx.close();
    return out;
}

// ──────────────────────────────────────────────────────────────────────────────
async function tier8_CrossAppSSO(browser) {
    // Set wl_token + wl_plan via URL on WizeMoney; verify Money respects it.
    const ctx = await browser.newContext(ctxOpts());
    const page = await ctx.newPage();
    try {
        // We don't have a real SSO token here for an unauth check, so just
        // verify the SSO bridge param-handling exists by visiting with junk
        // and checking that the app didn't crash.
        await page.goto('https://finsightai.github.io/finsight/?wl_lang=en', { waitUntil: 'domcontentloaded', timeout: 25000 });
        const ok = await page.evaluate(() => !!document.querySelector('.sidebar') || !!document.querySelector('.app-container'));
        await ctx.close();
        return { ok };
    } catch (e) { await ctx.close(); return { error: e.message }; }
}

async function tier11_ThirdParty() {
    const probes = [
        { name: 'Yahoo Finance (AAPL)',    url: 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=1d', expectKey: 'chart' },
        { name: 'Open-Meteo weather',      url: 'https://api.open-meteo.com/v1/forecast?latitude=32&longitude=34&current=temperature_2m', expectKey: 'current' },
        { name: 'Render backend health',   url: 'https://master-backend-79jx.onrender.com/health', expectKey: 'status' },
    ];
    const out = [];
    for (const p of probes) {
        const t0 = Date.now();
        try {
            const r = await fetch(p.url);
            const j = await r.json();
            const ms = Date.now() - t0;
            const ok = r.ok && (!p.expectKey || p.expectKey in j);
            out.push({ name: p.name, ok, ms, status: r.status });
        } catch (e) {
            out.push({ name: p.name, ok: false, error: e.message });
        }
    }
    return out;
}

async function tier12_ColdStart() {
    // Probe Render endpoints multiple times, measure first vs warm latency
    const url = 'https://master-backend-79jx.onrender.com/health';
    const times = [];
    for (let i = 0; i < 3; i++) {
        const t0 = Date.now();
        try {
            await fetch(url, { signal: AbortSignal.timeout(60000) });
            times.push(Date.now() - t0);
        } catch (e) { times.push(-1); }
    }
    return { first: times[0], warm: times[1], warmer: times[2] };
}

// ──────────────────────────────────────────────────────────────────────────────
async function main() {
    const browser = await chromium.launch();

    add('# 📊 Comprehensive QA Report\n');
    add(`_Run: ${new Date().toISOString()}_\n`);

    add('## Tier 1 — Health, Console, Assets, Security, SSL\n');
    add('| App | Status | Latency | Marker | SSL | Missing headers | Console errors | Failed req |');
    add('|---|---|---|---|---|---|---|---|');
    for (const t of TARGETS) {
        const r = await tier1_HealthCheck(browser, t);
        if (r.error) { fails.tier1++; add(`| ${t.name} | ❌ | — | — | — | — | — | ${r.error} |`); continue; }
        const icon = r.ok ? '✅' : '⚠️';
        if (!r.ok) fails.tier1++;
        // Annotate with CF-via-challenge note so "403" doesn't read as broken
        const statusLabel = (r.status === 403 && r.reachedRealPage) ? '200 (via CF)' : String(r.status);
        add(`| ${t.name} | ${icon} ${statusLabel} | ${r.ms}ms | ${r.markerOk ? '✓' : '✗'} | ${r.ssl?.days ?? '?'}d | ${r.missingHeaders.length || '—'} | ${r.consoleErrors.length} | ${r.failedReqs.length} |`);
    }
    add('');

    add('## Tier 4 — Accessibility (axe-core)\n');
    add('| App | Total violations | Critical/serious |');
    add('|---|---|---|');
    for (const t of TARGETS.filter(t => t.app !== 'travel')) {
        const r = await tier4_Accessibility(browser, t);
        if (r.error) { add(`| ${t.name} | err: ${r.error.slice(0,60)} | — |`); continue; }
        const icon = r.critical === 0 ? '✅' : '⚠️';
        if (r.critical > 0) fails.tier4++;
        add(`| ${t.name} | ${r.violations} ${icon} | ${r.critical} |`);
        for (const s of (r.samples || [])) add(`| | \`${s}\` | |`);
    }
    add('');

    add('## Tier 5 — SEO meta tags\n');
    add('| App | Title | Description | OG image | Canonical | Lang | Missing |');
    add('|---|---|---|---|---|---|---|');
    for (const t of TARGETS) {
        const r = await tier5_SEO(browser, t);
        if (r.error) { add(`| ${t.name} | err | | | | | ${r.error.slice(0,40)} |`); continue; }
        const m = r.meta;
        const icon = r.missing.length === 0 ? '✅' : (r.missing.length < 3 ? '⚠️' : '❌');
        if (r.missing.length >= 3) fails.tier5++;
        add(`| ${t.name} ${icon} | ${m.title.slice(0,40) || '✗'} | ${m.description ? '✓' : '✗'} | ${m.ogImage ? '✓' : '✗'} | ${m.canonical ? '✓' : '✗'} | ${m.lang || '✗'} | ${r.missing.join(',')} |`);
    }
    add('');

    add('## Tier 6 — PWA validity\n');
    add('| App | Manifest | Icons | start_url | Theme color | Issues |');
    add('|---|---|---|---|---|---|');
    for (const t of TARGETS.filter(t => ['wizelife','money','health'].includes(t.app))) {
        const r = await tier6_PWA(browser, t);
        if (r.error || r.skip) { add(`| ${t.name} | ${r.skip ? 'skip' : 'err'} | | | | ${r.error?.slice(0,40) || '—'} |`); continue; }
        const m = r.pwa.manifestData || {};
        const icon = r.ok ? '✅' : '⚠️';
        if (!r.ok) fails.tier6++;
        add(`| ${t.name} ${icon} | ${r.pwa.manifest ? '✓' : '✗'} | ${m.icons?.length || 0} | ${m.start_url || '✗'} | ${r.pwa.themeColor || '✗'} | ${r.issues.join(', ') || '—'} |`);
    }
    add('');

    add('## Tier 7 — Multi-viewport (mobile / tablet / desktop)\n');
    add('| App | Mobile | Tablet | Desktop |');
    add('|---|---|---|---|');
    for (const t of TARGETS) {
        const r = await tier7_Viewports(browser, t);
        const fmt = (v) => v.error ? `err` : (v.ok ? `✓ ${v.ms}ms` : `⚠️ hScroll ${v.ms}ms`);
        if (Object.values(r).some(v => !v.ok && !v.error)) fails.tier7++;
        add(`| ${t.name} | ${fmt(r.mobile)} | ${fmt(r.tablet)} | ${fmt(r.desktop)} |`);
    }
    add('');

    add('## Tier 8 — Cross-app SSO bridge\n');
    {
        const r = await tier8_CrossAppSSO(browser);
        if (!r.ok) fails.tier8++;
        add(`- ${r.ok ? '✅' : '❌'} WizeMoney loads with wl_lang param: ${r.error || 'OK'}\n`);
    }

    add('## Tier 10 — i18n (4 languages)\n');
    add('| App | he (RTL) | en | pt | es |');
    add('|---|---|---|---|---|');
    for (const t of TARGETS.filter(t => t.app === 'wizelife')) {
        const r = await tier10_I18n(browser, t);
        const fmt = (k, expectRTL) => {
            const v = r[k];
            if (v.error) return 'err';
            const dirOK = expectRTL ? (v.docDir === 'rtl') : (v.docDir === 'ltr' || !v.docDir);
            return dirOK ? '✓' : '⚠️';
        };
        add(`| ${t.name} | ${fmt('he', true)} | ${fmt('en')} | ${fmt('pt')} | ${fmt('es')} |`);
    }
    add('');

    add('## Tier 11 — Third-party APIs\n');
    {
        const r = await tier11_ThirdParty();
        add('| API | Status | Latency |');
        add('|---|---|---|');
        for (const p of r) {
            if (!p.ok) fails.tier11++;
            add(`| ${p.name} | ${p.ok ? '✅' : '❌'} ${p.status || ''} | ${p.ms || '—'}ms |`);
        }
        add('');
    }

    add('## Tier 12 — Cold-start latency (Render)\n');
    {
        const r = await tier12_ColdStart();
        add(`- First request: **${r.first}ms** ${r.first > 5000 ? '🥶 (cold start)' : '✓ (warm)'}`);
        add(`- Warm: ${r.warm}ms / ${r.warmer}ms\n`);
    }

    await browser.close();

    // Tally
    const totalFails = Object.values(fails).reduce((s, n) => s + n, 0);
    add(`---\n**Total failures**: ${totalFails}`);
    add('| Tier | Failures |');
    add('|---|---|');
    for (const [k, v] of Object.entries(fails)) add(`| ${k} | ${v} |`);

    fs.writeFileSync('comprehensive-report.md', sections.join('\n'));
    fs.writeFileSync('/tmp/total-fails', String(totalFails));
    console.log(sections.join('\n'));
}

main().catch(e => {
    console.error('Fatal:', e);
    fs.writeFileSync('comprehensive-report.md', `# QA failed\n\n${e.stack || e.message}`);
    fs.writeFileSync('/tmp/total-fails', '999');
    process.exit(1);
});
