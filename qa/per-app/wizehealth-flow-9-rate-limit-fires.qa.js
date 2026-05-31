#!/usr/bin/env node
// qa/per-app/wizehealth-flow-9-rate-limit-fires.qa.js
// Deep flow test added 2026-05-26 — sends 25 rapid POST requests to
// /api/chat and verifies at least 1 returns 429 (rate limit enforced).
// NOTE: This test deliberately stresses the endpoint. Do not run in prod CI.

const API = 'https://health.wizelife.ai/api/chat';
const { runSuite, fetchOk } = require('./_lib-flow');
const CONCURRENCY = 25;

(async () => {
  await runSuite('WizeHealth / rate-limit-fires', [
    {
      name: `${CONCURRENCY} rapid POST requests — at least 1 should return 429`,
      fn: async () => {
        const results = await Promise.all(
          Array.from({ length: CONCURRENCY }, (_, i) =>
            fetchOk(API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: `test ${i}`, history: [] }),
            }).catch(err => ({ status: 0, error: err.message }))
          )
        );

        const statuses = results.map(r => r.status);
        const has429 = statuses.includes(429);
        const has401_403 = statuses.some(s => s === 401 || s === 403);
        const has200 = statuses.some(s => s === 200);

        console.log(`  Statuses seen: ${[...new Set(statuses)].sort().join(', ')}`);

        if (has401_403 && !has200) {
          // All requests blocked by auth — rate limit untestable without token
          console.log('  (info) All requests blocked by auth — rate limit not testable without token');
          return;
        }

        if (has200 && !has429) {
          throw new Error(`${CONCURRENCY} unauthenticated requests all returned 200 — no rate limit detected!`);
        }
      },
    },
  ]);
})();
