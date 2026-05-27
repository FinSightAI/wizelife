#!/usr/bin/env node
// qa/per-app/wizelife-flow-6-status-page.qa.js
// Deep flow test added 2026-05-26 — verifies /status.html returns 200 and
// contains status-related content.

const STATUS_URL = 'https://wizelife.ai/status.html';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeLife Portal / status-page', [
    {
      name: '/status.html returns 200',
      fn: async () => {
        const r = await fetchOk(STATUS_URL);
        if (r.status !== 200) throw new Error(`/status.html returned ${r.status} (expected 200)`);
      },
    },
    {
      name: '/status.html contains status-related content',
      fn: async () => {
        const r = await fetchOk(STATUS_URL);
        const has =
          findInHtml(r.body, 'status') ||
          findInHtml(r.body, 'operational') ||
          findInHtml(r.body, 'uptime') ||
          findInHtml(r.body, 'incident');
        if (!has) throw new Error('No status/operational/uptime content on status page');
      },
    },
  ]);
})();
