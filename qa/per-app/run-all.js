#!/usr/bin/env node
// Orchestrator — runs every per-app QA in parallel + collects summary.
// Run: node qa/per-app/run-all.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const APPS = ['wizelife', 'wizemoney', 'wizetax', 'wizehealth', 'wizetravel', 'wizedeal'];

function runOne(app) {
    return new Promise((resolve) => {
        const script = path.join(__dirname, `${app}.qa.js`);
        if (!fs.existsSync(script)) { resolve({ app, status: 'missing' }); return; }
        let stdout = '', stderr = '';
        const p = spawn('node', [script], { env: process.env });
        p.stdout.on('data', d => stdout += d);
        p.stderr.on('data', d => stderr += d);
        p.on('close', code => {
            resolve({ app, status: code === 0 ? 'ok' : 'fail', stdout, stderr, code });
        });
    });
}

(async () => {
    console.log(`Starting parallel QA for ${APPS.length} apps…\n`);
    const t0 = Date.now();
    const results = await Promise.all(APPS.map(runOne));
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    // Aggregate
    console.log(`\n${'='.repeat(70)}\nSUMMARY (${elapsed}s)\n${'='.repeat(70)}`);
    let totalFails = 0, totalWarns = 0, totalPass = 0;
    for (const r of results) {
        if (r.status === 'missing') {
            console.log(`  ${r.app.padEnd(15)} MISSING SCRIPT`);
            continue;
        }
        const m = (r.stdout || '').match(/\*\*(\d+) failure\(s\), (\d+) warning\(s\), (\d+) pass\.\*\*/);
        const cleanMatch = (r.stdout || '').match(/(\d+) checks? passed — (\w+) clean/);
        if (m) {
            const f = +m[1], w = +m[2], p = +m[3];
            totalFails += f; totalWarns += w; totalPass += p;
            const mark = f ? '🚨' : w ? '⚠️ ' : '✅';
            console.log(`  ${mark} ${r.app.padEnd(15)} ${f} fails, ${w} warns, ${p} pass`);
        } else if (cleanMatch) {
            totalPass += +cleanMatch[1];
            console.log(`  ✅ ${r.app.padEnd(15)} ${cleanMatch[1]} pass (clean)`);
        } else {
            console.log(`  ❓ ${r.app.padEnd(15)} parse error (rc=${r.code})`);
            if (r.stderr) console.log('    stderr:', r.stderr.slice(0, 200));
        }
    }
    console.log('-'.repeat(70));
    console.log(`  TOTAL          ${totalFails} fails, ${totalWarns} warns, ${totalPass} pass`);
    process.exit(totalFails > 0 ? 1 : 0);
})();
