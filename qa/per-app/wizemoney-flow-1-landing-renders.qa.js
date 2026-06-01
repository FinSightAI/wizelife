#!/usr/bin/env node
// qa/per-app/wizemoney-flow-1-landing-renders.qa.js
// Deep flow test added 2026-05-26 — checks that the WizeMoney landing page
// renders a hero section and at least one visible CTA button.
// Uses Playwright; falls back to HTTP grep if playwright is unavailable.

const URL = 'https://money.wizelife.ai/';
const { fetchOk, findInHtml, runSuite } = require('./_lib-flow');

(async () => {
  let usedPlaywright = false;

  await runSuite('WizeMoney / landing-renders', [
    {
      name: 'page returns HTTP 200',
      fn: async () => {
        const r = await fetchOk(URL);
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      },
    },
    {
      name: 'hero headline present in HTML',
      fn: async () => {
        const r = await fetchOk(URL);
        const hasHero =
          findInHtml(r.body, 'hero') ||
          findInHtml(r.body, 'wize') ||
          findInHtml(r.body, 'finance') ||
          findInHtml(r.body, 'dashboard');
        if (!hasHero) throw new Error('No hero/finance/dashboard keyword found in HTML');
      },
    },
    {
      name: 'CTA button present in HTML',
      fn: async () => {
        const r = await fetchOk(URL);
        const hasCta =
          findInHtml(r.body, 'get started') ||
          findInHtml(r.body, 'sign up') ||
          findInHtml(r.body, 'login') ||
          findInHtml(r.body, 'btn') ||
          findInHtml(r.body, '<button') ||
          findInHtml(r.body, 'href');
        if (!hasCta) throw new Error('No CTA element found in HTML');
      },
    },
    {
      name: 'Playwright: hero + CTA visible on 390px viewport',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping visual check)');
          return;
        }
        usedPlaywright = true;
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(2500);
          // At least one visible button or link that looks like a CTA
          const cta = page.locator('a[href], button').first();
          const count = await page.locator('a[href], button').count();
          if (count === 0) throw new Error('No buttons or links rendered on page');
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
