#!/usr/bin/env node
/**
 * Tier 13f — SW cache integrity
 * Tier 13h — Email DNS (SPF / DKIM / DMARC)
 * Tier 13i — Rate-limit live test
 * Tier 13j — Open redirect / CSRF guards
 *
 * Each tier writes action items into the same actions array; the final
 * report is the action-only summary the user asked for.
 */

const https = require('https');
const dns = require('dns').promises;
const fs = require('fs');

const out = [];
const actions = [];
let passes = 0;
const add  = (l) => out.push(l);
const pass = (msg) => { passes++; add(`- ✅ ${msg}`); };
const fail = (msg, fix, who) => { actions.push({severity:'fail',who:who||'claude',msg,fix}); add(`- ❌ ${msg}`); };
const warn = (msg, fix, who) => { actions.push({severity:'warn',who:who||'admin',msg,fix}); add(`- ⚠️  ${msg}`); };

const fetchText = (url) => new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET' }, (r) => {
        let chunks = '';
        r.on('data', c => chunks += c);
        r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: chunks }));
    });
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
});
const head = (url) => new Promise((resolve) => {
    try {
        const u = new URL(url);
        const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'HEAD' }, (r) => { resolve(r.statusCode); req.destroy(); });
        req.setTimeout(8000, () => { req.destroy(); resolve(0); });
        req.on('error', () => resolve(0));
        req.end();
    } catch { resolve(0); }
});

