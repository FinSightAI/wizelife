#!/usr/bin/env node
// qa/per-app/wizetravel-flow-1-landing-renders.qa.js
// Deep flow test added 2026-05-26 — verifies the WizeTravel landing page
// returns 200 and contains core brand/travel content.

const BASE = 'https://travel.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTravel / landing-renders', [
    {
      name: 'landing page returns HTTP 200',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      },
    },
    {
      name: 'travel-related content present in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'travel') ||
          findInHtml(r.body, 'flight') ||
          findInHtml(r.body, 'hotel') ||
          findInHtml(r.body, 'destination') ||
          findInHtml(r.body, 'wize');
        if (!has) throw new Error('No travel/flight/hotel/destination/wize content in HTML');
      },
    },
    {
      name: 'Playwright: page renders without JS errors on 390px',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping error check)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        const jsErrors = [];
        page.on('pageerror', e => jsErrors.push(e.message));
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(3000);
          const fatal = jsErrors.filter(e => !e.includes('firebase') && !e.includes('analytics'));
          if (fatal.length > 0) throw new Error('JS errors: ' + fatal.slice(0, 3).join('; '));
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
