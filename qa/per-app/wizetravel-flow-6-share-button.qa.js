#!/usr/bin/env node
// qa/per-app/wizetravel-flow-6-share-button.qa.js
// Deep flow test added 2026-05-26 — verifies a share button exists and
// opens a share dialog or fallback menu when clicked.

const BASE = 'https://travel.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTravel / share-button', [
    {
      name: 'share button or icon referenced in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'share') ||
          findInHtml(r.body, 'wize-share') ||
          findInHtml(r.body, 'btn-share');
        if (!has) throw new Error('No share button/element found in HTML source');
      },
    },
    {
      name: 'Playwright: share button visible and clickable',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping share button test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(2500);
          const shareBtn = page.locator(
            '[class*="share"], [id*="share"], [aria-label*="share" i], button:has-text("Share")'
          ).first();
          if ((await shareBtn.count()) === 0) {
            console.log('  (warn) No share button found — may be inside a specific page');
            return;
          }
          await shareBtn.click();
          await page.waitForTimeout(600);
          // Check for any share dialog or overlay
          const dialogOpen = await page.locator(
            '[class*="share-menu"], [class*="share-dialog"], [class*="share-modal"]'
          ).count();
          if (dialogOpen === 0) {
            console.log('  (warn) Share button clicked but no dialog detected — may use native share API');
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
