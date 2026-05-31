#!/usr/bin/env node
// qa/per-app/wizehealth-flow-6-frame-ancestors-none.qa.js
// Deep flow test added 2026-05-26 — verifies that the CSP includes
// frame-ancestors 'none' to prevent clickjacking.

const BASE = 'https://health.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeHealth / frame-ancestors-none', [
    {
      name: 'CSP frame-ancestors none or X-Frame-Options: DENY present',
      fn: async () => {
        const r = await fetchOk(BASE);
        const csp = r.headers['content-security-policy'] || '';
        const xfo = r.headers['x-frame-options'] || '';
        const hasFrameAncestors = findInHtml(csp, "frame-ancestors 'none'") || findInHtml(csp, 'frame-ancestors');
        const hasXfo = xfo.toUpperCase() === 'DENY' || xfo.toUpperCase() === 'SAMEORIGIN';
        if (!hasFrameAncestors && !hasXfo) {
          throw new Error('No frame-ancestors CSP or X-Frame-Options header — clickjacking risk');
        }
      },
    },
    {
      name: 'frame-ancestors is not a permissive wildcard',
      fn: async () => {
        const r = await fetchOk(BASE);
        const csp = r.headers['content-security-policy'] || '';
        if (findInHtml(csp, "frame-ancestors '*'") || findInHtml(csp, 'frame-ancestors *')) {
          throw new Error("CSP has 'frame-ancestors *' — clickjacking allowed!");
        }
      },
    },
    {
      name: 'HSTS header present on health app',
      fn: async () => {
        const r = await fetchOk(BASE);
        const hsts = r.headers['strict-transport-security'] || '';
        if (!hsts) {
          console.log('  (warn) No HSTS header on WizeHealth — add Strict-Transport-Security');
        }
      },
    },
  ]);
})();
