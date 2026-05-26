#!/usr/bin/env node
// regression test — added 2026-05-25
// Bug: JSON-LD FAQ blocks for HE/PT/ES contained English strings (copy-paste
//      from EN block during initial FAQ build).
// Fix: Language-specific JSON-LD blocks must only contain text in that language.
//      - EN/PT/ES: no Hebrew characters (U+05D0-U+05EA)
//      - HE: must contain Hebrew characters; if all-Latin then it is a copy-paste leak
// Usage: node qa/i18n-jsonld-leak.qa.js

'use strict';
const https = require('https');

const APPS = [
  { name: 'Portal',     url: 'https://wizelife.ai/' },
  { name: 'WizeMoney',  url: 'https://money.wizelife.ai/' },
  { name: 'WizeTax',    url: 'https://tax.wizelife.ai/' },
  { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/' },
  { name: 'WizeHealth', url: 'https://health.wizelife.ai/' },
  { name: 'WizeTravel', url: 'https://travel.wizelife.ai/' },
];

const HEBREW_RE = /[א-ת]/;
const LATIN_RE  = /[A-Za-z]{4,}/;

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'WizeLifeQA/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try { blocks.push(JSON.parse(m[1])); } catch (_) {}
  }
  return blocks;
}

function collectTextValues(obj) {
  const TEXT_KEYS = ['name', 'text', 'question', 'answer', 'acceptedAnswer'];
  const texts = [];
  function walk(o) {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      if (typeof o[k] === 'string' && TEXT_KEYS.some(tk => k.toLowerCase().includes(tk))) {
        texts.push(o[k]);
      } else {
        walk(o[k]);
      }
    }
  }
  walk(obj);
  return texts;
}

function pass(name, detail) { console.log('PASS  ' + name + (detail ? ' — ' + detail : '')); return true; }
function fail(name, detail) { console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); return false; }

async function checkApp(app) {
  try {
    const { status, body } = await fetch(app.url);
    if (status >= 400) return fail(app.name, 'HTTP ' + status);
    const allBlocks = extractJsonLd(body);
    const faqBlocks = allBlocks.filter(b => {
      const t = b['@type'];
      return t === 'FAQPage' || (Array.isArray(t) && t.includes('FAQPage'));
    });
    if (!faqBlocks.length) {
      return pass(app.name, 'No FAQPage JSON-LD blocks — nothing to check');
    }
    const leaks = [];
    for (const block of faqBlocks) {
      const lang = block.inLanguage || block['@language'] || 'unknown';
      const texts = collectTextValues(block);
      for (const text of texts) {
        if (lang === 'he' || lang === 'iw') {
          if (LATIN_RE.test(text) && !HEBREW_RE.test(text)) {
            leaks.push('HE block has Latin-only text: "' + text.slice(0, 60) + '"');
          }
        } else {
          if (HEBREW_RE.test(text)) {
            leaks.push(lang.toUpperCase() + ' block has Hebrew text: "' + text.slice(0, 60) + '"');
          }
        }
      }
    }
    if (leaks.length) {
      return fail(app.name, 'Language leak(s): ' + leaks.slice(0, 2).join(' | '));
    }
    return pass(app.name, faqBlocks.length + ' FAQPage block(s) — no language leaks');
  } catch (e) {
    return fail(app.name, String(e).slice(0, 120));
  }
}

(async () => {
  console.log('=== i18n-jsonld-leak: no cross-language text in JSON-LD FAQ blocks ===\n');
  const results = await Promise.all(APPS.map(checkApp));
  const failed = results.filter(r => !r).length;
  console.log('\n' + (APPS.length - failed) + '/' + APPS.length + ' passed');
  process.exit(failed > 0 ? 1 : 0);
})();