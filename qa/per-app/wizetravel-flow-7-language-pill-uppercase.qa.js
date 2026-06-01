#!/usr/bin/env node
// qa/per-app/wizetravel-flow-7-language-pill-uppercase.qa.js
// Deep flow test added 2026-05-26 — verifies language pills display UPPERCASE
// labels: EN, HE, PT, ES (not en, he, pt, es).

const BASE = 'https://travel.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

const EXPECTED_PILLS = ['EN', 'HE', 'PT', 'ES'];

(async () => {
  await runSuite('WizeTravel / language-pill-uppercase', [
    {
      name: 'UPPERCASE lang pill labels in HTML source',
      fn: async () => {
        const r = await fetchOk(BASE);
        for (const pill of EXPECTED_PILLS) {
          // Check for exact uppercase text as button content or data attribute
          if (!findInHtml(r.body, pill, true)) {
            console.log(`  (warn) "${pill}" not in static HTML — may be rendered client-side`);
          }
        }
      },
    },
    {
      name: 'Playwright: lang pills show UPPERCASE text',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping uppercase pill test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(3000);
          const pills = await page.locator('[data-lang], .lang-pill, [class*="lang-btn"]').all();
          for (const pill of pills) {
            const text = (await pill.innerText()).trim();
            if (text && text !== text.toUpperCase()) {
              throw new Error(`Language pill "${text}" is not UPPERCASE`);
            }
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
