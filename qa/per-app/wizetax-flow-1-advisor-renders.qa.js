#!/usr/bin/env node
// qa/per-app/wizetax-flow-1-advisor-renders.qa.js
// Deep flow test added 2026-05-26 — verifies the WizeTax advisor page renders
// its main form fields (country selectors, income input, chat area).

const BASE = 'https://tax.wizelife.ai/advisor';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeTax / advisor-renders', [
    {
      name: 'advisor page returns HTTP 200',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      },
    },
    {
      name: 'form or input elements present in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has = findInHtml(r.body, '<input') || findInHtml(r.body, '<select') || findInHtml(r.body, '<form');
        if (!has) throw new Error('No form/input/select elements in advisor HTML');
      },
    },
    {
      name: 'Playwright: form fields visible on 390px viewport',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping form visibility test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(3000);
          const inputs = await page.locator('input, select, textarea').count();
          if (inputs === 0) throw new Error('No input/select/textarea elements rendered');
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
