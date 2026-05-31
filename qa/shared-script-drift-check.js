#!/usr/bin/env node
/**
 * Shared-script drift check (LOCAL, fast, no browser).
 * The canonical wize-*.js live in TOTALIST/wizelife/js/ and are mirrored into
 * each sub-app. iCloud reversion + missed mirrors have caused silent drift
 * (a fix lands in one app but not others). This asserts every mirror is
 * byte-identical to the canonical. Run after editing any shared script.
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..'); // Desktop - O’s MacBook Air
const CANON = path.join(__dirname, '..', 'js');    // TOTALIST/wizelife/js
const SCRIPTS = ['wize-bottom-nav.js', 'wize-onboarding.js', 'wize-hamburger.js', 'wize-disclaimer.js', 'wize-version-check.js'];
const DESTS = [
  'finance dashboard/js',
  'RAMBAM/public',
  'Check Deal/public',
  'tax master/frontend/public',
  'wizetravel-app/public',
];

function md5(p) { try { return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'); } catch { return null; } }

const out = ['# Shared-script drift\n', `_run ${new Date().toISOString()}_\n`];
let fails = 0, checked = 0;
for (const s of SCRIPTS) {
  const canon = md5(path.join(CANON, s));
  if (!canon) { out.push(`- ⚠️ canonical missing: ${s}`); continue; }
  for (const d of DESTS) {
    const dp = path.join(ROOT, d, s);
    if (!fs.existsSync(dp)) { out.push(`- ⚠️ ${d}/${s} — not present (app may not use it)`); continue; }
    checked++;
    const m = md5(dp);
    if (m !== canon) { fails++; out.push(`- ❌ DRIFT: ${d}/${s} differs from canonical`); }
  }
}
out.push(`\n## Result`);
out.push(fails ? `🚨 ${fails} drifted mirror(s) — re-run /mirror-scripts` : `✅ all ${checked} mirrors match canonical`);
const report = out.join('\n');
fs.writeFileSync('shared-script-drift-report.md', report);
console.log(report);
process.exit(fails ? 1 : 0);
