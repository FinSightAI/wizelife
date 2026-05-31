#!/usr/bin/env node
// qa/per-app/wizehealth-flow-2-chat-input.qa.js
// Deep flow test added 2026-05-26 — verifies the chat input field is visible
// on the WizeHealth landing page.

const BASE = 'https://health.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeHealth / chat-input', [
    {
      name: 'chat input reference in HTML source',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'chat') ||
          findInHtml(r.body, 'input') ||
          findInHtml(r.body, 'textarea') ||
          findInHtml(r.body, 'message');
        if (!has) throw new Error('No chat/input/textarea/message in HTML source');
      },
    },
    {
      name: 'Playwright: chat input visible on page',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping chat input test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(3000);
          const chatInput = page.locator(
            'input[type="text"], textarea, [class*="chat-input"], [id*="chat-input"], [placeholder*="message" i], [placeholder*="ask" i]'
          ).first();
          if ((await chatInput.count()) === 0) throw new Error('No chat input element found');
          const visible = await chatInput.isVisible();
          if (!visible) throw new Error('Chat input found but not visible');
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
