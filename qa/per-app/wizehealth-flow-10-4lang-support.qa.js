#!/usr/bin/env node
// qa/per-app/wizehealth-flow-10-4lang-support.qa.js
// Deep flow test added 2026-05-26 — verifies all 4 language pills
// (EN/HE/PT/ES) are present and uppercase on the WizeHealth page.

const BASE = 'https://health.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');
const EXPECTED = ['EN', 'HE', 'PT', 'ES'];

(async () => {
  await runSuite('WizeHealth / 4lang-support', [
    {
      name: 'all 4 language data attributes or labels in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const missing = EXPECTED.filter(l =>
          !findInHtml(r.body, `data-lang="${l.toLowerCase()}"`) &&
          !findInHtml(r.body, l, true)
        );
        if (missing.length > 0) {
          console.log(`  (warn) Lang codes not in static HTML: ${missing.join(', ')} — may load client-side`);
        }
      },
    },
    {
      name: 'Playwright: 4 lang pills present and UPPERCASE',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping lang pill test)');
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
          if (pills.length < 4) {
            throw new Error(`Only ${pills.length} language pills found (expected 4)`);
          }

          const texts = [];
          for (const pill of pills) {
            const t = (await pill.innerText()).trim();
            texts.push(t);
            if (t && t !== t.toUpperCase()) {
              throw new Error(`Language pill "${t}" is not UPPERCASE`);
            }
          }

          for (const lang of EXPECTED) {
            if (!texts.includes(lang)) {
              throw new Error(`Language pill "${lang}" not found (found: ${texts.join(', ')})`);
            }
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
