#!/usr/bin/env node
// qa/per-app/wizelife-flow-2-pricing-3-tiers.qa.js
// Deep flow test added 2026-05-26 — verifies Free, Pro, and YOLO pricing
// cards are visible on the wizelife.ai portal.

const BASE = 'https://wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeLife Portal / pricing-3-tiers', [
    {
      name: 'Free tier in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (!findInHtml(r.body, 'free')) throw new Error('"Free" tier not found in portal HTML');
      },
    },
    {
      name: 'Pro tier in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (!findInHtml(r.body, 'pro')) throw new Error('"Pro" tier not found in portal HTML');
      },
    },
    {
      name: 'YOLO tier in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (!findInHtml(r.body, 'yolo')) throw new Error('"YOLO" tier not found in portal HTML');
      },
    },
    {
      name: 'Playwright: 3 pricing tier cards visible',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping pricing cards test)');
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
          const tiers = ['free', 'pro', 'yolo'].filter(t => bodyText.includes(t));
          if (tiers.length < 3) {
            throw new Error(`Only ${tiers.length}/3 pricing tiers visible: ${tiers.join(', ')}`);
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
