#!/usr/bin/env node
// qa/per-app/wizetax-flow-6-api-auth-required.qa.js
// Deep flow test added 2026-05-26 — verifies that POST /api/chat without
// a Bearer token returns 401 (not 200 or 500).

const API = 'https://tax.wizelife.ai/api/chat';
const { runSuite, fetchOk } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTax / api-auth-required', [
    {
      name: 'POST /api/chat without auth returns 401',
      fn: async () => {
        const r = await fetchOk(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'hello', country: 'PT' }),
        });
        if (r.status === 200) throw new Error('API returned 200 without auth — endpoint is open!');
        if (r.status === 500) throw new Error('API returned 500 without auth — server error exposed');
        if (r.status !== 401 && r.status !== 403) {
          throw new Error(`Unexpected status ${r.status} (expected 401/403)`);
        }
      },
    },
    {
      name: 'POST /api/chat response does not leak stack trace',
      fn: async () => {
        const r = await fetchOk(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'hello' }),
        });
        const body = r.body.toLowerCase();
        if (body.includes('traceback') || body.includes('at ') && body.includes('.py')) {
          throw new Error('Response may contain Python stack trace — info leak risk');
        }
      },
    },
  ]);
})();
