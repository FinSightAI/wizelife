#!/usr/bin/env node
// regression test — added 2026-05-25
// Bug: Google rejects multiple FAQPage schemas on the same URL.
// Fix: Each URL must have ≤ 1 JSON-LD block with "@type":"FAQPage".
// Usage: node qa/seo-faqpage-duplicate.qa.js

'use strict';
const https = require('https');

const APPS = [
  { name: 'Portal',       url: 'https://wizelife.ai/' },
  { name: 'WizeMoney',    url: 'https://money.wizelife.ai/' },
  { name: 'WizeTax',      url: 'https://tax.wizelife.ai/' },
  { name: 'WizeDeal',     url: 'https://deal.wizelife.ai/' },
  { name: 'WizeHealth',   url: 'https://health.wizelife.ai/' },
  { name: 'WizeTravel',   url: 'https://travel.wizelife.ai/' },
];

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

function pass(name, detail) { console.log('PASS  ' + name + (detail ? ' — ' + detail : '')); return true; }
function fail(name, detail) { console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); return false; }

async function checkApp(app) {
  try {
    const { status, body } = await fetch(app.url);
    if (status >= 400) return fail(app.name, 'HTTP ' + status);
    const matches = (body.match(/"@type"\s*:\s*"FAQPage"/g) || []);
    const count = matches.length;
    if (count > 1) {
      return fail(app.name, count + ' FAQPage schemas found — Google will reject rich results');
    }
    return pass(app.name, count + ' FAQPage schema(s) — OK');
  } catch (e) {
    return fail(app.name, String(e).slice(0, 120));
  }
}

(async () => {
  console.log('=== seo-faqpage-duplicate: <=1 FAQPage schema per URL ===\n');
  const results = await Promise.all(APPS.map(checkApp));
  const failed = results.filter(r => !r).length;
  console.log('\n' + (APPS.length - failed) + '/' + APPS.length + ' passed');
  process.exit(failed > 0 ? 1 : 0);
})();