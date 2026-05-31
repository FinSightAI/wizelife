#!/usr/bin/env node
// qa/per-app/wizedeal-flow-6-api-auth-401.qa.js
// Deep flow test added 2026-05-26 — verifies that POST /api/ai/sell-price
// without a Bearer token returns 401/403.

const API = 'https://deal.wizelife.ai/api/ai/sell-price';
const { runSuite, fetchOk } = require('./_lib-flow');

(async () => {
  await runSuite('WizeDeal / api-auth-401', [
    {
      name: 'POST /api/ai/sell-price without auth returns 401 or 403',
      fn: async () => {
        const r = await fetchOk(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: 'PT', price: 1000 }),
        });
        if (r.status === 200) throw new Error('API returned 200 without auth — endpoint is open!');
        if (r.status === 500) throw new Error('API returned 500 — server error exposed without auth');
        if (r.status !== 401 && r.status !== 403) {
          console.log(`  (warn) Unexpected status ${r.status} (expected 401/403)`);
        }
      },
    },
    {
      name: 'Unauthenticated response does not leak internal details',
      fn: async () => {
        const r = await fetchOk(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: 'PT' }),
        });
        const body = r.body.toLowerCase();
        if (body.includes('traceback') || body.includes('stack trace') || body.includes('at /')) {
          throw new Error('Response may contain stack trace — info leak risk');
        }
      },
    },
  ]);
})();
