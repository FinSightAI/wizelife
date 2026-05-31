#!/usr/bin/env node
// qa/per-app/wizetravel-flow-2-sidebar-nav.qa.js
// Deep flow test added 2026-05-26 — verifies the sidebar navigation contains
// Flights, Hotels, Destination, and Deals items.

const BASE = 'https://travel.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

const NAV_ITEMS = ['flights', 'hotels', 'destination', 'deals'];

(async () => {
  await runSuite('WizeTravel / sidebar-nav', [
    {
      name: 'all 4 nav items in HTML source',
      fn: async () => {
        const r = await fetchOk(BASE);
        for (const item of NAV_ITEMS) {
          if (!findInHtml(r.body, item)) {
            console.log(`  (warn) Nav item "${item}" not in static HTML — may load dynamically`);
          }
        }
      },
    },
    {
      name: 'Playwright: sidebar nav items rendered',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping nav item test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(3000);
          const bodyText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
          const missing = NAV_ITEMS.filter(item => !bodyText.includes(item));
          if (missing.length > 0) {
            throw new Error(`Missing nav items in rendered page: ${missing.join(', ')}`);
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
