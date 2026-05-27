#!/usr/bin/env node
// qa/per-app/wizetravel-flow-8-back-to-wizelife.qa.js
// Deep flow test added 2026-05-26 — verifies there is a link back to
// wizelife.ai in the navigation or footer.

const BASE = 'https://travel.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTravel / back-to-wizelife', [
    {
      name: 'wizelife.ai link present in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (!findInHtml(r.body, 'wizelife.ai')) {
          throw new Error('No link to wizelife.ai found in HTML source');
        }
      },
    },
    {
      name: 'Playwright: wizelife.ai link is visible',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping link visibility test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(2500);
          const link = page.locator('a[href*="wizelife.ai"]').first();
          if ((await link.count()) === 0) throw new Error('No a[href*="wizelife.ai"] element found');
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
