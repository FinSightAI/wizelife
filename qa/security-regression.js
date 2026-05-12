#!/usr/bin/env node
/**
 * Tier 13 — Security regression (daily)
 * Tier 14 — External scanners (weekly, gated on day of week)
 *
 * Runs as part of the daily-qa GitHub Action. Writes a markdown report
 * to security-report.md and exits 0 always (failures are surfaced via
 * the rolling qa-alert issue, not by failing the workflow).
 */

const https = require('https');
const fs    = require('fs');

const out = [];
const add = (line) => out.push(line);

// Action items only — what's broken or needs the admin's eyes.
// Each entry is { severity, who, msg, fix }.
const actions = [];
let passes = 0;
const pass = (msg)            => { passes++; add(`- ✅ ${msg}`); };
const fail = (msg, fix, who)  => { actions.push({ severity: 'fail', who: who || 'admin', msg, fix }); add(`- ❌ ${msg}`); };
const warn = (msg, fix, who)  => { actions.push({ severity: 'warn', who: who || 'admin', msg, fix }); add(`- ⚠️  ${msg}`); };

const fetchText = (url, { headersOnly = false } = {}) => new Promise((resolve, reject) => {
    const req = https.request(url, { method: headersOnly ? 'HEAD' : 'GET', headers: { 'User-Agent': 'WizeLife-QA/1.0 (security-regression)' } }, (r) => {
        let chunks = '';
        r.on('data', (c) => chunks += c);
        r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: chunks }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.end();
});

// ─── JS parse-check — every served script must actually run, not just 200 ───
// This is the bug that bit us hard: sidebar.js was returning HTTP 200 with
// the right strings inside, but had `SyntaxError: Identifier 'inPages' has
// already been declared`. The script silently failed to execute → no
// sidebar, no bottom-nav, no hamburger. Audits all passed because they
// only checked HTTP status, not whether the JS actually parses.
async function jsParseCheck() {
    add('## Tier 13a — JS parse-check (catches silent SyntaxErrors)');
    add('');
    const SCRIPTS = [
        'https://wizelife.ai/js/wizelife-auth.js',
        'https://wizelife.ai/js/wize-bottom-nav.js',
        'https://wizelife.ai/js/wize-onboarding.js',
        'https://wizelife.ai/js/wize-hamburger.js',
        'https://wizelife.ai/js/wize-disclaimer.js',
        'https://wizelife.ai/js/sw-register.js',
        'https://money.wizelife.ai/js/sidebar.js',
        'https://money.wizelife.ai/js/app.js',
        'https://money.wizelife.ai/js/wize-bottom-nav.js',
    ];
    const vm = require('vm');
    for (const url of SCRIPTS) {
        try {
            const r = await fetchText(url);
            if (r.status !== 200) { warn(`${url} → HTTP ${r.status}`, 'check hosting', 'admin'); continue; }
            try {
                // new Script() parses without running — exactly what we want.
                new vm.Script(r.body, { filename: url });
                pass(`${url.replace(/^https?:\/\//, '')} parses`);
            } catch (e) {
                fail(`${url} has a SyntaxError: ${e.message.split('\n')[0]}`,
                     `run 'node -c <local path>' to debug, then commit + push`,
                     'claude');
            }
        } catch (e) { warn(`${url} fetch failed: ${e.message}`, 'network issue', 'admin'); }
    }
    add('');
}

// ─── Tier 13 — Security regression (daily) ───────────────────────────────────
async function tier13() {
    add('## Tier 13 — Security regression');
    add('');

    // 1. HSTS header on wizelife.ai
    try {
        const r = await fetchText('https://wizelife.ai/', { headersOnly: true });
        const h = r.headers['strict-transport-security'] || '';
        if (h && /max-age=\d{8,}/.test(h)) {
            if (h.includes('preload')) pass(`HSTS header present with preload: \`${h}\``);
            else warn('HSTS active but missing `preload` directive', 'Cloudflare → SSL/TLS → Edge Certificates → HSTS → enable Preload', 'admin');
        } else {
            fail('HSTS header missing on https://wizelife.ai/', 'Cloudflare → SSL/TLS → Edge Certificates → HSTS → Enable (12mo, includeSubDomains, preload)', 'admin');
        }
    } catch (e) { warn(`HSTS check error: ${e.message}`, 'investigate network', 'admin'); }

    // 2. reCAPTCHA site key wired in each WizeLife page
    const PAGES = [
        'https://wizelife.ai/',
        'https://wizelife.ai/auth.html',
        'https://wizelife.ai/dashboard.html',
        'https://wizelife.ai/feedback.html',
    ];
    for (const url of PAGES) {
        try {
            const r = await fetchText(url);
            const isCfChallenge = r.status === 403 || r.body.includes('Just a moment') || r.body.includes('cf-browser-verification') || (r.body.length < 2000 && r.body.includes('Cloudflare'));
            if (isCfChallenge) { warn(`reCAPTCHA check skipped for ${url.replace('https://wizelife.ai', '') || '/'} — Cloudflare challenge page returned`, 'CF is protecting the page; key exists locally', 'admin'); }
            else if (/WIZELIFE_RECAPTCHA_SITE_KEY\s*=\s*['"]6L/i.test(r.body)) {
                pass(`reCAPTCHA site key found in ${url.replace('https://wizelife.ai', '')}`);
            } else {
                fail(`reCAPTCHA site key MISSING in ${url}`, 'Re-add <script>window.WIZELIFE_RECAPTCHA_SITE_KEY=...</script> before js/wizelife-auth.js', 'claude');
            }
        } catch (e) { warn(`Could not fetch ${url}: ${e.message}`, 'check Cloudflare / GitHub Pages status', 'admin'); }
    }

    // 3. Firestore rules NOT in fully-permissive mode (rough check via SDK doc)
    //    We can't audit the rules directly via REST without admin token, but
    //    we can try an unauthenticated read of a known user doc — should 403.
    try {
        const r = await fetchText('https://firestore.googleapis.com/v1/projects/finzilla-7f1f9/databases/(default)/documents/users/__nonexistent__');
        // 400/401/403 all mean Firestore refused — that's what we want.
        // 404 means rules let the request through and the doc just doesn't exist (bad).
        // 200 means data was returned (very bad).
        if ([400, 401, 403].includes(r.status)) {
            pass(`Firestore rejects unauthenticated reads (status=${r.status}, good).`);
        } else if (r.status === 404) {
            fail('Firestore returned 404 on unauthenticated read — rules let request through.', 'Audit firestore.rules — request.auth must be checked on every match', 'claude');
        } else if (r.status === 200) {
            fail('🚨 CRITICAL: Firestore returned DATA on unauthenticated read. Rules are open.', 'Stop everything — open firestore.rules immediately and tighten match /users/{uid} to require request.auth.uid == uid', 'claude');
        } else {
            warn(`Firestore unauthenticated probe got unexpected status=${r.status}`, 'open Firebase Console to verify rules are still tight', 'admin');
        }
    } catch (e) { warn(`Firestore probe error: ${e.message}`, 'network issue, will retry next run', 'admin'); }

    // 4. Cloud Function approveBugReport rejects invalid token (proves admin auth works)
    try {
        const r = await fetchText('https://us-central1-finzilla-7f1f9.cloudfunctions.net/approveBugReport?id=probe&severity=critical&token=INVALID_PROBE');
        if (r.status === 401) pass('approveBugReport rejects invalid ADMIN_TOKEN (401).');
        else fail(`approveBugReport returned ${r.status} for invalid token — should be 401.`);
    } catch (e) { warn(`approveBugReport probe error: ${e.message}`); }

    // 5. Security headers on each sub-app
    for (const url of ['https://tax.wizelife.ai/', 'https://deal.wizelife.ai/', 'https://travel.wizelife.ai/']) {
        try {
            const r = await fetchText(url, { headersOnly: true });
            const has = (k) => !!r.headers[k];
            const missing = [];
            if (!has('strict-transport-security')) missing.push('HSTS');
            if (!has('x-content-type-options'))    missing.push('X-Content-Type-Options');
            if (missing.length) warn(`${url} missing headers: ${missing.join(', ')}`);
            else pass(`${url} has HSTS + X-Content-Type-Options`);
        } catch (e) { warn(`${url} header probe error: ${e.message}`); }
    }

    add('');
}

// ─── Tier 14 — External scanners (weekly: only Sundays) ──────────────────────
async function tier14() {
    const dow = new Date().getUTCDay(); // 0 = Sunday
    add('## Tier 14 — External scanners (weekly)');
    add('');
    if (dow !== 0) { add('_Skipped (runs Sundays only)._'); add(''); return; }

    // Mozilla Observatory v2 — async scan
    try {
        const r = await fetchText('https://observatory-api.mdn.mozilla.net/api/v2/scan?host=wizelife.ai', { headersOnly: false });
        const j = JSON.parse(r.body);
        if (j && j.grade) {
            const ok = /^[AB]/.test(j.grade);
            (ok ? pass : warn)(`Mozilla Observatory grade: **${j.grade}** (score ${j.score})`);
        } else {
            warn('Mozilla Observatory: no grade in response (cold scan? re-run later)');
        }
    } catch (e) { warn(`Mozilla Observatory error: ${e.message}`); }

    // SSL Labs grade
    try {
        const r = await fetchText('https://api.ssllabs.com/api/v3/analyze?host=wizelife.ai&fromCache=on&maxAge=24');
        const j = JSON.parse(r.body);
        if (j.status === 'READY' && j.endpoints && j.endpoints[0]) {
            const g = j.endpoints[0].grade;
            (/^A/.test(g) ? pass : warn)(`SSL Labs grade: **${g}**`);
        } else {
            warn(`SSL Labs: scan ${j.status || 'pending'} — re-run tomorrow`);
        }
    } catch (e) { warn(`SSL Labs error: ${e.message}`); }

    add('');
}

(async () => {
    add(`# Security report — ${new Date().toISOString()}`);
    add('');
    await jsParseCheck();
    await tier13();
    await tier14();
    add(`---`);

    // Action-only summary at the top of the report (user requested: only
    // surface what's broken or needs eyes — skip the long pass list).
    const summary = [];
    summary.push(`# 🚨 Action items — ${new Date().toISOString().slice(0,10)}`);
    summary.push('');
    if (!actions.length) {
        summary.push(`✅ **${passes} checks passed — no action needed.**`);
    } else {
        const fails  = actions.filter(a => a.severity === 'fail');
        const warns  = actions.filter(a => a.severity === 'warn');
        const byMe   = actions.filter(a => a.who === 'claude');
        const byYou  = actions.filter(a => a.who === 'admin');

        summary.push(`**${fails.length} failure(s), ${warns.length} warning(s), ${passes} pass.**`);
        summary.push('');
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
    summary.push('_<details><summary>Full report (passes + checks)</summary>_');
    summary.push('');

    const full = summary.join('\n') + '\n' + out.join('\n') + '\n</details>';
    const fails = actions.filter(a => a.severity === 'fail').length;
    fs.writeFileSync('security-report.md', full);
    fs.writeFileSync('/tmp/security-fails', String(fails));
    console.log(full);
    process.exit(0);
})();
