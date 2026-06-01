#!/usr/bin/env node
// qa/per-app/wizehealth-flow-1-landing-renders.qa.js
// Deep flow test added 2026-05-26 — verifies WizeHealth landing page returns
// 200 and contains health-related content.

const BASE = 'https://health.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeHealth / landing-renders', [
    {
      name: 'landing page returns HTTP 200',
      fn: async () => {
        const r = await fetchOk(BASE);
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      },
    },
    {
      name: 'health-related content in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'health') ||
          findInHtml(r.body, 'vitara') ||
          findInHtml(r.body, 'medical') ||
          findInHtml(r.body, 'wize');
        if (!has) throw new Error('No health/vitara/medical/wize content in HTML');
      },
    },
    {
      name: 'Playwright: page renders with content on 390px',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping render check)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForTimeout(3000);
          const body = await page.evaluate(() => document.body.innerText);
          if (body.trim().length < 50) throw new Error('Page rendered with very little text content');
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
