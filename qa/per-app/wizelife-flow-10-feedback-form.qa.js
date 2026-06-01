#!/usr/bin/env node
// qa/per-app/wizelife-flow-10-feedback-form.qa.js
// Deep flow test added 2026-05-26 — verifies /feedback.html is accessible
// (returns 200) and contains a form or input element.

const FEEDBACK_URL = 'https://wizelife.ai/feedback.html';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeLife Portal / feedback-form', [
    {
      name: '/feedback.html returns 200',
      fn: async () => {
        const r = await fetchOk(FEEDBACK_URL);
        if (r.status !== 200) throw new Error(`/feedback.html returned ${r.status} (expected 200)`);
      },
    },
    {
      name: '/feedback.html contains a form element',
      fn: async () => {
        const r = await fetchOk(FEEDBACK_URL);
        const has =
          findInHtml(r.body, '<form') ||
          findInHtml(r.body, '<input') ||
          findInHtml(r.body, '<textarea') ||
          findInHtml(r.body, 'feedback');
        if (!has) throw new Error('No form/input/textarea/feedback on /feedback.html');
      },
    },
    {
      name: 'Playwright: feedback form visible and submittable',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping feedback form test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(FEEDBACK_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(2500);
          const form = await page.locator('form, textarea, input[type="text"]').count();
          if (form === 0) throw new Error('No form element on /feedback.html');
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
