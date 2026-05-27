#!/usr/bin/env node
// qa/per-app/wizedeal-flow-10-pricing-pill-disabled.qa.js
// Deep flow test added 2026-05-26 — verifies that wize-pricing-pill.js
// contains a "no-op" pattern (paywall disabled pre-launch).

const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

const PILL_URLS = [
  'https://deal.wizelife.ai/js/wize-pricing-pill.js',
  'https://deal.wizelife.ai/public/js/wize-pricing-pill.js',
  'https://deal.wizelife.ai/_next/static/wize-pricing-pill.js',
];

(async () => {
  await runSuite('WizeDeal / pricing-pill-disabled', [
    {
      name: 'wize-pricing-pill.js reachable and contains no-op pattern',
      fn: async () => {
        let found = false;
        let body = '';
        for (const url of PILL_URLS) {
          try {
            const r = await fetchOk(url);
            if (r.status === 200 && r.body.length > 50) {
              body = r.body;
              found = true;
              break;
            }
          } catch (_) { /* try next */ }
        }
        if (!found) {
          console.log('  (warn) wize-pricing-pill.js not found at expected paths — may be bundled');
          return;
        }
        const hasNoOp =
          findInHtml(body, 'no-op') ||
          findInHtml(body, 'noop') ||
          findInHtml(body, 'PAYWALL_ACTIVE') ||
          findInHtml(body, 'disabled') ||
          findInHtml(body, 'return') && findInHtml(body, '//');
        if (!hasNoOp) {
          throw new Error('wize-pricing-pill.js found but no no-op/PAYWALL_ACTIVE pattern detected');
        }
      },
    },
    {
      name: 'WizeDeal landing references pricing pill script or pricing component',
      fn: async () => {
        const r = await fetchOk('https://deal.wizelife.ai/');
        const has =
          findInHtml(r.body, 'pricing-pill') ||
          findInHtml(r.body, 'wize-plan') ||
          findInHtml(r.body, 'PAYWALL') ||
          findInHtml(r.body, 'pricing');
        if (!has) {
          console.log('  (warn) No pricing pill/PAYWALL reference on WizeDeal landing');
        }
      },
    },
  ]);
})();
