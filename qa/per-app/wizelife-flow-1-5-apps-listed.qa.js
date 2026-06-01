#!/usr/bin/env node
// qa/per-app/wizelife-flow-1-5-apps-listed.qa.js
// Deep flow test added 2026-05-26 — verifies all 5 sub-app cards are present
// on the wizelife.ai portal with their URLs.

const BASE = 'https://wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

const APPS = [
  { name: 'WizeMoney', url: 'money.wizelife.ai' },
  { name: 'WizeTax', url: 'tax.wizelife.ai' },
  { name: 'WizeTravel', url: 'travel.wizelife.ai' },
  { name: 'WizeDeal', url: 'deal.wizelife.ai' },
  { name: 'WizeHealth', url: 'health.wizelife.ai' },
];

(async () => {
  await runSuite('WizeLife Portal / 5-apps-listed', [
    {
      name: 'portal page returns 200',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (r.status !== 200) throw new Error(`Portal returned ${r.status}`);
      },
    },
    {
      name: 'all 5 sub-app URLs in portal HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const missing = APPS.filter(app => !findInHtml(r.body, app.url));
        if (missing.length > 0) {
          throw new Error(`Missing app URLs: ${missing.map(a => a.url).join(', ')}`);
        }
      },
    },
    {
      name: 'Playwright: all 5 sub-app links rendered',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping app cards test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(3000);
          for (const app of APPS) {
            const link = await page.locator(`a[href*="${app.url}"]`).count();
            if (link === 0) {
              throw new Error(`No link to ${app.url} (${app.name}) in rendered portal`);
            }
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
