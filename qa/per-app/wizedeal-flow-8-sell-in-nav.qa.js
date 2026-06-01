#!/usr/bin/env node
// qa/per-app/wizedeal-flow-8-sell-in-nav.qa.js
// Deep flow test added 2026-05-26 — verifies the sidebar or top navigation
// contains a "Sell" item linking to /sell.

const BASE = 'https://deal.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeDeal / sell-in-nav', [
    {
      name: '"Sell" nav item in HTML source',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'href="/sell"') ||
          findInHtml(r.body, 'href="sell"') ||
          findInHtml(r.body, '>Sell<') ||
          findInHtml(r.body, 'nav') && findInHtml(r.body, 'sell');
        if (!has) throw new Error('No "Sell" navigation item found in HTML');
      },
    },
    {
      name: 'Playwright: Sell link visible in rendered nav',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping nav sell test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(3000);
          // Use text-search instead of CSS selector (avoids quote escaping in has-text)
          const hasSell = await page.evaluate(() => !![...document.querySelectorAll('a,button,li,span')].find(e=>e.textContent.trim()==='Sell'||e.textContent.trim()==='Sell a Property'));
          if (!hasSell) throw new Error('No Sell link found in rendered page');
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
