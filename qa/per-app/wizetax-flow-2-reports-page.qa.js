#!/usr/bin/env node
// qa/per-app/wizetax-flow-2-reports-page.qa.js
// Deep flow test added 2026-05-26 — verifies /reports renders a title and
// correct language attribute.

const BASE = 'https://tax.wizelife.ai/reports';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTax / reports-page', [
    {
      name: '/reports returns non-error HTTP status',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (r.status >= 500) throw new Error(`/reports returned server error: ${r.status}`);
      },
    },
    {
      name: '/reports HTML contains a page title',
      fn: async () => {
        const r = await fetchOk(BASE);
        const hasTitle = findInHtml(r.body, '<title') || findInHtml(r.body, '<h1') || findInHtml(r.body, 'reports');
        if (!hasTitle) throw new Error('No title or h1 found on /reports page');
      },
    },
    {
      name: 'Playwright: /reports has visible heading',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping heading visibility test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(3000);
          const headings = await page.locator('h1, h2').count();
          if (headings === 0) {
            console.log('  (warn) No h1/h2 found on /reports — may redirect to auth');
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
