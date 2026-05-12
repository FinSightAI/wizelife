#!/usr/bin/env node
// Content scanner — protects against:
//   - placeholder/test data leaking to production
//   - missing disclaimers on advice pages (legal exposure)
//   - forbidden marketing claims ("guaranteed", "100% accurate", etc.)
//   - personal info (creator name) in user-facing copy
//   - outdated dates (Last updated: 2023 in 2026)
//   - inconsistent stats across pages
// Action-only output, runs in CI daily + locally via /run-qa-now.

const https = require('https');
const fs = require('fs');

const out  = ['# Content scan — ' + new Date().toISOString().slice(0, 10) + '\n'];
const fail = [];   // For Claude to fix (code/copy)
const warn = [];   // For user to investigate (often legal/judgment)
const pass = [];

function add(s) { out.push(s); }
function failure(msg, fix)  { fail.push({ msg, fix }); }
function warning(msg, fix)  { warn.push({ msg, fix }); }
function passed(msg)        { pass.push(msg); }

function fetchText(url) {
    return new Promise((resolve) => {
        const req = https.request(url, { method: 'GET', timeout: 25000, headers: { 'User-Agent': 'wizelife-content-scanner' } }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', e => resolve({ status: 0, body: '', error: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '', error: 'timeout' }); });
        req.end();
    });
}

// Strip HTML tags so we only inspect visible-text patterns
function visibleText(html) {
    return html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ─── 1. Placeholder / test data leakage ───────────────────────────────────
const PLACEHOLDER_PATTERNS = [
    { rx: /\blorem ipsum\b/i,          tag: 'Lorem ipsum placeholder' },
    { rx: /\b(TODO|FIXME|XXX|TBD)\b/,  tag: 'TODO/FIXME/XXX/TBD marker' },
    { rx: /\bjohn doe\b/i,             tag: 'John Doe placeholder' },
    { rx: /\bjane doe\b/i,             tag: 'Jane Doe placeholder' },
    { rx: /\btest@test\.com\b/i,       tag: 'test@test.com placeholder email' },
    { rx: /\bexample@example\.(com|org)\b/i, tag: 'example@example email' },
    { rx: /\b1234 main st(reet)?\b/i,  tag: '1234 Main St placeholder address' },
    { rx: /\bsample user\b/i,          tag: 'Sample User placeholder' },
    { rx: /\bplaceholder text\b/i,     tag: 'Placeholder text leaked' },
    { rx: /\bcoming soon\b/i,          tag: 'Coming Soon — verify intentional' },
];

// ─── 2. Forbidden marketing/legal-exposure claims ─────────────────────────
const FORBIDDEN_CLAIMS = [
    { rx: /\bguaranteed?\s+(returns?|profits?|savings?|results?)\b/i, tag: 'GUARANTEED financial outcome — illegal in most markets' },
    { rx: /\bno risk\b/i,                       tag: '"No risk" claim — financial misrepresentation' },
    { rx: /\b100\s*%\s*(accurate|safe|guarantee)\b/i, tag: '100% absolute claim' },
    { rx: /\bcure[sd]?\s+(your|the)\b/i,        tag: 'CURE claim (medical) — illegal without FDA/Health Ministry approval' },
    { rx: /\bdiagnose[sd]?\s+(your|the)\b/i,    tag: 'DIAGNOSE claim (medical) — needs licensed practitioner' },
    { rx: /\b(beat|outperform)s?\s+the\s+market\b/i, tag: '"Beat the market" — securities-advice exposure' },
    { rx: /\btax[\s-]?free\b(?!\s+savings\s+account)/i, tag: '"Tax-free" — verify legally accurate' },
    { rx: /\binvestment\s+advice\b/i,           tag: '"Investment advice" — must be followed by "not licensed" disclaimer' },
    { rx: /\bfinancial\s+advice\b/i,            tag: '"Financial advice" — needs not-licensed disclaimer' },
];

// ─── 3. Personal info — creator name should not be user-facing ────────────
const PERSONAL_INFO = [
    { rx: /\bOfir\s+Shamir\b/i,        tag: 'Creator full name visible' },
    { rx: /\bofirshamir57\b/i,         tag: 'Creator personal email handle visible' },
    { rx: /\b\+972[\s-]?5\d/,          tag: 'Israeli mobile number in copy' },
];

// ─── 4. Outdated date references ──────────────────────────────────────────
function checkOutdatedDates(text, url) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const cutoff = currentYear - 2; // anything older than 2 years counts as outdated
    // "Last updated: 2023" / "Updated 2023-Mar-12" patterns
    const updMatches = [...text.matchAll(/\b(?:last\s+updated?|updated|version|copyright|©)\s*[:\-]?\s*(20\d{2})\b/gi)];
    for (const m of updMatches) {
        const year = parseInt(m[1], 10);
        if (year > 2000 && year < cutoff) {
            warning(`${url}: outdated reference "${m[0]}"`, `update to ${currentYear} or remove`);
        }
    }
}

// ─── 5. Missing disclaimers on advice pages ────────────────────────────────
const ADVICE_PAGES = [
    {
        url: 'https://tax.wizelife.ai/advisor',
        kind: 'tax',
        mustContain: [/not\s+(licensed|legal|tax)\s+(advice|professional)/i, /disclaim/i, /informational/i, /אינו.*ייעוץ|לא.*מהווה.*ייעוץ/],
        label: 'WizeTax disclaimer',
    },
    {
        url: 'https://vitara.onrender.com/',
        kind: 'health',
        mustContain: [/consult.*doctor|consult.*physician|not.*medical.*advice|informational/i, /התייעצ.*רופא|אינו.*מהווה/],
        label: 'WizeHealth disclaimer',
    },
    {
        url: 'https://money.wizelife.ai/pages/investment-advisor.html',
        kind: 'finance',
        mustContain: [/not.*financial.*advice|not.*licensed|informational|disclaim/i, /אינו.*ייעוץ.*השקעות|לא.*מהווה/],
        label: 'WizeMoney advisor disclaimer',
    },
    {
        url: 'https://deal.wizelife.ai/',
        kind: 'real-estate',
        mustContain: [/not.*real.*estate.*advice|investment.*risk|not.*licensed|informational|disclaim/i, /אינו.*ייעוץ|לא.*מהווה/],
        label: 'WizeDeal disclaimer',
        // Many SPAs lazy-load — be more lenient (warn, not fail)
        warnOnly: true,
    },
];

// ─── 6. Targets to crawl for generic checks ──────────────────────────────
const ALL_TARGETS = [
    'https://wizelife.ai/',
    'https://wizelife.ai/about.html',
    'https://wizelife.ai/auth.html',
    'https://wizelife.ai/dashboard.html',
    'https://wizelife.ai/feedback.html',
    'https://wizelife.ai/terms.html',
    'https://wizelife.ai/privacy.html',
    'https://wizelife.ai/security.html',
    'https://money.wizelife.ai/',
    'https://money.wizelife.ai/pages/income.html',
    'https://money.wizelife.ai/pages/investment-advisor.html',
    'https://tax.wizelife.ai/',
    'https://tax.wizelife.ai/advisor',
    'https://travel.wizelife.ai/',
    'https://deal.wizelife.ai/',
    // health.wizelife.ai is just an iframe wrapper — vitara.onrender.com is the actual content
    'https://vitara.onrender.com/',
];

async function main() {
    add('## Crawling ' + ALL_TARGETS.length + ' pages…');
    add('');

    // ── A. Disclaimer presence on advice pages ───────────────────────────
    add('## Disclaimer presence on advice pages');
    add('');
    for (const page of ADVICE_PAGES) {
        const r = await fetchText(page.url);
        if (r.status !== 200) {
            warning(`${page.label}: page returned HTTP ${r.status}`, `verify URL and add disclaimer once page is up`);
            continue;
        }
        const text = visibleText(r.body);
        const found = page.mustContain.some(rx => rx.test(text) || rx.test(r.body));
        if (found) {
            passed(`${page.label}: disclaimer present`);
        } else if (page.warnOnly) {
            warning(`${page.label}: no disclaimer detected (page may lazy-load — verify in browser)`, `add visible "not licensed/professional advice" notice`);
        } else {
            failure(`${page.label}: NO disclaimer found`, `add visible "not licensed ${page.kind} advice" disclaimer to ${page.url}`);
        }
    }
    add('');

    // ── B. Forbidden claims + placeholder + personal info across all targets
    add('## Forbidden claims / placeholders / personal info');
    add('');
    for (const url of ALL_TARGETS) {
        const r = await fetchText(url);
        if (r.status !== 200) continue;
        const text = visibleText(r.body);

        // Placeholder leakage
        for (const { rx, tag } of PLACEHOLDER_PATTERNS) {
            if (rx.test(text)) {
                const sample = (text.match(rx) || [''])[0];
                failure(`${url}: ${tag} ("${sample.slice(0, 40)}")`, 'remove placeholder before launch');
            }
        }

        // Forbidden claims
        for (const { rx, tag } of FORBIDDEN_CLAIMS) {
            if (rx.test(text)) {
                const sample = (text.match(rx) || [''])[0];
                warning(`${url}: ${tag} ("${sample.slice(0, 60)}")`, 'rephrase or add explicit disclaimer right next to claim');
            }
        }

        // Personal info
        for (const { rx, tag } of PERSONAL_INFO) {
            if (rx.test(text)) {
                const sample = (text.match(rx) || [''])[0];
                failure(`${url}: ${tag} ("${sample.slice(0, 40)}")`, 'replace with "The WizeLife Team" / generic copy');
            }
        }

        // Outdated dates
        checkOutdatedDates(text, url);
    }
    add('');

    // ── C. Consistency check: user counts across pages ────────────────────
    add('## Stats consistency (claimed user count, etc.)');
    add('');
    const numberPattern = /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:k|m|million|thousand|\+|users|companies|customers)/gi;
    const claims = {}; // page → array of {value, raw}
    for (const url of ALL_TARGETS.slice(0, 6)) { // only check WizeLife marketing pages
        const r = await fetchText(url);
        if (r.status !== 200) continue;
        const text = visibleText(r.body);
        claims[url] = [];
        let m;
        while ((m = numberPattern.exec(text)) !== null) {
            if (/users|customers|companies/i.test(m[0])) claims[url].push(m[0]);
        }
    }
    const allClaims = new Set();
    for (const url of Object.keys(claims)) {
        for (const c of claims[url]) allClaims.add(c.toLowerCase().replace(/\s+/g, ' '));
    }
    if (allClaims.size > 3) {
        warning(`Found ${allClaims.size} different user-count claims across marketing pages: ${[...allClaims].slice(0, 5).join(', ')}`, 'pick ONE number and use it everywhere');
    } else {
        passed(`User-count claims consistent (${allClaims.size} unique)`);
    }
    add('');

    // ─── Format report ────────────────────────────────────────────────────
    const summary = ['# 🚨 Content action items — ' + new Date().toISOString().slice(0, 10), ''];
    if (!fail.length && !warn.length) {
        summary.push(`✅ **${pass.length} checks passed — no content issues found.**`);
    } else {
        summary.push(`**${fail.length} failure(s), ${warn.length} warning(s), ${pass.length} pass.**`);
        summary.push('');
        if (fail.length) {
            summary.push('## For Claude to fix:');
            for (const f of fail) summary.push(`- ❌ ${f.msg} — **fix:** ${f.fix}`);
            summary.push('');
        }
        if (warn.length) {
            summary.push('## For you to investigate / fix:');
            for (const w of warn) summary.push(`- ⚠️ ${w.msg} — **fix:** ${w.fix}`);
            summary.push('');
        }
    }
    summary.push('---');
    summary.push('_<details><summary>Full detail (pass list)</summary>_');
    summary.push('');
    for (const p of pass) summary.push(`- ✅ ${p}`);
    summary.push('');
    summary.push('</details>');
    summary.push('');
    summary.push(...out);

    const report = summary.join('\n');
    fs.writeFileSync('content-scan-report.md', report);
    fs.writeFileSync('/tmp/content-scan-fails', String(fail.length));
    console.log(report);
}

main().catch(e => {
    console.error('Fatal:', e.message);
    fs.writeFileSync('content-scan-report.md', '# Content scan crashed\n\n' + e.message);
    fs.writeFileSync('/tmp/content-scan-fails', '999');
    process.exit(0);
});
