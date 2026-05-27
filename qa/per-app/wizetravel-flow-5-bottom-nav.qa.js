#!/usr/bin/env node
// qa/per-app/wizetravel-flow-5-bottom-nav.qa.js
// Deep flow test added 2026-05-26 — verifies the bottom navigation bar is
// present and visible on mobile (390px viewport).

const BASE = 'https://travel.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTravel / bottom-nav', [
    {
      name: 'bottom-nav element in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'bottom-nav') ||
          findInHtml(r.body, 'wize-bottom-nav') ||
          findInHtml(r.body, 'bottom-bar') ||
          findInHtml(r.body, 'nav-bottom');
        if (!has) throw new Error('No bottom-nav element found in HTML source');
      },
    },
    {
      name: 'Playwright: bottom nav visible on 390px',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping bottom nav test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(2500);
          const nav = page.locator('[class*="bottom-nav"], [id*="bottom-nav"], [class*="bottom-bar"]').first();
          if ((await nav.count()) === 0) throw new Error('Bottom nav element not found');
          const visible = await nav.isVisible();
          if (!visible) throw new Error('Bottom nav found but not visible on mobile viewport');
          const box = await nav.boundingBox();
          if (box && box.y < 700) {
            console.log(`  (warn) Bottom nav y=${Math.round(box.y)} — may not be pinned to bottom`);
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
