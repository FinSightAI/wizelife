#!/usr/bin/env node
// qa/per-app/wizetax-flow-7-disclaimer-footer.qa.js
// Deep flow test added 2026-05-26 — checks that a "not tax advice" or
// equivalent disclaimer is visible somewhere on the advisor page.

const BASE = 'https://tax.wizelife.ai/advisor';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTax / disclaimer-footer', [
    {
      name: 'disclaimer text in HTML source',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'not tax advice') ||
          findInHtml(r.body, 'not financial advice') ||
          findInHtml(r.body, 'not professional advice') ||
          findInHtml(r.body, 'disclaimer') ||
          findInHtml(r.body, 'consult a') ||
          findInHtml(r.body, 'tax professional');
        if (!has) throw new Error('No disclaimer/not-tax-advice text found in HTML source');
      },
    },
    {
      name: 'Playwright: disclaimer visible in rendered page',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping disclaimer visibility test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(3000);
          const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
          const has =
            text.includes('not tax advice') ||
            text.includes('not financial advice') ||
            text.includes('disclaimer') ||
            text.includes('consult a') ||
            text.includes('tax professional');
          if (!has) throw new Error('No disclaimer text found in rendered page');
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
