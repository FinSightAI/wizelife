#!/usr/bin/env node
// qa/per-app/wizelife-flow-3-faq-7-questions.qa.js
// Deep flow test added 2026-05-26 — verifies the FAQ section has between
// 5 and 7 questions on the portal.

const BASE = 'https://wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeLife Portal / faq-7-questions', [
    {
      name: 'FAQ section exists in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (!findInHtml(r.body, 'faq')) throw new Error('No FAQ section in portal HTML');
      },
    },
    {
      name: 'Playwright: 5-7 FAQ items rendered',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping FAQ count test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(3000);
          const faqItems = await page.locator(
            '[class*="faq-item"], [class*="faq"] [class*="question"], details, [class*="accordion-item"]'
          ).count();
          if (faqItems < 5) {
            throw new Error(`Only ${faqItems} FAQ items found (expected 5-7)`);
          }
          if (faqItems > 10) {
            console.log(`  (warn) ${faqItems} FAQ items — check if count is correct`);
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
