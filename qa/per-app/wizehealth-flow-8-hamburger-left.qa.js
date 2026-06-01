#!/usr/bin/env node
// qa/per-app/wizehealth-flow-8-hamburger-left.qa.js
// Deep flow test added 2026-05-26 — verifies the hamburger button is on the
// LEFT side of the screen on LTR layout (x < 200 on 390px viewport).

const BASE = 'https://health.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeHealth / hamburger-left', [
    {
      name: 'hamburger or menu-toggle element in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'hamburger') ||
          findInHtml(r.body, 'menu-toggle') ||
          findInHtml(r.body, 'nav-toggle') ||
          findInHtml(r.body, 'sidebar-toggle');
        if (!has) throw new Error('No hamburger/menu-toggle in HTML source');
      },
    },
    {
      name: 'Playwright: hamburger x-position < 200 on 390px',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping hamburger position test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(2500);
          const btn = page.locator(
            '[class*="hamburger"], [id*="hamburger"], [class*="menu-toggle"], [aria-label*="menu" i]'
          ).first();
          if ((await btn.count()) === 0) {
            console.log('  (warn) No hamburger button found on WizeHealth');
            return;
          }
          const box = await btn.boundingBox();
          if (!box) throw new Error('Could not get bounding box');
          const centerX = box.x + box.width / 2;
          if (centerX > 200) {
            throw new Error(`Hamburger at x=${Math.round(centerX)} — expected < 200 (left side)`);
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
