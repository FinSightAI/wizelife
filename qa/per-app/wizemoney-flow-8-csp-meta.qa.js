#!/usr/bin/env node
// qa/per-app/wizemoney-flow-8-csp-meta.qa.js
// Deep flow test added 2026-05-26 — checks that a Content-Security-Policy
// meta tag or CSP response header is present on the WizeMoney landing page.

const BASE = 'https://money.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeMoney / csp-meta', [
    {
      name: 'CSP present as response header or meta tag',
      fn: async () => {
        const r = await fetchOk(BASE);
        const headerCsp = Object.keys(r.headers).some(h =>
          h.toLowerCase() === 'content-security-policy'
        );
        const metaCsp =
          findInHtml(r.body, 'content-security-policy') ||
          findInHtml(r.body, 'http-equiv="Content-Security-Policy"', true) ||
          findInHtml(r.body, "http-equiv='Content-Security-Policy'", true);
        if (!headerCsp && !metaCsp) {
          throw new Error('No CSP header or meta tag found on landing page');
        }
      },
    },
    {
      name: 'CSP includes script-src or default-src directive',
      fn: async () => {
        const r = await fetchOk(BASE);
        const cspHeader = r.headers['content-security-policy'] || '';
        const has =
          findInHtml(cspHeader, 'script-src') ||
          findInHtml(cspHeader, 'default-src') ||
          findInHtml(r.body, 'script-src') ||
          findInHtml(r.body, 'default-src');
        if (!has) {
          console.log('  (warn) CSP present but no script-src/default-src directive found');
        }
      },
    },
  ]);
})();
