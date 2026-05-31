#!/usr/bin/env node
// regression test — added 2026-05-25
// Bug: CSP frame-src didn't include https://www.google.com — reCAPTCHA/Firebase
//      Auth iframes were blocked, preventing Google sign-in.
// Fix: CSP frame-src must include https://www.google.com (or *.google.com wildcard)
//      on every app that uses Firebase Auth / Google sign-in.
// Usage: node qa/security-csp-recaptcha.qa.js

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

// Required origins in frame-src for Firebase Auth / reCAPTCHA (wildcard satisfies)
// https://*.google.com covers https://www.google.com
const REQUIRED_FRAME_PATTERNS = [
  /https:\/\/(www|\*)?\.google\.com/,
  /https:\/\/(accounts|\*)\.google\.com/,
];

function fetchFull(url, maxRedirects) {
  if (maxRedirects === undefined) maxRedirects = 5;
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'WizeLifeQA/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        // Resolve relative redirects
        let loc = res.headers.location;
        if (loc.startsWith('/')) {
          const u = new URL(url);
          loc = u.origin + loc;
        }
        return fetchFull(loc, maxRedirects - 1).then(resolve).catch(reject);
      }
      // Capture both headers and body
      const hdrs = res.headers;
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: hdrs }));
    }).on('error', reject);
  });
}

function extractCSP(body, headers) {
  // 1. HTTP header takes precedence
  const h = headers['content-security-policy'] || '';
  if (h) return h;
  // 2. Meta tag — must handle double-quoted content with single-quoted values inside
  const m = body.match(/<meta[^>]+http-equiv\s*=\s*"Content-Security-Policy"[^>]*content\s*=\s*"([^"]+)"/i)
         || body.match(/<meta[^>]+http-equiv\s*=\s*'Content-Security-Policy'[^>]*content\s*=\s*'([^']+)'/i)
         || body.match(/<meta[^>]+content\s*=\s*"([^"]+)"[^>]*http-equiv\s*=\s*"Content-Security-Policy"/i)
         || body.match(/<meta[^>]+content\s*=\s*'([^']+)'[^>]*http-equiv\s*=\s*'Content-Security-Policy'/i);
  return m ? m[1] : '';
}

function extractFrameSrc(csp) {
  const m = csp.match(/frame-src\s+([^;]+)/i);
  return m ? m[1].trim() : null;
}

function frameAllowsGoogle(frameSrc) {
  return REQUIRED_FRAME_PATTERNS.every(re => re.test(frameSrc));
}

function pass(name, detail) { console.log('PASS  ' + name + (detail ? ' — ' + detail : '')); return true; }
function fail(name, detail) { console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); return false; }

async function checkApp(app) {
  try {
    const { status, body, headers } = await fetchFull(app.url);
    if (status >= 400) return fail(app.name, 'HTTP ' + status);
    const csp = extractCSP(body, headers);
    if (!csp) return fail(app.name, 'No CSP found (header or meta tag)');
    const frameSrc = extractFrameSrc(csp);
    if (!frameSrc) {
      // No explicit frame-src — check if default-src acts as fallback with https: wildcard
      const defSrc = (csp.match(/default-src\s+([^;]+)/i) || [])[1] || '';
      if (/\bhttps:\b/.test(defSrc)) {
        return pass(app.name, 'No frame-src; default-src has https: wildcard (covers Google)');
      }
      return fail(app.name, 'No frame-src directive — Firebase Auth iframes will be blocked');
    }
    if (!frameAllowsGoogle(frameSrc)) {
      return fail(app.name, 'frame-src missing Google origins for reCAPTCHA: ' + frameSrc.slice(0, 80));
    }
    return pass(app.name, 'frame-src allows Google origins');
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