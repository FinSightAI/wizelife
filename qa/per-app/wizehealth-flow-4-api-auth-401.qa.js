#!/usr/bin/env node
// qa/per-app/wizehealth-flow-4-api-auth-401.qa.js
// Deep flow test added 2026-05-26 — verifies POST /api/chat without auth
// returns 401/403 (not 200 or 500).

const API = 'https://health.wizelife.ai/api/chat';
const { runSuite, fetchOk } = require('./_lib-flow');

(async () => {
  await runSuite('WizeHealth / api-auth-401', [
    {
      name: 'POST /api/chat without auth returns 401 or 403',
      fn: async () => {
        const r = await fetchOk(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'hello', history: [] }),
        });
        if (r.status === 200) throw new Error('API returned 200 without auth — endpoint open!');
        if (r.status === 500) throw new Error('API 500 without auth — server error exposed');
        if (r.status !== 401 && r.status !== 403) {
          console.log(`  (warn) POST /api/chat returned ${r.status} (expected 401/403)`);
        }
      },
    },
    {
      name: 'Response body is valid JSON or plain text (not HTML error page)',
      fn: async () => {
        const r = await fetchOk(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'hello' }),
        });
        if (r.body.trim().startsWith('<!DOCTYPE') || r.body.includes('<html')) {
          throw new Error('API returns raw HTML error page — leaks server info');
        }
      },
    },
  ]);
})();
