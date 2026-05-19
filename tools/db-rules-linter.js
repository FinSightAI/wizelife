#!/usr/bin/env node
/**
 * db-rules-linter.js
 *
 * Walks the WizeLife repos for Firestore / Storage / Realtime DB security
 * rule files and flags risky patterns.
 *
 * Files inspected:
 *   - *.rules                                  (firestore.rules, storage.rules)
 *   - database.rules.json                      (RTDB)
 *   - firebase.json                            (any `"rules"` blocks)
 *
 * Patterns flagged:
 *   ERROR  — `allow read: if true;`
 *   ERROR  — `allow write: if true;`
 *   ERROR  — `allow read, write: if true;`
 *   ERROR  — `match /{document=**}` followed within 5 lines by `if true`
 *   WARN   — `allow … if request.auth != null;` without a per-doc uid check
 *
 * Output: /tmp/db-rules-linter-report.md
 *
 * Exit:
 *   0 — no ERROR findings (WARNs allowed)
 *   1 — at least one ERROR finding
 *
 * Run:  node tools/db-rules-linter.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPOS = [
  "/Users/s/Desktop/Desktop - O’s MacBook Air/TOTALIST/wizelife",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/tax master",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/finance dashboard",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/RAMBAM",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/wizetravel-app",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/Check Deal",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/mega traveller",
];

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', '.venv', 'venv', '__pycache__',
  'build', 'dist', 'out', '.vercel', '.cache', '.turbo',
  'coverage', '.firebase', '.expo', 'ios', 'android',
]);

const REPORT_PATH = '/tmp/db-rules-linter-report.md';

// --------------------------------------------------------------------------
// Walk
// --------------------------------------------------------------------------

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const ent of entries) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walk(full);
    } else if (ent.isFile()) {
      const name = ent.name.toLowerCase();
      if (name.endsWith('.rules') ||
          name === 'database.rules.json' ||
          name === 'firebase.json') {
        yield full;
      }
    }
  }
}

// --------------------------------------------------------------------------
// Pattern checks
// --------------------------------------------------------------------------

// Strict "if true" — ignore inside comments and only when it's clearly the
// terminating condition for an `allow ...` rule.
const ALLOW_TRUE_RE = /\ballow\s+([a-z, ]+?)\s*:\s*if\s+true\s*;/i;
const MATCH_WILD_RE = /match\s+\/\{document\s*=\s*\*\*\}/i;
const ALLOW_LINE_RE = /\ballow\s+([a-z, ]+?)\s*:\s*if\s+(.+?);/i;
const COMMENT_RE    = /^\s*(\/\/|#)/;

function stripInlineComment(line) {
  // Drop // comments — naive but fine for .rules files.
  const idx = line.indexOf('//');
  if (idx >= 0) return line.slice(0, idx);
  return line;
}

function lintRulesFile(filePath, content) {
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw  = lines[i];
    if (COMMENT_RE.test(raw)) continue;
    const line = stripInlineComment(raw);

    // ---- ERROR: `allow ...: if true;`
    let m = ALLOW_TRUE_RE.exec(line);
    if (m) {
      const ops = m[1].trim().toLowerCase();
      findings.push({
        severity: 'ERROR',
        rule: `allow ${ops}: if true;`,
        file: filePath,
        line: i + 1,
        excerpt: raw.trim().slice(0, 200),
        note: 'Public read/write — anyone on the internet can access this data',
      });
    }

    // ---- ERROR: match /{document=**} followed shortly by `if true`
    if (MATCH_WILD_RE.test(line)) {
      const lookahead = lines.slice(i + 1, i + 6).join('\n');
      if (/\bif\s+true\b/.test(lookahead)) {
        findings.push({
          severity: 'ERROR',
          rule: 'match /{document=**} with `if true` within 5 lines',
          file: filePath,
          line: i + 1,
          excerpt: raw.trim().slice(0, 200),
          note: 'Wildcard recursive match grants access to ALL collections/documents',
        });
      }
    }

    // ---- WARN: `if request.auth != null` without an obvious uid check
    const allowMatch = ALLOW_LINE_RE.exec(line);
    if (allowMatch) {
      const cond = allowMatch[2];
      const isAuthOnly = /request\.auth\s*!=\s*null/.test(cond);
      const hasUidCheck = /request\.auth\.uid\s*==/.test(cond) ||
                         /resource\.data\.[a-zA-Z_]+\s*==\s*request\.auth\.uid/.test(cond) ||
                         /\{[a-zA-Z_]+\}\s*==\s*request\.auth\.uid/.test(cond) ||
                         /userId\s*==\s*request\.auth\.uid/.test(cond);
      if (isAuthOnly && !hasUidCheck) {
        findings.push({
          severity: 'WARN',
          rule: 'allow … if request.auth != null (no uid scoping)',
          file: filePath,
          line: i + 1,
          excerpt: raw.trim().slice(0, 200),
          note: 'Any signed-in user can read/write — consider scoping by request.auth.uid',
        });
      }
    }
  }

  return findings;
}

// --------------------------------------------------------------------------
// firebase.json embedded rules block
// --------------------------------------------------------------------------

function lintFirebaseJson(filePath, content) {
  const findings = [];
  // Cheap heuristic: if firebase.json contains an inline rules object
  // (not just a path pointer to a .rules file), flag for review.
  try {
    const obj = JSON.parse(content);
    const checkPath = (node, breadcrumb) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach((v, i) => checkPath(v, `${breadcrumb}[${i}]`));
        return;
      }
      for (const [k, v] of Object.entries(node)) {
        if (k === 'rules' && typeof v === 'object' && v !== null) {
          // Inline rules object in firebase.json (RTDB-style).
          const serialized = JSON.stringify(v);
          if (/"\.read"\s*:\s*"?true"?/.test(serialized) ||
              /"\.write"\s*:\s*"?true"?/.test(serialized)) {
            findings.push({
              severity: 'ERROR',
              rule: 'firebase.json inline rules: .read/.write = true',
              file: filePath,
              line: 1,
              excerpt: serialized.slice(0, 200),
              note: 'Realtime Database open to public',
            });
          } else if (/"auth\s*!==?\s*null"/.test(serialized) &&
                     !/auth\.uid/.test(serialized)) {
            findings.push({
              severity: 'WARN',
              rule: 'firebase.json inline rules: auth != null without uid scoping',
              file: filePath,
              line: 1,
              excerpt: serialized.slice(0, 200),
            });
          }
        }
        checkPath(v, `${breadcrumb}.${k}`);
      }
    };
    checkPath(obj, '$');
  } catch (e) {
    // Not valid JSON — skip.
  }
  return findings;
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

function main() {
  const allFindings = [];
  const stats = { reposScanned: 0, filesScanned: 0, files: [], missing: [] };

  for (const repo of REPOS) {
    if (!fs.existsSync(repo)) {
      stats.missing.push(repo);
      continue;
    }
    stats.reposScanned++;
    for (const file of walk(repo)) {
      let content;
      try { content = fs.readFileSync(file, 'utf8'); }
      catch (e) { continue; }
      stats.filesScanned++;
      stats.files.push(file);

      const name = path.basename(file).toLowerCase();
      let findings = [];
      if (name === 'firebase.json') {
        findings = lintFirebaseJson(file, content);
      } else if (name === 'database.rules.json') {
        // Treat similar to firebase.json inline.
        findings = lintFirebaseJson(file, `{"rules":${content}}`);
      } else {
        // .rules file (Firestore / Storage).
        findings = lintRulesFile(file, content);
      }
      allFindings.push(...findings);
    }
  }

  const errors = allFindings.filter(f => f.severity === 'ERROR');
  const warns  = allFindings.filter(f => f.severity === 'WARN');

  // ---- Render report ----
  const lines = [];
  lines.push('# DB Rules Linter Report');
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Repos scanned: ${stats.reposScanned}/${REPOS.length}`);
  lines.push(`- Rule files scanned: ${stats.filesScanned}`);
  lines.push(`- Findings: ${allFindings.length} (ERROR=${errors.length}, WARN=${warns.length})`);
  if (stats.missing.length) {
    lines.push('');
    lines.push('### Missing repo paths');
    for (const p of stats.missing) lines.push(`- ${p}`);
  }
  lines.push('');

  if (stats.files.length) {
    lines.push('## Files inspected');
    lines.push('');
    for (const f of stats.files) lines.push(`- \`${f}\``);
    lines.push('');
  } else {
    lines.push('_No rule files found across the listed repos._');
    lines.push('');
  }

  for (const [label, items] of [['ERROR', errors], ['WARN', warns]]) {
    if (!items.length) continue;
    lines.push(`## ${label} — ${items.length} finding(s)`);
    lines.push('');
    for (const f of items) {
      lines.push(`### \`${f.file}:${f.line}\``);
      lines.push(`- Rule: ${f.rule}`);
      if (f.note) lines.push(`- Note: ${f.note}`);
      lines.push('  ```');
      lines.push(`  ${f.excerpt}`);
      lines.push('  ```');
      lines.push('');
    }
  }

  if (!allFindings.length) {
    lines.push('## Result');
    lines.push('');
    lines.push('No risky patterns detected.');
    lines.push('');
  }

  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

  console.log(`db-rules-linter: ${stats.filesScanned} files, ` +
    `${errors.length} ERROR / ${warns.length} WARN`);
  console.log(`Report: ${REPORT_PATH}`);

  process.exit(errors.length > 0 ? 1 : 0);
}

if (require.main === module) main();
