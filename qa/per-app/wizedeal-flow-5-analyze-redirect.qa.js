#!/usr/bin/env node
// qa/per-app/wizedeal-flow-5-analyze-redirect.qa.js
// Deep flow test added 2026-05-26 — verifies that GET /analyze redirects
// to /sell (308 or 301/302 with Location: /sell).

const https = require('https');
const { runSuite, assert } = require('./_lib-flow');

function fetchNoFollow(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'User-Agent': 'WizeQA/1.0' },
      timeout: 15000,
    }, (res) => {
      res.resume(); // drain
      resolve({ status: res.statusCode, location: res.headers.location || '' });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

(async () => {
  await runSuite('WizeDeal / analyze-redirect', [
    {
      name: 'GET /analyze returns 3xx redirect',
      fn: async () => {
        const r = await fetchNoFollow('https://deal.wizelife.ai/analyze');
        if (r.status < 300 || r.status >= 400) {
          throw new Error(`/analyze returned ${r.status} (expected 3xx redirect)`);
        }
      },
    },
    {
      name: 'Redirect Location points to /sell',
      fn: async () => {
        const r = await fetchNoFollow('https://deal.wizelife.ai/analyze');
        if (r.status >= 300 && r.status < 400) {
          if (!r.location.includes('/sell') && !r.location.includes('sell')) {
            throw new Error(`/analyze redirects to "${r.location}" (expected /sell)`);
          }
        }
      },
    },
  ]);
})();
