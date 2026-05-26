#!/usr/bin/env node
// regression test — added 2026-05-25
// Bug: wize-pricing-pill.js was missing from some sub-apps and/or accidentally
//      included on the Portal, breaking the show/hide rules.
// Rules:
//   - 5 sub-apps: MUST include wize-pricing-pill.js
//   - Portal (wizelife.ai): must NOT include wize-pricing-pill.js
// Usage: node qa/pricing-pill-coverage.qa.js

'use strict';
const https = require('https');

const SUB_APPS = [
  { name: 'WizeMoney',  url: 'https://money.wizelife.ai/' },
  { name: 'WizeTax',    url: 'https://tax.wizelife.ai/' },
  { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/' },
  { name: 'WizeHealth', url: 'https://health.wizelife.ai/' },
  { name: 'WizeTravel', url: 'https://travel.wizelife.ai/' },
];

const PORTAL = { name: 'Portal', url: 'https://wizelife.ai/' };

const PILL_RE = /wize-pricing-pill\.js/i;

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

async function checkSubApp(app) {
  try {
    const { status, body } = await fetch(app.url);
    if (status >= 400) return fail(app.name, 'HTTP ' + status);
    if (PILL_RE.test(body)) return pass(app.name, 'wize-pricing-pill.js present');
    return fail(app.name, 'wize-pricing-pill.js NOT found in HTML');
  } catch (e) {
    return fail(app.name, String(e).slice(0, 120));
  }
}

async function checkPortal() {
  try {
    const { status, body } = await fetch(PORTAL.url);
    if (status >= 400) return fail(PORTAL.name, 'HTTP ' + status);
    if (PILL_RE.test(body)) {
      return fail(PORTAL.name, 'wize-pricing-pill.js found on Portal — must NOT be loaded here');
    }
    return pass(PORTAL.name, 'wize-pricing-pill.js correctly absent from Portal');
  } catch (e) {
    return fail(PORTAL.name, String(e).slice(0, 120));
  }
}

(async () => {
  console.log('=== pricing-pill-coverage: pill in sub-apps, absent from Portal ===\n');
  const subResults   = await Promise.all(SUB_APPS.map(checkSubApp));
  const portalResult = await checkPortal();
  const results = subResults.concat([portalResult]);
  const failed = results.filter(r => !r).length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
  process.exit(failed > 0 ? 1 : 0);
})();