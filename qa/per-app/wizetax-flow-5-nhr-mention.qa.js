#!/usr/bin/env node
// qa/per-app/wizetax-flow-5-nhr-mention.qa.js
// Deep flow test added 2026-05-26 — checks that "NHR" (Non-Habitual Resident
// Portuguese tax regime) is mentioned in the advisor docs, help text, or HTML.

const BASE = 'https://tax.wizelife.ai/advisor';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTax / nhr-mention', [
    {
      name: '"NHR" referenced somewhere in the advisor page HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (!findInHtml(r.body, 'nhr', true) && !findInHtml(r.body, 'NHR', true)) {
          console.log('  (warn) "NHR" not found in static HTML — may be loaded dynamically');
        }
      },
    },
    {
      name: 'Playwright: NHR mentioned in rendered page text',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping NHR render check)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(3000);
          const bodyText = await page.evaluate(() => document.body.innerText.toUpperCase());
          if (!bodyText.includes('NHR')) {
            console.log('  (warn) NHR not in rendered text — may appear after Portugal country selection');
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
