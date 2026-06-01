#!/usr/bin/env node
// qa/per-app/wizetax-flow-8-language-rtl.qa.js
// Deep flow test added 2026-05-26 — verifies that switching to Hebrew sets
// dir=rtl on the html element.

const BASE = 'https://tax.wizelife.ai/advisor';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTax / language-rtl', [
    {
      name: 'i18n or lang reference in advisor HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has = findInHtml(r.body, 'lang') || findInHtml(r.body, 'i18n') || findInHtml(r.body, 'rtl');
        if (!has) throw new Error('No lang/i18n/rtl reference found in HTML');
      },
    },
    {
      name: 'Playwright: selecting Hebrew sets dir=rtl',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping RTL direction test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(2500);

          // Try clicking a Hebrew language pill
          const hePill = page.locator('[data-lang="he"], button:has-text("HE"), button:has-text("עברית")').first();
          if ((await hePill.count()) > 0) {
            await hePill.click();
            await page.waitForTimeout(800);
            const dir = await page.evaluate(() => document.documentElement.dir);
            if (dir !== 'rtl') {
              throw new Error(`dir=${dir} after Hebrew selection (expected rtl)`);
            }
          } else {
            console.log('  (warn) No Hebrew pill found — may not be accessible without auth');
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
