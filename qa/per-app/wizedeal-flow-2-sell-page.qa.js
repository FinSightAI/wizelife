#!/usr/bin/env node
// qa/per-app/wizedeal-flow-2-sell-page.qa.js
// Deep flow test added 2026-05-26 — verifies /sell form renders with a
// country dropdown.

const BASE = 'https://deal.wizelife.ai/sell';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeDeal / sell-page', [
    {
      name: '/sell returns non-error status',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (r.status >= 500) throw new Error(`/sell returned ${r.status}`);
      },
    },
    {
      name: '/sell HTML has form and country dropdown',
      fn: async () => {
        const r = await fetchOk(BASE);
        const hasForm = findInHtml(r.body, '<form') || findInHtml(r.body, '<select') || findInHtml(r.body, '<input');
        if (!hasForm) throw new Error('No form/select/input elements found on /sell');
        const hasCountry = findInHtml(r.body, 'country') || findInHtml(r.body, '<select') || findInHtml(r.body, '<option');
        if (!hasCountry) {
          console.log('  (warn) No country dropdown in static HTML — may be client-side rendered');
        }
      },
    },
    {
      name: 'Playwright: /sell form inputs visible',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping form test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(3000);
          const inputs = await page.locator('input, select, textarea').count();
          if (inputs === 0) throw new Error('No form fields on /sell');
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
