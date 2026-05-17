#!/usr/bin/env node
/**
 * Auto-fill missing i18n entries using DeepL (or OpenAI fallback).
 *
 * Scans every HTML file in the WizeLife portal + sub-app trees for
 * per-page `*_TR = { he: {...}, en: {...}, pt: {...}, es: {...} }` blocks
 * and ensures every key present in one language exists in all 4.
 *
 * For missing keys, it translates from the "best source" language (prefers
 * en, then he, then any other present) using DeepL Free API.
 *
 * Why DeepL: significantly better than Google Translate for financial /
 * medical / formal text. Free tier = 500K chars/month — enough for this
 * project.
 *
 * Setup:
 *   1. Get a free DeepL API key: https://www.deepl.com/pro-api?cta=header-pro-api
 *   2. export DEEPL_API_KEY="your-key-here"
 *   3. node tools/fill-i18n.js               (dry-run — shows what would change)
 *   4. node tools/fill-i18n.js --write       (apply changes in-place)
 *   5. node tools/fill-i18n.js --file=about.html --write   (single file)
 *
 * Edits are made by string replacement on the existing dictionary blocks —
 * preserves formatting, keeps adjacent code untouched.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');               // TOTALIST/wizelife/
const SCAN_DIRS = [
  path.join(ROOT),                                          // wizelife portal HTML
  path.join(ROOT, '..', '..', 'finance dashboard'),         // FinSight
  path.join(ROOT, '..', '..', 'finance dashboard', 'pages'),
  path.join(ROOT, '..', '..', 'RAMBAM', 'public'),          // Vitara
  path.join(ROOT, '..', '..', 'tax master', 'frontend', 'public'),
  path.join(ROOT, '..', '..', 'wizetravel-app', 'public'),
];
const LANGS = ['he', 'en', 'pt', 'es'];
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const DEEPL_KEY = process.env.DEEPL_API_KEY || '';
const WRITE = process.argv.includes('--write');
const FILE_FILTER = (process.argv.find(a => a.startsWith('--file=')) || '').replace('--file=', '');
const PROVIDER = (process.argv.find(a => a.startsWith('--provider=')) || '').replace('--provider=', '')
  || (GEMINI_KEY ? 'gemini' : (DEEPL_KEY ? 'deepl' : ''));

if (!PROVIDER) {
  console.error('❌ No translation provider available.');
  console.error('   Set ONE of:');
  console.error('     export GEMINI_API_KEY="..."     # recommended — you already pay for it');
  console.error('     export DEEPL_API_KEY="..."      # 500K chars/month free (resets monthly)');
  console.error('   Then: node tools/fill-i18n.js');
  process.exit(1);
}

console.log(`Provider: ${PROVIDER}`);

/* ──────────────────────────── Gemini ──────────────────────────────────── */

const LANG_NAMES = {
  he: 'Hebrew (Israeli)',
  en: 'English',
  pt: 'Brazilian Portuguese',
  es: 'Spanish (Latin American)',
};

