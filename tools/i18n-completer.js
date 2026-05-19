#!/usr/bin/env node
/**
 * i18n-completer.js — static scan for incomplete 4-language coverage.
 *
 * For every HTML/JS/TSX file across the 6 WizeLife repos:
 *   - find `t4(lang, { he: '...', en: '...', pt: '...', es: '...' })` literals
 *     and report ones where HE exists but any of EN/PT/ES is missing.
 *   - find `data-i18n="key"` attributes inside HTML, collect per-page i18n
 *     dictionary objects (var WIZE_TR = { he:{...}, en:{...}, ... } or
 *     window.WL_TR = {...}) and report keys with HE but missing EN/PT/ES.
 *
 * Does NOT call any LLM. Pure static analysis.
 * Writes /tmp/i18n-completer-report.md.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPORT_PATH = '/tmp/i18n-completer-report.md';

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
  'node_modules', '.next', '.git', 'dist', 'build', 'out', '.venv',
  'venv', '__pycache__', '.cache', 'coverage', '.turbo', '.vercel',
  'playwright-report', 'test-results', '.firebase',
]);

const EXTS = new Set(['.html', '.htm', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

const LANGS = ['he', 'en', 'pt', 'es'];
const SECONDARIES = ['en', 'pt', 'es']; // we report when HE is present but any of these is missing

/* ─────────────────────────── file walk ────────────────────────────────── */

function* walk(root) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.well-known') continue;
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walk(full);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (!EXTS.has(ext)) continue;
      // Skip minified / vendor blobs
      if (/\.min\.(js|css)$/.test(e.name)) continue;
      yield full;
    }
  }
}

function lineOf(text, idx) {
  let line = 1;
  for (let i = 0; i < idx && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

/* ────────────────────────── t4(...) scanner ───────────────────────────── */
/*
 * We look for `t4(<anything>, { ...object... })` and walk braces to find
 * the matching `}`. Then we parse the object body with a regex for each
 * lang property: `he: '...'` or `he: "..."` or `he: \`...\``.
 *
 * This intentionally tolerates t4 being part of a chained expression
 * — we only need the object literal that follows the first comma.
 */
function findT4Gaps(text, file) {
  const out = [];
  const re = /\bt4\s*\(/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const openIdx = m.index + m[0].length;
    // Skip past the first arg (until top-level comma) — count parens/braces.
    let i = openIdx;
    let depthParen = 1, depthBrace = 0, depthBracket = 0;
    let inStr = null;
    let commaIdx = -1;
    while (i < text.length) {
      const ch = text[i];
      if (inStr) {
        if (ch === '\\') { i += 2; continue; }
        if (ch === inStr) inStr = null;
      } else {
        if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
        else if (ch === '(') depthParen++;
        else if (ch === ')') { depthParen--; if (depthParen === 0) break; }
        else if (ch === '{') depthBrace++;
        else if (ch === '}') depthBrace--;
        else if (ch === '[') depthBracket++;
        else if (ch === ']') depthBracket--;
        else if (ch === ',' && depthParen === 1 && depthBrace === 0 && depthBracket === 0) {
          commaIdx = i;
          break;
        }
      }
      i++;
    }
    if (commaIdx === -1) continue;
    // Find the `{` that opens the dict after the comma
    let j = commaIdx + 1;
    while (j < text.length && /\s/.test(text[j])) j++;
    if (text[j] !== '{') continue;
    const dictStart = j;
    // Walk to matching `}`
    let depth = 0;
    inStr = null;
    let dictEnd = -1;
    while (j < text.length) {
      const ch = text[j];
      if (inStr) {
        if (ch === '\\') { j += 2; continue; }
        if (ch === inStr) inStr = null;
      } else {
        if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
        else if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { dictEnd = j; break; } }
      }
      j++;
    }
    if (dictEnd === -1) continue;
    const dictBody = text.slice(dictStart + 1, dictEnd);
    const langs = {};
    for (const L of LANGS) {
      // match  he : 'value' | "value" | `value`
      const rx = new RegExp(`(?:^|[,{\\s])${L}\\s*:\\s*(['"\`])((?:\\\\.|(?!\\1).)*)\\1`, 's');
      const mm = dictBody.match(rx);
      if (mm) langs[L] = mm[2];
    }
    if (!langs.he) continue; // we only report rows that have HE
    const missing = SECONDARIES.filter((L) => !langs[L] || langs[L].trim() === '');
    if (missing.length === 0) continue;
    out.push({
      file,
      line: lineOf(text, m.index),
      he: langs.he,
      missing,
      kind: 't4',
    });
  }
  return out;
}

/* ────────────────────── HTML data-i18n + TR scanner ───────────────────── */
/*
 * In WizeLife portal HTML we have:
 *    const WIZE_TR = { he: { 'key': '...' }, en: {...}, pt: {...}, es: {...} };
 * or window.WL_TR = {...} or similar.  We try to find any object literal
 * with at least an `he:` sub-object, extract the keys, and report gaps.
 *
 * We also collect data-i18n="key" attribute usages so the report can show
 * which keys are actually referenced from the markup.
 */
function findDataI18nKeys(text) {
  const keys = new Set();
  const re = /\bdata-i18n\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(text))) keys.add(m[1]);
  return keys;
}

