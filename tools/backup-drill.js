#!/usr/bin/env node
/**
 * backup-drill.js — Restore Firestore backup to a DRILL project + validate.
 *
 * 🛑 SAFETY GUARD: refuses to run unless DRILL_PROJECT_ID env var is set
 *    AND does NOT match the prod project ID. This prevents an accidental
 *    overwrite of production data — the single biggest disaster-recovery
 *    risk.
 *
 * Daily backup is per `project_security_baseline` memory. This script
 * validates that the backup is ACTUALLY restorable (not just present).
 *
 * Usage:
 *    DRILL_PROJECT_ID=finzilla-drill-1 node tools/backup-drill.js
 *
 * Future automation: cron monthly. Sends report to /tmp/backup-drill-report.md.
 *
 * IMPORTANT: This script does NOT actually invoke gcloud — it's a SCAFFOLD
 * with documented safety guards. The user must wire it to their gcloud
 * credentials + Firebase admin SDK. Doing the actual restore requires
 * service-account JSON which I don't have.
 */
const fs = require('fs');
const path = require('path');

// ── Safety guards ─────────────────────────────────────────────────────────
const PROD_PROJECT_ID = 'finzilla-7f1f9'; // per CLAUDE.md
const DRILL_ID = process.env.DRILL_PROJECT_ID;

function fatal(msg) {
  console.error('🛑 ' + msg);
  process.exit(1);
}

if (!DRILL_ID) {
  fatal('DRILL_PROJECT_ID env var required. Refusing to run without it.\n' +
        '   Example:  DRILL_PROJECT_ID=finzilla-drill-1 node tools/backup-drill.js\n' +
        '   The drill project MUST be different from the prod project (' + PROD_PROJECT_ID + ').');
}

if (DRILL_ID === PROD_PROJECT_ID) {
  fatal('DRILL_PROJECT_ID === PROD_PROJECT_ID (' + PROD_PROJECT_ID + ')\n' +
        '   Drilling would WIPE production data. Refusing.\n' +
        '   Set DRILL_PROJECT_ID to a separate Firebase project.');
}

if (!/^finzilla-(drill|backup|test)/i.test(DRILL_ID)) {
  fatal('DRILL_PROJECT_ID looks unsafe: "' + DRILL_ID + '"\n' +
        '   Expected pattern: finzilla-drill-* or finzilla-backup-* or finzilla-test-*\n' +
        '   This is a defensive convention — rename the drill project to match,\n' +
        '   or edit this script if you intentionally chose a different naming scheme.');
}

const REPORT = path.join('/tmp', 'backup-drill-report.md');
const STAMP  = new Date().toISOString();

// ── Stub steps (user must wire to real gcloud/firebase-admin) ─────────────
const checks = [];

async function step(name, fn) {
  process.stdout.write('  ' + name + '… ');
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log('✓');
  } catch (e) {
    checks.push({ name, ok: false, err: e.message });
    console.log('✗ ' + e.message.slice(0, 80));
  }
}

(async () => {
  console.log('🛡️  WizeLife backup-drill — ' + STAMP);
  console.log('   Prod project:  ' + PROD_PROJECT_ID + ' (read-only)');
  console.log('   Drill project: ' + DRILL_ID + ' (will be overwritten)');
  console.log();

  await step('Verify drill project exists', async () => {
    // TODO wire: `gcloud projects describe ${DRILL_ID}`
    // For now, just emit a TODO marker — user wires gcloud-cli check.
    if (!process.env.GCLOUD_CONFIGURED) throw new Error('gcloud not configured locally (set GCLOUD_CONFIGURED=1 once you have)');
  });

  await step('Find latest prod backup', async () => {
    // TODO wire: list backups via Firestore Backup API
    //   `gcloud firestore backups list --project=${PROD_PROJECT_ID} --format=json | jq '.[0]'`
    // Expected: backup created within last 24 hours.
    throw new Error('TODO — wire to gcloud firestore backups list');
  });

  await step('Restore backup into drill project', async () => {
    // TODO wire:
    //   `gcloud firestore import gs://${PROD_PROJECT_ID}-backups/<latest> --project=${DRILL_ID}`
    // This is the actual restore operation — irreversible on drill side.
    throw new Error('TODO — wire to gcloud firestore import');
  });

  await step('Validate drill data: /users count > 0', async () => {
    // TODO wire: firebase-admin SDK, count documents in /users
    throw new Error('TODO — firebase-admin SDK');
  });

  await step('Validate drill data: latest /audit_log entry within 7 days', async () => {
    // TODO wire: firebase-admin SDK, query /audit_log order by timestamp desc limit 1
    throw new Error('TODO — firebase-admin SDK');
  });

  await step('Validate drill data: sample user document round-trip', async () => {
    // TODO wire: pick a known UID, fetch from drill, compare schema vs prod.
    throw new Error('TODO — firebase-admin SDK');
  });

  // ── Report ────────────────────────────────────────────────────────────
  const ok = checks.filter(c => c.ok).length;
  const failed = checks.filter(c => !c.ok);
  const lines = [
    '# Backup drill — ' + STAMP,
    '',
    `**Result:** ${ok}/${checks.length} steps passed`,
    '',
    `- Prod project (read-only): \`${PROD_PROJECT_ID}\``,
    `- Drill project: \`${DRILL_ID}\``,
    '',
    '## Steps',
    ...checks.map(c => `- ${c.ok ? '✅' : '❌'} ${c.name}${c.ok ? '' : ' — ' + c.err}`),
    '',
  ];

  if (failed.length) {
    lines.push('## Next: wire the TODOs');
    lines.push('This script is currently a SCAFFOLD. To complete:');
    lines.push('1. Install `gcloud` CLI + run `gcloud auth login`.');
    lines.push('2. Install `firebase-admin` SDK: `cd tools && npm i firebase-admin`.');
    lines.push('3. Create a service account on the drill project + download JSON.');
    lines.push('4. Set `GOOGLE_APPLICATION_CREDENTIALS` env var to the JSON path.');
    lines.push('5. Set `GCLOUD_CONFIGURED=1`.');
    lines.push('6. Replace each `throw new Error(\'TODO …\')` block with the documented command.');
  }

  fs.writeFileSync(REPORT, lines.join('\n'));
  console.log('\nReport: ' + REPORT);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
