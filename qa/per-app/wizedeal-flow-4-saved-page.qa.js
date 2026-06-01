#!/usr/bin/env node
// qa/per-app/wizedeal-flow-4-saved-page.qa.js
// Deep flow test added 2026-05-26 — verifies /saved page renders (even empty
// state) and does not 500 error.

const BASE = 'https://deal.wizelife.ai/saved';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeDeal / saved-page', [
    {
      name: '/saved returns non-500 status',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (r.status >= 500) throw new Error(`/saved returned server error: ${r.status}`);
      },
    },
    {
      name: '/saved HTML has some meaningful content',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (r.body.length < 200) throw new Error('/saved returned near-empty body');
        const hasContent =
          findInHtml(r.body, 'saved') ||
          findInHtml(r.body, 'deal') ||
          findInHtml(r.body, '<div') ||
          findInHtml(r.body, '<main');
        if (!hasContent) throw new Error('No meaningful content on /saved page');
      },
    },
    {
      name: 'Playwright: /saved renders without crash',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping /saved render test)');
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
          await page.waitForTimeout(2500);
          const fatal = jsErrors.filter(e => !e.toLowerCase().includes('firebase'));
          if (fatal.length > 0) throw new Error('JS errors on /saved: ' + fatal.slice(0, 2).join('; '));
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
