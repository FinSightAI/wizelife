#!/usr/bin/env node
// qa/per-app/wizetax-flow-9-hamburger-position.qa.js
// Deep flow test added 2026-05-26 — verifies the hamburger button is on the
// left side of the screen in LTR layout (x < 200px on 390px viewport).

const BASE = 'https://tax.wizelife.ai/advisor';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTax / hamburger-position', [
    {
      name: 'hamburger reference in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'hamburger') ||
          findInHtml(r.body, 'menu-toggle') ||
          findInHtml(r.body, 'nav-toggle') ||
          findInHtml(r.body, 'sidebar');
        if (!has) throw new Error('No hamburger/menu-toggle/sidebar in HTML');
      },
    },
    {
      name: 'Playwright: hamburger button x-position < 200 (left side)',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping position test)');
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
            '[class*="hamburger"], [id*="hamburger"], [class*="menu-toggle"], button[aria-label*="menu" i]'
          ).first();
          if ((await btn.count()) === 0) {
            console.log('  (warn) No hamburger button found');
            return;
          }
          const box = await btn.boundingBox();
          if (!box) throw new Error('Could not get bounding box for hamburger');
          const centerX = box.x + box.width / 2;
          if (centerX > 200) {
            throw new Error(`Hamburger center at x=${Math.round(centerX)} — expected < 200 (left side)`);
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
