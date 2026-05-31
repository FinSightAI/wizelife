#!/usr/bin/env node
// qa/per-app/wizetravel-flow-4-hamburger-mobile.qa.js
// Deep flow test added 2026-05-26 — verifies hamburger button is visible on
// 390px viewport (mobile).

const BASE = 'https://travel.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTravel / hamburger-mobile', [
    {
      name: 'hamburger element referenced in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'hamburger') ||
          findInHtml(r.body, 'menu-toggle') ||
          findInHtml(r.body, 'wize-hamburger') ||
          findInHtml(r.body, 'nav-toggle');
        if (!has) throw new Error('No hamburger/menu-toggle/nav-toggle in HTML');
      },
    },
    {
      name: 'Playwright: hamburger visible on 390px',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping hamburger visibility test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(2500);
          const btn = page.locator(
            '[class*="hamburger"], [id*="hamburger"], [class*="menu-toggle"], [aria-label*="menu" i]'
          ).first();
          if ((await btn.count()) === 0) throw new Error('No hamburger button found on mobile viewport');
          const visible = await btn.isVisible();
          if (!visible) throw new Error('Hamburger button exists but is not visible on 390px');
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
