#!/usr/bin/env node
// qa/per-app/wizehealth-flow-3-upload-button.qa.js
// Deep flow test added 2026-05-26 — verifies the file upload button has an
// aria-label for accessibility.

const BASE = 'https://health.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeHealth / upload-button', [
    {
      name: 'file upload element referenced in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'upload') ||
          findInHtml(r.body, 'file') ||
          findInHtml(r.body, 'type="file"') ||
          findInHtml(r.body, 'attachment');
        if (!has) throw new Error('No upload/file/attachment reference in HTML');
      },
    },
    {
      name: 'Playwright: upload button has aria-label',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping aria-label test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForTimeout(3000);

          // Check all file inputs and upload buttons for aria-label
          const uploadBtns = await page.locator(
            'input[type="file"], [class*="upload"], button[aria-label*="upload" i], label[for*="file"]'
          ).all();

          if (uploadBtns.length === 0) {
            console.log('  (warn) No upload button found — may require auth');
            return;
          }

          let hasAriaLabel = false;
          for (const btn of uploadBtns) {
            const label = await btn.getAttribute('aria-label');
            if (label) { hasAriaLabel = true; break; }
          }
          if (!hasAriaLabel) {
            throw new Error('Upload button(s) found but none have aria-label — accessibility issue');
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
