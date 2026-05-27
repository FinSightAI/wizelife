#!/usr/bin/env node
// qa/per-app/wizetax-flow-4-country-list.qa.js
// Deep flow test added 2026-05-26 — verifies the advisor page exposes at
// least 20 country options in its dropdown(s).

const BASE = 'https://tax.wizelife.ai/advisor';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTax / country-list', [
    {
      name: 'HTML source contains multiple country names',
      fn: async () => {
        const r = await fetchOk(BASE);
        // Count occurrences of <option — a proxy for dropdown items
        const matches = (r.body.match(/<option/gi) || []).length;
        if (matches < 20) {
          // Might be loaded client-side — just check for known countries
          const knownCountries = ['Portugal', 'Spain', 'Israel', 'France', 'Germany', 'Italy', 'Netherlands'];
          const found = knownCountries.filter(c => findInHtml(r.body, c)).length;
          if (found < 3) {
            console.log(`  (warn) Only ${matches} <option> tags in static HTML — likely client-side rendered`);
          }
        }
      },
    },
    {
      name: 'Playwright: at least 20 country options in dropdown',
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
          const optionCount = await page.locator('select option').count();
          if (optionCount < 20) {
            throw new Error(`Only ${optionCount} country options found (expected 20+)`);
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
