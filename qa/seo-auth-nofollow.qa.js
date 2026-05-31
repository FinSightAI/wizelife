#!/usr/bin/env node
// regression test — added 2026-05-25
// Bug: Internal auth links (href="auth.html") lacked rel="nofollow", causing
//      "Blocked by robots.txt" noise in Google Search Console.
// Fix: All <a href="auth.html"...> must carry rel="nofollow".
// Usage: node qa/seo-auth-nofollow.qa.js

'use strict';
const https = require('https');

const PAGES = [
  { name: 'Portal/index',   url: 'https://wizelife.ai/' },
  { name: 'Portal/about',   url: 'https://wizelife.ai/about.html' },
  { name: 'Portal/privacy', url: 'https://wizelife.ai/privacy.html' },
  { name: 'WizeMoney',      url: 'https://money.wizelife.ai/' },
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

function findAuthLinksWithoutNofollow(html) {
  const bad = [];
  const re = /<a\s+([^>]*href\s*=\s*["'][^"']*auth\.html[^"']*["'][^>]*)>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    const relMatch = attrs.match(/rel\s*=\s*["']([^"']+)["']/i);
    const rel = relMatch ? relMatch[1] : '';
    if (!rel.includes('nofollow')) {
      bad.push(m[0].slice(0, 100));
    }
  }
  return bad;
}

function pass(name, detail) { console.log('PASS  ' + name + (detail ? ' — ' + detail : '')); return true; }
function fail(name, detail) { console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); return false; }

async function checkPage(page) {
  try {
    const { status, body } = await fetch(page.url);
    if (status >= 400) return fail(page.name, 'HTTP ' + status);
    const bad = findAuthLinksWithoutNofollow(body);
    if (bad.length) {
      return fail(page.name, bad.length + ' auth link(s) missing rel="nofollow": ' + bad[0]);
    }
    return pass(page.name, 'All auth.html links have rel="nofollow"');
  } catch (e) {
    return fail(page.name, String(e).slice(0, 120));
  }
}

(async () => {
  console.log('=== seo-auth-nofollow: auth.html links must carry rel="nofollow" ===\n');
  const results = await Promise.all(PAGES.map(checkPage));
  const failed = results.filter(r => !r).length;
  console.log('\n' + (PAGES.length - failed) + '/' + PAGES.length + ' passed');
  process.exit(failed > 0 ? 1 : 0);
})();