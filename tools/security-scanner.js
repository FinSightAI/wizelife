#!/usr/bin/env node
/**
 * security-scanner.js
 *
 * Static security scan across the 6 WizeLife repos.
 *
 * Checks:
 *   1. Hardcoded secrets (AWS, GitHub tokens, Gemini, OpenRouter,
 *      Anthropic, Stripe live keys) — with Firebase web key whitelist.
 *   2. eval() / Function() / new Function() in committed code.
 *   3. innerHTML with apparent user-input concatenation.
 *   4. document.write usage.
 *   5. HTTP (non-HTTPS) URLs hardcoded in JS/HTML/JSON.
 *   6. CSP `unsafe-eval` / `unsafe-inline` in meta tags or headers.
 *
 * Output: /tmp/security-scanner-report.md
 *
 * Run:  node tools/security-scanner.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

const REPOS = [
  "/Users/s/Desktop/Desktop - O’s MacBook Air/TOTALIST/wizelife",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/tax master",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/finance dashboard",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/RAMBAM",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/wizetravel-app",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/Check Deal",
  "/Users/s/Desktop/Desktop - O’s MacBook Air/mega traveller",
];

const SCAN_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.html', '.htm', '.json', '.md',
  '.py', '.css',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', '.venv', 'venv', '__pycache__',
  'build', 'dist', 'out', '.vercel', '.cache', '.turbo',
  'coverage', '.firebase', '.expo', 'ios', 'android',
]);

const MAX_FILE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB — skip larger
const REPORT_PATH = '/tmp/security-scanner-report.md';

// --------------------------------------------------------------------------
// Patterns
// --------------------------------------------------------------------------

const SECRET_PATTERNS = [
  { name: 'AWS Access Key',   re: /AKIA[A-Z0-9]{16}/g,                       severity: 'ERROR' },
  { name: 'GitHub Token (ghp)', re: /ghp_[A-Za-z0-9]{30,}/g,                 severity: 'ERROR' },
  { name: 'GitHub OAuth (gho)', re: /gho_[A-Za-z0-9]{30,}/g,                 severity: 'ERROR' },
  { name: 'OpenRouter Key',   re: /sk-or-[A-Za-z0-9_-]{20,}/g,               severity: 'ERROR' },
  { name: 'Anthropic Key',    re: /sk-ant-[A-Za-z0-9_-]{20,}/g,              severity: 'ERROR' },
  { name: 'Stripe Live Key',  re: /sk_live_[A-Za-z0-9]{20,}/g,               severity: 'ERROR' },
  // Gemini / Google API key — overlaps Firebase web key.
  { name: 'Google/Gemini Key (AIzaSy…)', re: /AIzaSy[A-Za-z0-9_-]{30,}/g,    severity: 'CHECK' },
];

const FIREBASE_CONTEXT_RE = /firebase[-_.]?config|firebaseapp\.com|firebaseio\.com|messagingSenderId|projectId\s*:\s*['"]/i;

const EVAL_RE       = /\b(?:eval|new\s+Function|Function\s*\()\s*\(/g;
const INNERHTML_RE  = /\.innerHTML\s*[+]?=\s*[^;]*(?:input|value|param|search|location|hash|query|user)/i;
const DOCWRITE_RE   = /\bdocument\.write\s*\(/g;
// HTTP URL — exclude common safe schemas/contexts.
const HTTP_URL_RE   = /\bhttp:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|schemas?\.|www\.w3\.org|ns\.adobe|purl\.org|xmlns\.|ogp\.me|gmpg\.org|json-schema\.org|relaton\.|example\.(?:com|org)|tempuri\.org)([A-Za-z0-9.\-_/:?#%=&+~,@!$'()*;]+)/g;
const CSP_RE        = /Content-Security-Policy[^"'>]*?(?:unsafe-eval|unsafe-inline)/i;

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
    if (ent.name.startsWith('.') && ent.name !== '.well-known') {
      // Allow dotfiles for .firebaserc etc. but skip noisy dot-dirs above.
    }
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walk(full);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (!SCAN_EXT.has(ext)) continue;
      yield full;
    }
  }
}

function readFileSafe(p) {
  try {
    const st = fs.statSync(p);
    if (st.size > MAX_FILE_BYTES) return null;
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    return null;
  }
}

// --------------------------------------------------------------------------
// Scanner
// --------------------------------------------------------------------------

function lineNumberOf(content, idx) {
  let line = 1;
  for (let i = 0; i < idx && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function snippet(content, idx, span = 120) {
  const start = Math.max(0, idx - 20);
  const end   = Math.min(content.length, idx + span);
  return content.slice(start, end).replace(/\s+/g, ' ').trim();
}

function scanFile(filePath, content, findings) {
  const ext = path.extname(filePath).toLowerCase();
  const lower = filePath.toLowerCase();

  // ---- Secrets ----
  for (const pat of SECRET_PATTERNS) {
    pat.re.lastIndex = 0;
    let m;
    while ((m = pat.re.exec(content)) !== null) {
      let severity = pat.severity;
      let note = '';
      if (pat.name.startsWith('Google/Gemini')) {
        // Firebase web key whitelist: nearby firebase context = INFO, not error.
        const around = content.slice(Math.max(0, m.index - 500), m.index + 500);
        if (FIREBASE_CONTEXT_RE.test(around)) {
          severity = 'INFO';
          note = 'Firebase web API key (intentionally public per CLAUDE.md)';
        } else {
          severity = 'ERROR';
          note = 'Unrecognized Google API key — verify not a Gemini server key';
        }
      }
      findings.push({
        category: 'Secret',
        rule: pat.name,
        severity,
        file: filePath,
        line: lineNumberOf(content, m.index),
        excerpt: snippet(content, m.index, 80),
        note,
      });
    }
  }

  // ---- eval / Function / new Function ----
  if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.htm'].includes(ext)) {
    EVAL_RE.lastIndex = 0;
    let m;
    while ((m = EVAL_RE.exec(content)) !== null) {
      findings.push({
        category: 'CodeExec',
        rule: 'eval()/Function() usage',
        severity: 'WARN',
        file: filePath,
        line: lineNumberOf(content, m.index),
        excerpt: snippet(content, m.index, 100),
      });
    }

    // ---- innerHTML w/ user input heuristic ----
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (INNERHTML_RE.test(lines[i])) {
        findings.push({
          category: 'XSS',
          rule: 'innerHTML with possible user input',
          severity: 'WARN',
          file: filePath,
          line: i + 1,
          excerpt: lines[i].trim().slice(0, 160),
        });
      }
    }

    // ---- document.write ----
    DOCWRITE_RE.lastIndex = 0;
    while ((m = DOCWRITE_RE.exec(content)) !== null) {
      findings.push({
        category: 'LegacyAPI',
        rule: 'document.write()',
        severity: 'WARN',
        file: filePath,
        line: lineNumberOf(content, m.index),
        excerpt: snippet(content, m.index, 80),
      });
    }
  }

  // ---- HTTP (non-HTTPS) URLs ----
  if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.htm', '.json'].includes(ext)) {
    HTTP_URL_RE.lastIndex = 0;
    let m;
    while ((m = HTTP_URL_RE.exec(content)) !== null) {
      findings.push({
        category: 'TransportSec',
        rule: 'Hardcoded HTTP URL',
        severity: 'WARN',
        file: filePath,
        line: lineNumberOf(content, m.index),
        excerpt: snippet(content, m.index, 100),
      });
    }
  }

  // ---- CSP unsafe-eval / unsafe-inline ----
  if (['.html', '.htm', '.json', '.js'].includes(ext) || lower.endsWith('vercel.json') || lower.endsWith('firebase.json')) {
    if (CSP_RE.test(content)) {
      // Find lines.
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/Content-Security-Policy/i.test(lines[i]) && /unsafe-(eval|inline)/i.test(lines[i])) {
          findings.push({
            category: 'CSP',
            rule: 'CSP allows unsafe-eval/unsafe-inline',
            severity: 'WARN',
            file: filePath,
            line: i + 1,
            excerpt: lines[i].trim().slice(0, 200),
          });
        }
      }
    }
  }
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

function main() {
  const findings = [];
  const stats = { reposScanned: 0, filesScanned: 0, bytesScanned: 0, missing: [] };
  const startedAt = Date.now();

  for (const repo of REPOS) {
    if (!fs.existsSync(repo)) {
      stats.missing.push(repo);
      continue;
    }
    stats.reposScanned++;
    for (const file of walk(repo)) {
      const content = readFileSafe(file);
      if (content == null) continue;
      stats.filesScanned++;
      stats.bytesScanned += content.length;
      try {
        scanFile(file, content, findings);
      } catch (e) {
        // Don't let a single file crash the run.
      }
    }
  }

  // ---- Render report ----
  const bySeverity = { ERROR: [], WARN: [], CHECK: [], INFO: [] };
  for (const f of findings) {
    (bySeverity[f.severity] || (bySeverity.WARN)).push(f);
  }

  const lines = [];
  lines.push(`# Security Scanner Report`);
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Duration: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  lines.push(`- Repos scanned: ${stats.reposScanned}/${REPOS.length}`);
  lines.push(`- Files scanned: ${stats.filesScanned}`);
  lines.push(`- Bytes scanned: ${(stats.bytesScanned / (1024 * 1024)).toFixed(1)} MB`);
  if (stats.missing.length) {
    lines.push('');
    lines.push('### Missing repo paths');
    for (const p of stats.missing) lines.push(`- ${p}`);
  }
  lines.push('');
  lines.push(`## Findings summary`);
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|---|---|');
  lines.push(`| ERROR | ${bySeverity.ERROR.length} |`);
  lines.push(`| WARN  | ${bySeverity.WARN.length} |`);
  lines.push(`| CHECK | ${bySeverity.CHECK.length} |`);
  lines.push(`| INFO  | ${bySeverity.INFO.length} |`);
  lines.push('');

  for (const sev of ['ERROR', 'WARN', 'CHECK', 'INFO']) {
    const items = bySeverity[sev];
    if (!items || !items.length) continue;
    lines.push(`## ${sev} — ${items.length} finding(s)`);
    lines.push('');

    // Group by category then rule.
    const grouped = {};
    for (const f of items) {
      const key = `${f.category} / ${f.rule}`;
      (grouped[key] = grouped[key] || []).push(f);
    }
    for (const key of Object.keys(grouped).sort()) {
      lines.push(`### ${key} (${grouped[key].length})`);
      lines.push('');
      for (const f of grouped[key].slice(0, 100)) {
        const noteStr = f.note ? `  _${f.note}_` : '';
        lines.push(`- \`${f.file}:${f.line}\`${noteStr}`);
        if (f.excerpt) {
          lines.push('  ```');
          lines.push(`  ${f.excerpt}`);
          lines.push('  ```');
        }
      }
      if (grouped[key].length > 100) {
        lines.push(`- _…and ${grouped[key].length - 100} more (truncated)_`);
      }
      lines.push('');
    }
  }

  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

  // Console summary.
  console.log(`security-scanner: ${stats.filesScanned} files, ${findings.length} findings ` +
    `(ERROR=${bySeverity.ERROR.length} WARN=${bySeverity.WARN.length} ` +
    `CHECK=${bySeverity.CHECK.length} INFO=${bySeverity.INFO.length})`);
  console.log(`Report: ${REPORT_PATH}`);

  // Non-fatal: this script never exits 1 (use db-rules-linter for blocking).
  process.exit(0);
}

if (require.main === module) main();
