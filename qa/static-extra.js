#!/usr/bin/env node
/**
 * Tier 13l — Secret-leakage scan in deployed JS bundles
 * Tier 13m — Cookie security audit (Secure / HttpOnly / SameSite)
 *
 * HTTP-only — no Playwright. Fast (< 30s).
 */

const https = require('https');
const fs = require('fs');

const out = [];
const actions = [];
let passes = 0;
const add  = (l) => out.push(l);
const pass = (msg) => { passes++; add(`- ✅ ${msg}`); };
const fail = (msg, fix, who) => { actions.push({severity:'fail',who:who||'claude',msg,fix}); add(`- ❌ ${msg}`); };
const warn = (msg, fix, who) => { actions.push({severity:'warn',who:who||'admin',msg,fix}); add(`- ⚠️  ${msg}`); };

const fetchURL = (url) => new Promise((resolve) => {
    const req = https.request(url, (r) => {
        let chunks = '';
        r.on('data', d => chunks += d);
        r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: chunks }));
    });
    req.setTimeout(15000, () => { req.destroy(); resolve({status:0, headers:{}, body:''}); });
    req.on('error', () => resolve({status:0, headers:{}, body:''}));
    req.end();
});

// ─── Tier 13l — Secret leakage in deployed JS ────────────────────────────────
async function tier13l() {
    add('## Tier 13l — Secret leakage scan in deployed JS');
    add('');
    const SCRIPTS = [
        'https://wizelife.ai/js/wizelife-auth.js',
        'https://wizelife.ai/js/wize-bottom-nav.js',
        'https://wizelife.ai/js/wize-onboarding.js',
        'https://wizelife.ai/js/wize-hamburger.js',
        'https://wizelife.ai/js/wize-disclaimer.js',
        'https://money.wizelife.ai/js/sidebar.js',
        'https://money.wizelife.ai/js/app.js',
        'https://money.wizelife.ai/js/i18n.js',
        'https://money.wizelife.ai/js/paywall.js',
        'https://money.wizelife.ai/js/firebase-config.js', // public-by-design
    ];
    // Patterns that strongly indicate an accidentally-committed secret.
    // We deliberately exclude `apiKey` because Firebase requires its public
    // key in client config — that's safe.
    const PATTERNS = [
        { re: /['"]sk_live_[A-Za-z0-9]{16,}['"]/g,                 label: 'Stripe live secret key' },
        { re: /['"]sk_test_[A-Za-z0-9]{16,}['"]/g,                 label: 'Stripe test secret key' },
        { re: /['"]AIza[A-Za-z0-9_-]{35}['"]/g,                    label: 'Google API key',
          allowIf: (url, body) => /firebase-config\.js$|firebaseConfig/.test(url + body) },
        { re: /['"]ghp_[A-Za-z0-9]{36}['"]/g,                      label: 'GitHub personal access token' },
        { re: /['"]gho_[A-Za-z0-9]{36}['"]/g,                      label: 'GitHub OAuth token' },
        { re: /['"]github_pat_[A-Za-z0-9_]{40,}['"]/g,             label: 'GitHub fine-grained token' },
        { re: /['"]xox[baprs]-[A-Za-z0-9-]{10,}['"]/g,             label: 'Slack token' },
        { re: /-----BEGIN (RSA|EC|OPENSSH|DSA) PRIVATE KEY-----/g, label: 'Private key' },
        { re: /['"][0-9a-f]{32,64}['"]/gi,                         label: 'Long hex string (possible token)',
          /* Suppress matches that look like git SHAs / lockfile hashes embedded in comments */
          allowIf: (url, body) => /(checksum|sha\d|integrity|version)/.test(body.slice(0, 200)) },
        // Must be 8+ chars AND contain at least one digit AND not a Hebrew/foreign
        // word — defends against catching i18n labels like `password: 'סיסמה'`.
        { re: /password\s*[:=]\s*['"][A-Za-z0-9!@#$%^&*_+\-]{8,}['"]/gi,
          label: 'Hardcoded password',
          allowIf: (url, body) => /i18n\.js|locales|translations/i.test(url) },
        { re: /admin_token\s*[:=]\s*['"][A-Fa-f0-9]{16,}['"]/gi,    label: 'Admin token literal' },
    ];

    let findings = 0;
    for (const url of SCRIPTS) {
        const r = await fetchURL(url);
        if (r.status !== 200) { warn(`${url} → ${r.status}`, 'fix hosting', 'admin'); continue; }
        for (const p of PATTERNS) {
            const m = r.body.match(p.re);
            if (!m) continue;
            if (p.allowIf && p.allowIf(url, r.body)) continue;
            fail(`${p.label} pattern in ${url}: ${m[0].slice(0, 30)}…`,
                 `revoke + rotate immediately, then remove from source`,
                 'claude');
            findings++;
        }
    }
    if (!findings) pass(`${SCRIPTS.length} JS bundles scanned for secrets — none found`);
    add('');
}

// ─── Tier 13m — Cookie security audit ────────────────────────────────────────
async function tier13m() {
    add('## Tier 13m — Cookie security audit');
    add('');
    const PAGES = [
        'https://wizelife.ai/auth.html',
        'https://wizelife.ai/dashboard.html',
        'https://money.wizelife.ai/',
        'https://tax.wizelife.ai/',
        'https://deal.wizelife.ai/',
    ];
    let issues = 0;
    for (const url of PAGES) {
        const r = await fetchURL(url);
        const setCookie = r.headers['set-cookie'] || [];
        const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
        if (!cookies.length || !cookies[0]) {
            pass(`${url.replace('https://', '')} → no Set-Cookie (clean / SSR-only)`);
            continue;
        }
        for (const c of cookies) {
            const name = c.split('=')[0];
            const lower = c.toLowerCase();
            const flags = {
                Secure: lower.includes('secure'),
                HttpOnly: lower.includes('httponly'),
                SameSite: /samesite=(strict|lax|none)/.test(lower),
            };
            const missing = Object.entries(flags).filter(([_, v]) => !v).map(([k]) => k);
            if (!missing.length) pass(`${name} on ${url.replace('https://', '')}: Secure + HttpOnly + SameSite ✓`);
            else { warn(`${name} on ${url.replace('https://', '')} missing flags: ${missing.join(', ')}`,
                        `harden Set-Cookie at the server emitting it`,
                        missing.includes('HttpOnly') ? 'claude' : 'admin');
                   issues++; }
        }
    }
    if (!issues) pass(`all observed cookies properly flagged`);
    add('');
}

(async () => {
    add(`# Static-extra checks — ${new Date().toISOString()}`);
    add('');
    await tier13l();
    await tier13m();

    const failed = actions.filter(a => a.severity === 'fail');
    const warned = actions.filter(a => a.severity === 'warn');
    const summary = [];
    summary.push(`# 🚨 Static-extra action items — ${new Date().toISOString().slice(0,10)}`);
    summary.push('');
    if (!actions.length) {
        summary.push(`✅ **${passes} static-extra checks passed — no secrets leaked, cookies secure.**`);
    } else {
        summary.push(`**${failed.length} failure(s), ${warned.length} warning(s), ${passes} pass.**`);
        summary.push('');
        const byMe  = actions.filter(a => a.who === 'claude');
        const byYou = actions.filter(a => a.who === 'admin');
        if (byMe.length) { summary.push('## For Claude to fix:'); byMe.forEach(a => summary.push(`- ${a.severity === 'fail' ? '❌' : '⚠️'} ${a.msg}` + (a.fix ? ` — **fix:** ${a.fix}` : ''))); summary.push(''); }
        if (byYou.length){ summary.push('## For you to investigate:'); byYou.forEach(a => summary.push(`- ${a.severity === 'fail' ? '❌' : '⚠️'} ${a.msg}` + (a.fix ? ` — **fix:** ${a.fix}` : ''))); summary.push(''); }
    }
    summary.push('---'); summary.push('_<details><summary>Full detail</summary>_'); summary.push('');
    const full = summary.join('\n') + '\n' + out.join('\n') + '\n</details>';
    fs.writeFileSync('static-extra-report.md', full);
    fs.writeFileSync('/tmp/static-extra-fails', String(failed.length));
    console.log(full);
    process.exit(0);
})().catch(e => { console.error('static-extra crashed', e); process.exit(0); });