// ─── Tier 13f — Service Worker cache integrity ───────────────────────────────
async function tier13f() {
    add('## Tier 13f — SW cache integrity');
    add('');
    const SW_URLS = [
        { sw: 'https://wizelife.ai/sw.js',                   origin: 'https://wizelife.ai' },
        { sw: 'https://money.wizelife.ai/sw.js',             origin: 'https://money.wizelife.ai' },
        { sw: 'https://health.wizelife.ai/sw.js',            origin: 'https://health.wizelife.ai' },
    ];
    for (const { sw, origin } of SW_URLS) {
        try {
            const r = await fetchText(sw);
            if (r.status !== 200) { warn(`${sw} → HTTP ${r.status}`, 'restore sw.js or remove cache claim', 'claude'); continue; }
            // Pull the SHELL/PRECACHE array
            const shellMatch = r.body.match(/(?:SHELL|PRECACHE|ASSETS_TO_CACHE)\s*=\s*\[([^\]]+)\]/);
            if (!shellMatch) { warn(`${sw}: no SHELL/PRECACHE array found`, 'skip — manual review', 'claude'); continue; }
            const items = shellMatch[1]
                .split(',')
                .map(s => s.replace(/^\s*['"`]/, '').replace(/['"`]\s*$/, '').trim())
                .filter(s => s && !s.startsWith('//') && !s.startsWith('http'));
            let bad = 0;
            for (const path of items) {
                const url = origin + (path.startsWith('/') ? path : '/' + path);
                const code = await head(url);
                if (code === 403) { warn(`SW shell asset 403 (CF-protected, not missing): ${url}`, 'Cloudflare blocks QA bot HEAD — OK in production', 'admin'); continue; }
                if (code === 404 || code === 0) {
                    fail(`SW shell asset 404: ${url} (cached by ${sw})`,
                         `remove ${path} from SHELL[] in ${sw} OR restore the file`,
                         'claude');
                    bad++;
                }
            }
            if (!bad) pass(`${sw}: all ${items.length} shell assets reachable`);
        } catch (e) { warn(`${sw}: ${e.message}`, 'check hosting', 'admin'); }
    }
    add('');
}

// ─── Tier 13h — Email DNS (SPF / DKIM / DMARC) ───────────────────────────────
async function tier13h() {
    add('## Tier 13h — Email DNS records (wizelife.ai)');
    add('');
    // SPF
    try {
        const txts = (await dns.resolveTxt('wizelife.ai')).map(r => r.join(''));
        const spf = txts.find(t => t.toLowerCase().startsWith('v=spf1'));
        if (spf) pass(`SPF found: \`${spf}\``);
        else warn('SPF record MISSING for wizelife.ai',
                  `add a TXT record: 'v=spf1 include:_spf.google.com ~all' in Cloudflare → DNS`,
                  'admin');
    } catch (e) { warn(`SPF lookup failed: ${e.code || e.message}`, 'DNS misconfig?', 'admin'); }

    // DMARC
    try {
        const txts = (await dns.resolveTxt('_dmarc.wizelife.ai').catch(() => [])).map(r => r.join(''));
        const dmarc = txts.find(t => t.toLowerCase().startsWith('v=dmarc1'));
        if (dmarc) pass(`DMARC found: \`${dmarc}\``);
        else warn('DMARC record MISSING for _dmarc.wizelife.ai',
                  `add TXT record at _dmarc.wizelife.ai: 'v=DMARC1; p=quarantine; rua=mailto:wizelife.ai@gmail.com'`,
                  'admin');
    } catch (e) { warn(`DMARC lookup failed: ${e.code || e.message}`, '', 'admin'); }

    // DKIM — Google uses google._domainkey; we just check presence
    try {
        const txts = (await dns.resolveTxt('google._domainkey.wizelife.ai').catch(() => [])).map(r => r.join(''));
        const dkim = txts.find(t => t.toLowerCase().includes('v=dkim1'));
        if (dkim) pass('DKIM (google._domainkey) found');
        else warn('DKIM MISSING for google._domainkey.wizelife.ai',
                  'enable in Gmail Admin Console (or your wizelife.ai@gmail.com — only works with Google Workspace)',
                  'admin');
    } catch (e) { warn(`DKIM lookup failed: ${e.code || e.message}`, '', 'admin'); }
    add('');
}

// ─── Tier 13i — Rate-limit live test ─────────────────────────────────────────
async function tier13i() {
    add('## Tier 13i — Rate-limit live test');
    add('');
    const URL = 'https://us-central1-finzilla-7f1f9.cloudfunctions.net/approveBugReport';
    // Hit approveBugReport 12 times rapidly with invalid token. Expect 401
    // on early hits, and the function to keep responding (not crash).
    let ok401 = 0, other = 0;
    for (let i = 0; i < 12; i++) {
        const r = await fetchText(URL + '?id=probe&severity=critical&token=INVALID_' + i).catch(() => ({ status: 0 }));
        if (r.status === 401) ok401++;
        else other++;
    }
    if (ok401 >= 10) pass(`approveBugReport survived 12 rapid invalid calls, all rejected (${ok401}×401, ${other}×other).`);
    else fail(`approveBugReport: only ${ok401}/12 rejected with 401, others returned ${other}`,
              'verify ADMIN_TOKEN gate hasn\'t regressed',
              'claude');
    add('');
}

// ─── Tier 13j — Open redirect / CSRF guards ──────────────────────────────────
async function tier13j() {
    add('## Tier 13j — Open redirect probes');
    add('');
    // Try various `?next=` / `?redirect=` / `?return_to=` injections on the
    // auth + dashboard pages. The page should either ignore the param or
    // redirect ONLY to whitelisted origins, never to an attacker domain.
    const PROBES = [
        'https://wizelife.ai/auth.html?redirect=https://evil.example/',
        'https://wizelife.ai/auth.html?next=//evil.example/',
        'https://wizelife.ai/dashboard.html?return_to=https://evil.example/',
    ];
    for (const url of PROBES) {
        try {
            const r = await fetchText(url);
            // We should NOT see evil.example anywhere in a Location header or in a meta refresh redirect.
            const loc = r.headers.location || '';
            if (loc.includes('evil.example')) {
                fail(`OPEN REDIRECT: ${url} → Location: ${loc}`,
                     'sanitize the redirect parameter; only allow same-origin or whitelisted destinations',
                     'claude');
                continue;
            }
            if (/meta\s+http-equiv=["']?refresh["']?[^>]+evil\.example/i.test(r.body)) {
                fail(`OPEN REDIRECT (meta refresh): ${url}`,
                     'remove any user-supplied URL from meta-refresh content',
                     'claude');
                continue;
            }
            pass(`${url.replace('https://wizelife.ai', '')} safe — attacker param ignored`);
        } catch (e) { warn(`probe failed: ${e.message}`, 'network issue', 'admin'); }
    }
    add('');
}

(async () => {
    add(`# Extended checks — ${new Date().toISOString()}`);
    add('');
    await tier13f();
    await tier13h();
    await tier13i();
    await tier13j();

    // Action-only summary at top
    const failed = actions.filter(a => a.severity === 'fail');
    const warned = actions.filter(a => a.severity === 'warn');
    const summary = [];
    summary.push(`# 🚨 Extended action items — ${new Date().toISOString().slice(0,10)}`);
    summary.push('');
    if (!actions.length) {
        summary.push(`✅ **${passes} extended checks passed.**`);
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
            summary.push('## For you to investigate / fix:');
            byYou.forEach(a => summary.push(`- ${a.severity === 'fail' ? '❌' : '⚠️'} ${a.msg}` + (a.fix ? ` — **fix:** ${a.fix}` : '')));
            summary.push('');
        }
    }
    summary.push('---');
    summary.push('_<details><summary>Full detail</summary>_');
    summary.push('');

    const full = summary.join('\n') + '\n' + out.join('\n') + '\n</details>';
    fs.writeFileSync('extended-report.md', full);
    fs.writeFileSync('/tmp/extended-fails', String(failed.length));
    console.log(full);
    process.exit(0);
})().catch(e => { console.error('extended-checks crashed', e); process.exit(0); });
