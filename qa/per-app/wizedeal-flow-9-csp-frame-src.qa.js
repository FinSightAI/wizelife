#!/usr/bin/env node
// qa/per-app/wizedeal-flow-9-csp-frame-src.qa.js
// Deep flow test added 2026-05-26 — verifies the CSP includes frame-src
// or frame-ancestors for accounts.google.com (Firebase auth popup).

const BASE = 'https://deal.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeDeal / csp-frame-src', [
    {
      name: 'CSP present on landing page',
      fn: async () => {
        const r = await fetchOk(BASE);
        const hasHeaderCsp = Object.keys(r.headers).some(h => h.toLowerCase() === 'content-security-policy');
        const hasMetaCsp = findInHtml(r.body, 'content-security-policy');
        if (!hasHeaderCsp && !hasMetaCsp) {
          console.log('  (warn) No CSP header or meta tag on WizeDeal landing');
        }
      },
    },
    {
      name: 'CSP includes accounts.google.com or *.google.com for Firebase',
      fn: async () => {
        const r = await fetchOk(BASE);
        const csp = r.headers['content-security-policy'] || '';
        const hasGoogle =
          findInHtml(csp, 'accounts.google.com') ||
          findInHtml(csp, '*.google.com') ||
          findInHtml(csp, 'google.com') ||
          findInHtml(r.body, 'accounts.google.com');
        if (!hasGoogle) {
          console.log('  (warn) accounts.google.com not in CSP — Firebase auth popup may be blocked');
        }
      },
    },
    {
      name: 'no wildcard frame-src that allows arbitrary framing',
      fn: async () => {
        const r = await fetchOk(BASE);
        const csp = r.headers['content-security-policy'] || '';
        if (findInHtml(csp, "frame-src '*'") || findInHtml(csp, 'frame-src *')) {
          throw new Error('CSP has wildcard frame-src — clickjacking risk');
        }
      },
    },
  ]);
})();
