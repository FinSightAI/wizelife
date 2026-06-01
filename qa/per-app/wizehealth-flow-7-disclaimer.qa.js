#!/usr/bin/env node
// qa/per-app/wizehealth-flow-7-disclaimer.qa.js
// Deep flow test added 2026-05-26 — verifies a "Not medical advice" or
// equivalent disclaimer is visible on the page.

const BASE = 'https://health.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeHealth / disclaimer', [
    {
      name: 'medical disclaimer in HTML source',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'not medical advice') ||
          findInHtml(r.body, 'not a doctor') ||
          findInHtml(r.body, 'not professional advice') ||
          findInHtml(r.body, 'disclaimer') ||
          findInHtml(r.body, 'consult') ||
          findInHtml(r.body, 'medical professional') ||
          findInHtml(r.body, 'healthcare provider');
        if (!has) throw new Error('No medical disclaimer text found in HTML source');
      },
    },
    {
      name: 'Playwright: disclaimer visible in rendered page',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping disclaimer visibility test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForTimeout(3000);
          const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
          const has =
            text.includes('not medical advice') ||
            text.includes('not a doctor') ||
            text.includes('disclaimer') ||
            text.includes('consult') ||
            text.includes('healthcare provider');
          if (!has) throw new Error('No medical disclaimer text found in rendered page');
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
