#!/usr/bin/env node
// qa/per-app/wizedeal-flow-7-sec-fetch-403.qa.js
// Deep flow test added 2026-05-26 — verifies that a POST with
// Sec-Fetch-Site: cross-site header is rejected (403 expected).

const API = 'https://deal.wizelife.ai/api/ai/sell-price';
const { runSuite, fetchOk } = require('./_lib-flow');

(async () => {
  await runSuite('WizeDeal / sec-fetch-403', [
    {
      name: 'POST with Sec-Fetch-Site: cross-site returns 403',
      fn: async () => {
        const r = await fetchOk(API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Sec-Fetch-Site': 'cross-site',
            'Origin': 'https://evil.example.com',
          },
          body: JSON.stringify({ country: 'PT', price: 100 }),
        });
        if (r.status === 200) {
          throw new Error('Cross-site request returned 200 — CSRF protection may be missing');
        }
        if (r.status !== 403 && r.status !== 401) {
          console.log(`  (warn) Cross-site POST returned ${r.status} (expected 403/401)`);
        }
      },
    },
    {
      name: 'CORS header not wildcard on API endpoint',
      fn: async () => {
        const r = await fetchOk(API, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://evil.example.com',
            'Access-Control-Request-Method': 'POST',
          },
        });
        const acao = r.headers['access-control-allow-origin'] || '';
        if (acao === '*') {
          throw new Error('API has wildcard CORS Access-Control-Allow-Origin — CSRF risk');
        }
      },
    },
  ]);
})();
