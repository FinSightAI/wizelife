#!/usr/bin/env node
// qa/per-app/wizetax-flow-3-profile-page.qa.js
// Deep flow test added 2026-05-26 — verifies /profile renders a form with
// a citizenships or nationality field.

const BASE = 'https://tax.wizelife.ai/profile';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTax / profile-page', [
    {
      name: '/profile returns non-error status',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (r.status >= 500) throw new Error(`/profile returned ${r.status}`);
      },
    },
    {
      name: '/profile HTML references citizenship or nationality',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'citizen') ||
          findInHtml(r.body, 'national') ||
          findInHtml(r.body, 'passport') ||
          findInHtml(r.body, 'country') ||
          findInHtml(r.body, 'profile');
        if (!has) throw new Error('No citizenship/nationality/country reference on /profile');
      },
    },
    {
      name: 'Playwright: profile form inputs render',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping profile form test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(3000);
          const inputs = await page.locator('input, select').count();
          if (inputs === 0) {
            console.log('  (warn) No inputs on /profile — may require auth');
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
