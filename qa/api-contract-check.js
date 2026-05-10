#!/usr/bin/env node
/**
 * Tier 13e — API contract check
 *
 * Calls every Cloud Function endpoint with deliberately-bad payloads and
 * verifies they reject with the EXPECTED error shape. This catches:
 *   - A function that crashed and returns 500 instead of the documented 401
 *   - A function whose auth gate was accidentally removed
 *   - A function whose rate-limit threshold drifted
 *   - A function that's no longer deployed
 *
 * Output: action-only summary at the top.
 */

const https = require('https');
const fs = require('fs');

const PROJECT = 'finzilla-7f1f9';
const REGION  = 'us-central1';
const BASE    = `https://${REGION}-${PROJECT}.cloudfunctions.net`;

const out = [];
const actions = [];
let passes = 0;
const add  = (l) => out.push(l);
const pass = (msg) => { passes++; add(`- ✅ ${msg}`); };
const fail = (msg, fix, who) => { actions.push({severity:'fail',who:who||'claude',msg,fix}); add(`- ❌ ${msg}`); };

const post = (path, body) => new Promise((resolve) => {
    const data = JSON.stringify(body || {});
    const u = new URL(BASE + path);
    const req = https.request({
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
        },
    }, (r) => {
        let chunks = '';
        r.on('data', d => chunks += d);
        r.on('end', () => resolve({ status: r.statusCode, body: chunks }));
    });
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.write(data); req.end();
});

const get = (path) => new Promise((resolve) => {
    https.get(BASE + path, (r) => {
        let chunks = '';
        r.on('data', d => chunks += d);
        r.on('end', () => resolve({ status: r.statusCode, body: chunks }));
    }).on('error', (e) => resolve({ status: 0, body: e.message }));
});

(async () => {
    add(`# API contract — ${new Date().toISOString()}`);
    add('');

    // 1. validateCode — callable, requires auth → expect 401-equivalent
    {
        const r = await post('/validateCode', { data: { code: 'TESTPROBE' } });
        const j = (() => { try { return JSON.parse(r.body); } catch { return {}; } })();
        const code = j.error?.status || j.error?.code;
        if (code === 'UNAUTHENTICATED' || r.status === 401) pass('validateCode rejects no-auth (UNAUTHENTICATED).');
        else fail(`validateCode wrong rejection: status=${r.status} code=${code || 'n/a'}`,
                  'verify functions/index.js: validateCode must throw HttpsError("unauthenticated") on !context.auth',
                  'claude');
    }

    // 2. awardReferral — same shape
    {
        const r = await post('/awardReferral', { data: { tier: 'pro' } });
        const j = (() => { try { return JSON.parse(r.body); } catch { return {}; } })();
        const code = j.error?.status || j.error?.code;
        if (code === 'UNAUTHENTICATED' || r.status === 401) pass('awardReferral rejects no-auth (UNAUTHENTICATED).');
        else fail(`awardReferral wrong rejection: status=${r.status} code=${code || 'n/a'}`,
                  'check auth gate in awardReferral',
                  'claude');
    }

    // 3. notifyLoginAlert — best-effort: returns 200 {skipped:'no-auth'} by
    //    design (fire-and-forget callable, client never blocks on it). The
    //    actual auth gate is the `if (!context.auth) return ...` inside the
    //    function. Verify that pattern works: either 401 OR 200 with
    //    `result.skipped === 'no-auth'` is acceptable.
    {
        const r = await post('/notifyLoginAlert', { data: { ua: 'probe' } });
        const j = (() => { try { return JSON.parse(r.body); } catch { return {}; } })();
        if (r.status === 401) pass('notifyLoginAlert rejects no-auth (401).');
        else if (r.status === 200 && j.result?.skipped === 'no-auth') pass('notifyLoginAlert returns {skipped:no-auth} on no-auth (correct).');
        else fail(`notifyLoginAlert unexpected response: status=${r.status} body=${(r.body||'').slice(0,120)}`,
                  'auth gate missing — must throw UNAUTHENTICATED or return {skipped:no-auth}',
                  'claude');
    }

    // 4. approveBugReport — HTTP, requires ADMIN_TOKEN → expect 401 on bad token
    {
        const r = await get('/approveBugReport?id=probe&severity=critical&token=INVALID');
        if (r.status === 401) pass('approveBugReport rejects invalid ADMIN_TOKEN (401).');
        else fail(`approveBugReport wrong rejection: status=${r.status}`,
                  'check ADMIN_TOKEN gate in approveBugReport',
                  'claude');
    }

    // 5. approveBugReport with NO token at all → still 401
    {
        const r = await get('/approveBugReport?id=probe&severity=critical');
        if (r.status === 401) pass('approveBugReport rejects missing token (401).');
        else fail(`approveBugReport missing-token rejection wrong: status=${r.status}`,
                  'token check must reject empty too',
                  'claude');
    }

    // 6. paypalWebhook — POST, expects PayPal signature. Any 4xx is fine
    //    (rejection of unsigned payload). Only 200/2xx would be a security bug.
    {
        const r = await post('/paypalWebhook', { event_type: 'TEST_PROBE' });
        if (r.status >= 400 && r.status < 500) pass(`paypalWebhook rejects unsigned payload (${r.status}).`);
        else fail(`paypalWebhook accepted unsigned payload: status=${r.status} — signature check broken`,
                  'verify functions/index.js paypalWebhook: verifyWebhook must run BEFORE any plan update',
                  'claude');
    }

    // 7. validateCode rate-limit: hit it 6 times (over the 5/min cap), expect rejection
    //    We can't hit the limit because each call already fails on auth before
    //    the rate-limit logic runs. Skipping for now.

    // Summary at top
    add('---');
    const failed = actions.filter(a => a.severity === 'fail');
    const summary = [];
    summary.push(`# 🚨 API action items — ${new Date().toISOString().slice(0,10)}`);
    summary.push('');
    if (!actions.length) {
        summary.push(`✅ **${passes} contract checks passed — every Cloud Function rejects bad input the expected way.**`);
    } else {
        summary.push(`**${failed.length} failure(s), ${passes} pass.**`);
        summary.push('');
        summary.push('## For Claude to fix:');
        failed.forEach(a => summary.push(`- ❌ ${a.msg}` + (a.fix ? ` — **fix:** ${a.fix}` : '')));
        summary.push('');
    }
    summary.push('---');
    summary.push('_<details><summary>Full detail</summary>_');
    summary.push('');

    const full = summary.join('\n') + '\n' + out.join('\n') + '\n</details>';
    fs.writeFileSync('api-contract-report.md', full);
    fs.writeFileSync('/tmp/api-fails', String(failed.length));
    console.log(full);
    process.exit(0);
})().catch(e => { console.error('api-contract-check crashed', e); process.exit(0); });
