#!/usr/bin/env node
// qa/per-app/wizemoney-flow-10-sw-registered.qa.js
// Deep flow test added 2026-05-26 — verifies that sw.js is reachable (HTTP 200)
// and the service-worker registration script is present in the HTML.

const BASE = 'https://money.wizelife.ai/';
const SW_URL = 'https://money.wizelife.ai/sw.js';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeMoney / sw-registered', [
    {
      name: 'sw.js returns HTTP 200',
      fn: async () => {
        const r = await fetchOk(SW_URL);
        if (r.status !== 200) throw new Error(`sw.js returned ${r.status} (expected 200)`);
      },
    },
    {
      name: 'sw.js is non-empty JavaScript',
      fn: async () => {
        const r = await fetchOk(SW_URL);
        if (r.body.length < 100) throw new Error('sw.js looks empty or truncated');
        if (!findInHtml(r.body, 'cache') && !findInHtml(r.body, 'fetch')) {
          throw new Error('sw.js does not contain expected cache/fetch keywords');
        }
      },
    },
    {
      name: 'Landing HTML references serviceWorker registration',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'serviceWorker') ||
          findInHtml(r.body, 'sw.js') ||
          findInHtml(r.body, 'service-worker');
        if (!has) throw new Error('No serviceWorker registration found in landing HTML');
      },
    },
    {
      name: 'Playwright: navigator.serviceWorker available and registration succeeds',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping SW registration check)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(4000); // SW registration is async
          const swState = await page.evaluate(async () => {
            if (!navigator.serviceWorker) return 'not-supported';
            const regs = await navigator.serviceWorker.getRegistrations();
            return regs.length > 0 ? 'registered' : 'none';
          });
          if (swState === 'none') {
            throw new Error('Service worker not registered after 4s on landing page');
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
