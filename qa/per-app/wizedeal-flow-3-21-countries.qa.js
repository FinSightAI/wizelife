#!/usr/bin/env node
// qa/per-app/wizedeal-flow-3-21-countries.qa.js
// Deep flow test added 2026-05-26 — verifies the country dropdown on /sell
// has at least 21 options.

const BASE = 'https://deal.wizelife.ai/sell';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeDeal / 21-countries', [
    {
      name: 'static HTML has multiple country options',
      fn: async () => {
        const r = await fetchOk(BASE);
        const optionMatches = (r.body.match(/<option/gi) || []).length;
        if (optionMatches < 21) {
          console.log(`  (warn) Only ${optionMatches} <option> in static HTML — likely client-side rendered`);
        }
      },
    },
    {
      name: 'Playwright: country dropdown has 21+ options',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping country count test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(3000);

          // Look for a select with country options
          const selects = await page.locator('select').all();
          let maxOptions = 0;
          for (const sel of selects) {
            const opts = await sel.locator('option').count();
            if (opts > maxOptions) maxOptions = opts;
          }
          if (maxOptions < 21) {
            throw new Error(`Max options in any dropdown: ${maxOptions} (expected 21+)`);
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
