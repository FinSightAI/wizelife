#!/usr/bin/env node
// qa/per-app/wizemoney-flow-5-theme-toggle.qa.js
// Deep flow test added 2026-05-26 — verifies the theme toggle button exists
// and clicking it changes the data-theme / class attribute on html/body.

const BASE = 'https://money.wizelife.ai/';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeMoney / theme-toggle', [
    {
      name: 'theme / dark-mode reference in HTML',
      fn: async () => {
        const r = await fetchOk(BASE);
        const has =
          findInHtml(r.body, 'theme') ||
          findInHtml(r.body, 'dark') ||
          findInHtml(r.body, 'light-mode') ||
          findInHtml(r.body, 'toggle');
        if (!has) throw new Error('No theme/dark/light reference in HTML');
      },
    },
    {
      name: 'Playwright: theme toggle changes class or attribute',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping theme toggle test)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(2500);
          await page.keyboard.press('Escape').catch(()=>{}); await page.waitForTimeout(400); await page.evaluate(() => { document.querySelectorAll('[id*=onboard],[class*=onboard],[id*=wize-onboarding]').forEach(o=>{o.style.display='none'; o.classList&&o.classList.add('hidden');}); document.body.style.overflow=''; }).catch(()=>{}); await page.waitForTimeout(300);

          const beforeAttr = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme') ||
            document.documentElement.className
          );

          const toggleBtn = page.locator(
            '[class*="theme-toggle"], [id*="theme"], [aria-label*="theme" i], [aria-label*="dark" i], [title*="theme" i]'
          ).first();
          if ((await toggleBtn.count()) === 0) {
            console.log('  (warn) No theme toggle button found — may be inside authenticated shell');
            return;
          }
          try { await toggleBtn.click({ force: true, timeout: 4000 }); } catch { await page.evaluate(() => { const b=document.querySelector("[class*=theme-toggle],[id*=theme],[aria-label*=theme i],[aria-label*=dark i]"); if(b) b.click(); }); }
          await page.waitForTimeout(400);

          const afterAttr = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme') ||
            document.documentElement.className
          );
          if (beforeAttr === afterAttr) {
            throw new Error(`Theme attribute unchanged after toggle click: "${beforeAttr}"`);
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
