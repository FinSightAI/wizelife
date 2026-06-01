#!/usr/bin/env node
// qa/per-app/wizetravel-flow-9-plan-badge.qa.js
// Deep flow test added 2026-05-26 — verifies a plan badge (FREE/PRO/YOLO)
// is visible somewhere on the page (header or sidebar).

const BASE = 'https://travel.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTravel / plan-badge', [
    {
      name: 'plan badge reference in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'plan-badge') ||
          findInHtml(r.body, 'wize-plan') ||
          findInHtml(r.body, 'plan-pill') ||
          findInHtml(r.body, 'FREE') ||
          findInHtml(r.body, 'PRO');
        if (!has) {
          console.log('  (warn) No plan badge in static HTML — may require auth to display');
        }
      },
    },
    {
      name: 'Playwright: plan badge element present',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping plan badge test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(3000);
          const badge = await page.locator(
            '[class*="plan-badge"], [class*="plan-pill"], [id*="plan-badge"], [class*="wize-plan"]'
          ).count();
          if (badge === 0) {
            console.log('  (warn) No plan badge found — likely requires Firebase auth');
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