function geminiTranslate(text, targetLang, sourceLang) {
  return new Promise((resolve, reject) => {
    const model = 'gemini-2.0-flash-exp'; // fast + cheap, good for short strings
    const prompt = `Translate this ${LANG_NAMES[sourceLang] || 'source'} string into ${LANG_NAMES[targetLang]}. Preserve any HTML tags (<em>, <strong>, <br>, etc.) and emoji exactly. Output ONLY the translation, no quotes, no commentary, no language label.

Source: ${text}`;

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    });
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const txt = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (txt) resolve(txt.trim().replace(/^["'`]|["'`]$/g, ''));
          else reject(new Error('Gemini: no translation — ' + body.slice(0, 200)));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/* ──────────────────────────── DeepL ───────────────────────────────────── */

function deeplTranslate(text, targetLang, sourceLang) {
  return new Promise((resolve, reject) => {
    // DeepL lang codes: HE, EN, PT-BR, ES (PT for Portugal — we want BR)
    const target = targetLang === 'pt' ? 'PT-BR' : targetLang.toUpperCase();
    const source = sourceLang ? (sourceLang === 'pt' ? 'PT' : sourceLang.toUpperCase()) : undefined;
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('target_lang', target);
    if (source) params.append('source_lang', source);
    params.append('preserve_formatting', '1');

    const data = params.toString();
    const req = https.request({
      hostname: 'api-free.deepl.com',
      path: '/v2/translate',
      method: 'POST',
      headers: {
        'Authorization': 'DeepL-Auth-Key ' + DEEPL_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.translations && json.translations[0]) {
            resolve(json.translations[0].text);
          } else {
            reject(new Error('DeepL: no translation — ' + body));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/* ──────────────────────────── Dispatcher ──────────────────────────────── */

async function translate(text, targetLang, sourceLang) {
  if (PROVIDER === 'gemini') return geminiTranslate(text, targetLang, sourceLang);
  if (PROVIDER === 'deepl')  return deeplTranslate(text, targetLang, sourceLang);
  throw new Error('Unknown provider: ' + PROVIDER);
}

/* ──────────────────────────── Parser ──────────────────────────────────── */

// Find `<NAME>_TR = {` blocks and extract the per-lang dictionaries.
// We scan the matched-brace block to capture { he: {...}, en: {...}, ... }.
function extractDicts(html) {
  // crude regex — finds e.g. `WIZE_TR = {` or `ABOUT_TR = {` or `const T = {`
  const re = /(?:const\s+)?(\w*_?TR|T)\s*=\s*\{/g;
  const found = [];
  let m;
  while ((m = re.exec(html))) {
    const startIdx = m.index + m[0].length - 1; // position of the {
    const block = matchBraces(html, startIdx);
    if (!block) continue;
    const inner = html.slice(startIdx + 1, block.end);
    // Sanity check: must contain at least one of our lang keys
    if (!/\b(he|en|pt|es)\s*:\s*\{/.test(inner)) continue;
    found.push({
      name: m[1],
      blockStart: startIdx,
      blockEnd: block.end,
      inner,
    });
  }
  return found;
}

function matchBraces(s, openIdx) {
  if (s[openIdx] !== '{') return null;
  let depth = 0, inStr = false, strChar = null;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i], prev = s[i - 1];
    if (inStr) {
      if (c === strChar && prev !== '\\') inStr = false;
    } else {
      if (c === '"' || c === "'" || c === '`') { inStr = true; strChar = c; }
      else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return { end: i };
      }
    }
  }
  return null;
}

// Find inner per-lang object for given lang. Returns {start,end,inner} relative
// to the outer dict block.
function extractLangBlock(outerInner, lang) {
  const re = new RegExp('\\b' + lang + '\\s*:\\s*\\{', 'g');
  const m = re.exec(outerInner);
  if (!m) return null;
  const startIdx = m.index + m[0].length - 1;
  const block = matchBraces(outerInner, startIdx);
  if (!block) return null;
  return {
    start: startIdx,
    end: block.end,
    inner: outerInner.slice(startIdx + 1, block.end),
  };
}

// Extract key → value pairs. Handles `key: 'val'`, `key: "val"`, `'key': 'val'`.
// Multiline values OK (no template-literal support).
function parseEntries(langInner) {
  const entries = {};
  const re = /(['"]?)([A-Za-z_][\w]*)\1\s*:\s*(['"`])((?:\\.|(?!\3).)*?)\3\s*,?/g;
  let m;
  while ((m = re.exec(langInner))) {
    const [, , key, , value] = m;
    entries[key] = value;
  }
  return entries;
}

/* ──────────────────────────── Walk + diff ─────────────────────────────── */

function listHtmlFiles() {
  const out = [];
  for (const dir of SCAN_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.html')) continue;
      if (f.startsWith('ARCHITECTURE')) continue;
      if (FILE_FILTER && !f.endsWith(FILE_FILTER)) continue;
      out.push(path.join(dir, f));
    }
  }
  return out;
}

async function processFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const dicts = extractDicts(html);
  if (!dicts.length) return { file: filePath, changes: 0 };

  let modifiedHtml = html;
  let totalAdded = 0;
  const summary = [];

  for (const dict of dicts) {
    // Re-extract from the LIVE modifiedHtml since offsets may have shifted
    const liveDicts = extractDicts(modifiedHtml);
    const live = liveDicts.find(d => d.name === dict.name);
    if (!live) continue;

    const langEntries = {};
    for (const l of LANGS) {
      const block = extractLangBlock(live.inner, l);
      langEntries[l] = block ? parseEntries(block.inner) : {};
    }

    // Compute the master key set — every key present in any lang
    const allKeys = new Set();
    for (const l of LANGS) Object.keys(langEntries[l]).forEach(k => allKeys.add(k));

    // For each lang, find missing keys and fill from best source
    for (const targetLang of LANGS) {
      const missing = [...allKeys].filter(k => !(k in langEntries[targetLang]));
      if (!missing.length) continue;

      const additions = [];
      for (const key of missing) {
        // Source preference: en > he > any other present
        const srcLang = ['en', 'he', 'pt', 'es'].find(l => l !== targetLang && langEntries[l][key]);
        if (!srcLang) continue;
        const sourceText = langEntries[srcLang][key];
        // Skip HTML-only entries (rare) and trivially-equal entries
        const hasHtml = /<[a-z]+/i.test(sourceText);
        let translated;
        try {
          translated = await translate(sourceText, targetLang, srcLang);
        } catch (e) {
          console.warn(`  ⚠ ${PROVIDER} failed on ${dict.name}.${targetLang}.${key}: ${e.message}`);
          continue;
        }
        additions.push({ key, value: translated, hasHtml });
        totalAdded++;
      }

      if (!additions.length) continue;
      summary.push(`  + ${dict.name}.${targetLang}: ${additions.length} keys (${additions.slice(0, 3).map(a => a.key).join(', ')}${additions.length > 3 ? ', …' : ''})`);

      // Insert additions into the targetLang block
      const liveDicts2 = extractDicts(modifiedHtml);
      const live2 = liveDicts2.find(d => d.name === dict.name);
      const langBlock = extractLangBlock(live2.inner, targetLang);
      if (!langBlock) continue;

      const absInsertPos = live2.blockStart + 1 + langBlock.end; // just before the closing `}` of the target lang block
      // Render additions: `  key: 'value',\n      `
      const indent = '\n      ';
      const insertText = (langBlock.inner.trim().endsWith(',') ? '' : ',')
        + additions.map(a => `${indent}${a.key}: ${jsString(a.value)}`).join(',')
        + indent;

      modifiedHtml = modifiedHtml.slice(0, absInsertPos) + insertText + modifiedHtml.slice(absInsertPos);
    }
  }

  if (WRITE && totalAdded > 0) fs.writeFileSync(filePath, modifiedHtml, 'utf8');
  return { file: filePath, changes: totalAdded, summary };
}

function jsString(s) {
  // Pick single quote unless the value contains a single quote.
  if (!s.includes("'")) return "'" + s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n') + "'";
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
}

/* ──────────────────────────── Main ────────────────────────────────────── */

(async () => {
  const files = listHtmlFiles();
  console.log(`Scanning ${files.length} HTML file(s)${WRITE ? ' (WRITE mode)' : ' (DRY RUN — pass --write to apply)'}…\n`);

  let totalAdded = 0;
  for (const file of files) {
    try {
      const res = await processFile(file);
      if (res.changes > 0) {
        const rel = path.relative(process.cwd(), file);
        console.log(`${rel} — +${res.changes} entries`);
        if (res.summary) res.summary.forEach(s => console.log(s));
        totalAdded += res.changes;
      }
    } catch (e) {
      console.error(`  ✗ ${file}: ${e.message}`);
    }
  }

  console.log(`\n${WRITE ? '✓ Applied' : '— Would apply'} ${totalAdded} translation entries across ${files.length} file(s).`);
  if (!WRITE && totalAdded > 0) console.log('Re-run with --write to apply.');
})();