// Extract a per-lang sub-object from inside a TR-style block.
function extractLangBlock(text, lang) {
  const re = new RegExp(`\\b${lang}\\s*:\\s*\\{`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length - 1; // points at `{`
    let i = start;
    let depth = 0;
    let inStr = null;
    while (i < text.length) {
      const ch = text[i];
      if (inStr) {
        if (ch === '\\') { i += 2; continue; }
        if (ch === inStr) inStr = null;
      } else {
        if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
        else if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { out.push({ start, end: i }); break; } }
      }
      i++;
    }
  }
  return out;
}

function parseSimpleKVs(body) {
  // Parses entries of the form  "key": "value"   or   key: 'value'
  const map = {};
  const re = /(?:["']([^"']+)["']|([A-Za-z_$][\w$.\-]*))\s*:\s*(['"`])((?:\\.|(?!\3).)*)\3/gs;
  let m;
  while ((m = re.exec(body))) {
    const key = m[1] || m[2];
    map[key] = m[4];
  }
  return map;
}

function findHtmlDictGaps(text, file) {
  const out = [];
  // Find blocks that look like dictionaries — must contain `he : {`
  const heBlocks = extractLangBlock(text, 'he');
  if (heBlocks.length === 0) return out;
  // For each HE block we look in the SAME enclosing object: a simple heuristic
  // — walk back to the nearest unmatched `{` then forward to its `}`.
  for (const hb of heBlocks) {
    // Walk back to enclosing `{` not counting matched braces between hb.start and pos.
    let pos = hb.start - 1;
    let depth = 0;
    let enclStart = -1;
    while (pos >= 0) {
      const ch = text[pos];
      if (ch === '}') depth++;
      else if (ch === '{') {
        if (depth === 0) { enclStart = pos; break; }
        depth--;
      }
      pos--;
    }
    if (enclStart === -1) continue;
    // Walk forward to matching `}`
    let q = enclStart;
    depth = 0;
    let inStr = null;
    let enclEnd = -1;
    while (q < text.length) {
      const ch = text[q];
      if (inStr) {
        if (ch === '\\') { q += 2; continue; }
        if (ch === inStr) inStr = null;
      } else {
        if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
        else if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { enclEnd = q; break; } }
      }
      q++;
    }
    if (enclEnd === -1) continue;
    const block = text.slice(enclStart, enclEnd + 1);
    // Now extract per-lang body inside `block`
    const langMaps = {};
    for (const L of LANGS) {
      const inner = extractLangBlock(block, L);
      if (inner.length === 0) { langMaps[L] = null; continue; }
      const sub = block.slice(inner[0].start + 1, inner[0].end);
      langMaps[L] = parseSimpleKVs(sub);
    }
    if (!langMaps.he || Object.keys(langMaps.he).length === 0) continue;
    const lineNo = lineOf(text, enclStart);
    for (const key of Object.keys(langMaps.he)) {
      const missing = SECONDARIES.filter((L) => !langMaps[L] || !langMaps[L][key] || langMaps[L][key].trim() === '');
      if (missing.length === 0) continue;
      out.push({
        file,
        line: lineNo,
        key,
        he: langMaps.he[key],
        missing,
        kind: 'dict',
      });
    }
  }
  return out;
}

/* ──────────────────────────── main ────────────────────────────────────── */

(function main() {
  const t4Gaps = [];
  const dictGaps = [];
  const fileStats = { scanned: 0, withT4: 0, withDict: 0, dataI18nRefs: 0 };

  for (const repo of REPOS) {
    if (!fs.existsSync(repo)) continue;
    for (const file of walk(repo)) {
      let text;
      try { text = fs.readFileSync(file, 'utf8'); }
      catch { continue; }
      fileStats.scanned++;

      // Cheap pre-check before expensive parsing
      if (text.indexOf('t4') !== -1 && /\bt4\s*\(/.test(text)) {
        const g = findT4Gaps(text, file);
        if (g.length) { fileStats.withT4++; t4Gaps.push(...g); }
      }
      if (/\bhe\s*:\s*\{/.test(text)) {
        const g = findHtmlDictGaps(text, file);
        if (g.length) { fileStats.withDict++; dictGaps.push(...g); }
      }
      const ki = findDataI18nKeys(text);
      fileStats.dataI18nRefs += ki.size;
    }
  }

  /* ─────────────────────── write report ──────────────────────────────── */

  const today = new Date().toISOString().slice(0, 10);
  let md = `# i18n Completer Report — ${today}\n\n`;
  md += `Languages tracked: ${LANGS.join(', ')}. We flag any entry that has HE but is missing at least one of: ${SECONDARIES.join(', ')}.\n\n`;
  md += `## Scan summary\n\n`;
  md += `- Files scanned: ${fileStats.scanned}\n`;
  md += `- Files with t4(...) gaps: ${fileStats.withT4}\n`;
  md += `- Files with TR-dict gaps: ${fileStats.withDict}\n`;
  md += `- data-i18n="..." references seen: ${fileStats.dataI18nRefs}\n`;
  md += `- t4 entries with gaps: **${t4Gaps.length}**\n`;
  md += `- dictionary keys with gaps: **${dictGaps.length}**\n\n`;

  /* group by file */
  function groupByFile(rows) {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.file)) map.set(r.file, []);
      map.get(r.file).push(r);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }

  md += `## t4(lang, {…}) gaps\n\n`;
  if (t4Gaps.length === 0) {
    md += `_None._\n\n`;
  } else {
    for (const [file, rows] of groupByFile(t4Gaps)) {
      md += `### \`${file}\` — ${rows.length} gap${rows.length === 1 ? '' : 's'}\n\n`;
      md += `| Line | Missing | HE text |\n|---|---|---|\n`;
      for (const r of rows.slice(0, 200)) {
        const he = (r.he || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 120);
        md += `| ${r.line} | ${r.missing.join(', ')} | ${he} |\n`;
      }
      if (rows.length > 200) md += `\n_…(${rows.length - 200} more rows truncated)…_\n`;
      md += `\n`;
    }
  }

  md += `## Dictionary-block gaps (TR / WL_TR / WIZE_TR)\n\n`;
  if (dictGaps.length === 0) {
    md += `_None._\n\n`;
  } else {
    for (const [file, rows] of groupByFile(dictGaps)) {
      md += `### \`${file}\` — ${rows.length} key${rows.length === 1 ? '' : 's'}\n\n`;
      md += `| Line | Key | Missing | HE text |\n|---|---|---|---|\n`;
      for (const r of rows.slice(0, 200)) {
        const he = (r.he || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 120);
        md += `| ${r.line} | \`${r.key}\` | ${r.missing.join(', ')} | ${he} |\n`;
      }
      if (rows.length > 200) md += `\n_…(${rows.length - 200} more rows truncated)…_\n`;
      md += `\n`;
    }
  }

  md += `---\n_Report generated ${new Date().toISOString()}_\n`;
  fs.writeFileSync(REPORT_PATH, md, 'utf8');

  console.log(`Files scanned: ${fileStats.scanned}`);
  console.log(`t4 gaps: ${t4Gaps.length} | dict-key gaps: ${dictGaps.length}`);
  console.log(`Report: ${REPORT_PATH}`);
  process.exit(0);
})();
