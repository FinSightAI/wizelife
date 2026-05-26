#!/usr/bin/env node
// regression test — added 2026-05-25
// Bug: WizeDeal sitemap listed /compare and /portfolio which returned 404.
// Fix: Every <loc> in every sitemap must return 200 or 3xx (not 404/5xx).
// Usage: node qa/seo-sitemap-urls.qa.js

'use strict';
const https = require('https');
const http  = require('http');

const SITEMAPS = [
  { name: 'Portal',     url: 'https://wizelife.ai/sitemap.xml' },
  { name: 'WizeMoney',  url: 'https://money.wizelife.ai/sitemap.xml' },
  { name: 'WizeTax',    url: 'https://tax.wizelife.ai/sitemap.xml' },
  { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/sitemap.xml' },
  { name: 'WizeHealth', url: 'https://health.wizelife.ai/sitemap.xml' },
  { name: 'WizeTravel', url: 'https://travel.wizelife.ai/sitemap.xml' },
];

function fetchRaw(url, maxRedirects) {
  if (maxRedirects === undefined) maxRedirects = 5;
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'WizeLifeQA/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        return fetchRaw(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function checkStatus(url) {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'WizeLifeQA/1.0' } }, res => {
      res.resume();
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return checkStatus(res.headers.location).then(resolve);
      }
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
    req.setTimeout(12000, () => { req.destroy(); resolve(-1); });
  });
}

function parseLocs(xml) {
  const locs = [];
  const re = /<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) locs.push(m[1]);
  return locs;
}

function pass(name, detail) { console.log('PASS  ' + name + (detail ? ' — ' + detail : '')); return true; }
function fail(name, detail) { console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); return false; }

async function checkSitemap(app) {
  try {
    const { status, body } = await fetchRaw(app.url);
    if (status === 404) return fail(app.name, 'sitemap.xml returned 404');
    if (status >= 400) return fail(app.name, 'sitemap.xml HTTP ' + status);
    const locs = parseLocs(body);
    if (!locs.length) return fail(app.name, 'sitemap.xml has no <loc> entries');
    const checks = await Promise.all(locs.map(async loc => {
      const s = await Promise.race([
        checkStatus(loc),
        new Promise(r => setTimeout(() => r(-1), 12000))
      ]);
      return { loc, status: s };
    }));
    const bad = checks.filter(c => c.status === 404 || c.status >= 500 || c.status === 0 || c.status === -1);
    if (bad.length) {
      const summary = bad.map(b => b.loc + ' -> ' + (b.status === -1 ? 'timeout' : b.status)).join(', ');
      return fail(app.name, bad.length + ' broken URL(s): ' + summary);
    }
    return pass(app.name, locs.length + ' URL(s) all reachable');
  } catch (e) {
    return fail(app.name, String(e).slice(0, 120));
  }
}

(async () => {
  console.log('=== seo-sitemap-urls: every sitemap <loc> must return 200/3xx ===\n');
  const results = [];
  for (const app of SITEMAPS) {
    results.push(await checkSitemap(app));
  }
  const failed = results.filter(r => !r).length;
  console.log('\n' + (SITEMAPS.length - failed) + '/' + SITEMAPS.length + ' passed');
  process.exit(failed > 0 ? 1 : 0);
})();