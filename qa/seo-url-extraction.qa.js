#!/usr/bin/env node
// regression test — added 2026-05-25
// Bug: Googlebot parsed pricing text like "/mo", "/mes", "/mês" as URL paths,
//      polluting GSC with fake 404s.
// Fix: Pricing period text must NOT start with "/" inside inline tags.
// Usage: node qa/seo-url-extraction.qa.js

'use strict';
const https = require('https');
const http  = require('http');

const APPS = [
  { name: 'Portal',       url: 'https://wizelife.ai/' },
  { name: 'WizeMoney',    url: 'https://money.wizelife.ai/' },
  { name: 'WizeTax',      url: 'https://tax.wizelife.ai/' },
  { name: 'WizeDeal',     url: 'https://deal.wizelife.ai/' },
  { name: 'WizeHealth',   url: 'https://health.wizelife.ai/' },
  { name: 'WizeTravel',   url: 'https://travel.wizelife.ai/' },
];

const URL_LIKE_PATTERNS = [
  /<sub>\s*\/[a-zA-Zא-תa-ÿ]+\s*<\/sub>/gi,
  /<span[^>]*>\s*\/[a-zA-Zא-תa-ÿ]+\s*<\/span>/gi,
  />\$[\d.]+\/(mo|mes|m[e\xea]s|[a-z]{2,8})</gi,
];

function fetch(url, maxRedirects) {
  if (maxRedirects === undefined) maxRedirects = 5;
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'WizeLifeQA/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) { const u = new URL(url); loc = u.origin + loc; }
        return fetch(loc, maxRedirects - 1).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function pass(name, detail) { console.log('PASS  ' + name + (detail ? ' — ' + detail : '')); return true; }
function fail(name, detail) { console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); return false; }

async function checkApp(app) {
  try {
    const { status, body } = await fetch(app.url);
    if (status >= 400) return fail(app.name, 'HTTP ' + status);
    const found = [];
    for (const re of URL_LIKE_PATTERNS) {
      const matches = body.match(re) || [];
      for (const m of matches) found.push(m.slice(0, 60));
    }
    if (found.length) {
      return fail(app.name, 'URL-extractable pricing text: ' + found.slice(0, 3).join(' | '));
    }
    return pass(app.name, 'No URL-like pricing patterns found');
  } catch (e) {
    return fail(app.name, String(e).slice(0, 120));
  }
}

(async () => {
  console.log('=== seo-url-extraction: no slash-prefixed pricing text for Googlebot ===\n');
  const results = await Promise.all(APPS.map(checkApp));
  const failed = results.filter(r => !r).length;
  console.log('\n' + (APPS.length - failed) + '/' + APPS.length + ' passed');
  process.exit(failed > 0 ? 1 : 0);
})();