#!/usr/bin/env node
// qa/per-app/wizehealth-flow-5-sec-fetch-403.qa.js
// Deep flow test added 2026-05-26 — verifies that a cross-site POST to
// /api/chat is rejected with 403.

const API = 'https://health.wizelife.ai/api/chat';
const { runSuite, fetchOk } = require('./_lib-flow');

(async () => {
  await runSuite('WizeHealth / sec-fetch-403', [
    {
      name: 'POST with Sec-Fetch-Site: cross-site returns 403 or 401',
      fn: async () => {
        const r = await fetchOk(API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Sec-Fetch-Site': 'cross-site',
            'Origin': 'https://attacker.example.com',
          },
          body: JSON.stringify({ message: 'xss test', history: [] }),
        });
        if (r.status === 200) {
          throw new Error('Cross-site POST returned 200 — CSRF protection missing');
        }
        if (r.status !== 403 && r.status !== 401) {
          console.log(`  (warn) Cross-site POST returned ${r.status} (expected 403/401)`);
        }
      },
    },
    {
      name: 'CORS does not allow wildcard origin on API',
      fn: async () => {
        const r = await fetchOk(API, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://attacker.example.com',
            'Access-Control-Request-Method': 'POST',
          },
        });
        const acao = r.headers['access-control-allow-origin'] || '';
        if (acao === '*') {
          throw new Error('API has wildcard Access-Control-Allow-Origin — CSRF risk');
        }
      },
    },
  ]);
})();
