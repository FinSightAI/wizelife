#!/usr/bin/env node
// regression test — added 2026-05-25
// Bug: CSP frame-src didn't include https://www.google.com — reCAPTCHA/Firebase
//      Auth iframes were blocked, preventing Google sign-in.
// Fix: CSP frame-src must include https://www.google.com on every app that
//      uses Firebase Auth / Google sign-in.
// Usage: node qa/security-csp-recaptcha.qa.js

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

const REQUIRED_FRAME_ORIGINS = [
  'https://www.google.com',
  'https://accounts.google.com',
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'WizeLifeQA/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }).on('error', reject);
  });
}

function extractCSP(body, headers) {
  const headerCSP = headers['content-security-policy'] || '';
  if (headerCSP) return headerCSP;
  const m = body.match(/<meta[^>]+http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*content\s*=\s*["']([^"']+)["']/i)
         || body.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*http-equiv\s*=\s*["']Content-Security-Policy["']/i);
  return m ? m[1] : '';
}

function extractFrameSrc(csp) {
  const m = csp.match(/frame-src\s+([^;]+)/i);
  if (!m) return null;
  return m[1].trim();
}

function pass(name, detail) { console.log('PASS  ' + name + (detail ? ' — ' + detail : '')); return true; }
function fail(name, detail) { console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); return false; }

async function checkApp(app) {
  try {
    const { status, body, headers } = await fetch(app.url);
    if (status >= 400) return fail(app.name, 'HTTP ' + status);
    const csp = extractCSP(body, headers);
    if (!csp) return fail(app.name, 'No CSP found (header or meta tag)');
    const frameSrc = extractFrameSrc(csp);
    if (!frameSrc) {
      const defaultSrc = (csp.match(/default-src\s+([^;]+)/i) || [])[1] || '';
      if (!defaultSrc.includes('https://www.google.com') && !defaultSrc.includes('https:')) {
        return fail(app.name, 'No frame-src and default-src does not cover google.com');
      }
      return pass(app.name, 'No explicit frame-src; default-src covers it');
    }
    const missing = REQUIRED_FRAME_ORIGINS.filter(o => !frameSrc.includes(o));
    if (missing.length) {
      return fail(app.name, 'frame-src missing: ' + missing.join(', ') + ' — Google iframes blocked');
    }
    return pass(app.name, 'frame-src includes required Google origins');
  } catch (e) {
    return fail(app.name, String(e).slice(0, 120));
  }
}

(async () => {
  console.log('=== security-csp-recaptcha: frame-src must allow Google origins ===\n');
  const results = await Promise.all(APPS.map(checkApp));
  const failed = results.filter(r => !r).length;
  console.log('\n' + (APPS.length - failed) + '/' + APPS.length + ' passed');
  process.exit(failed > 0 ? 1 : 0);
})();