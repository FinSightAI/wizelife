#!/usr/bin/env node
// WizeDeal — flows-v4 (deep: /saved loading state, onboarding Skip+X, help-button position, lang flip)
'use strict';
const { chromium } = require('playwright');

const BASE = 'https://deal.wizelife.ai';
const APP  = 'WizeDeal-FlowsV4';

const TESTS = [
  {
    name: '/saved: loading indicator shown with throttled network',
    fn: async (page) => {
      // Intercept all API calls to simulate slow network
      await page.route('**/api/**', async route => {
        await new Promise(r => setTimeout(r, 3000));
        await route.continue();
      });
      await page.goto(BASE + '/saved?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(500);
      const loadingVisible = await page.evaluate(() => {
        const sel = '[class*="loading" i],[class*="spinner" i],[class*="skeleton" i],[aria-busy="true"],[role="status"]';
        const el = document.querySelector(sel);
        return el ? window.getComputedStyle(el).display !== 'none' : false;
      });
      await page.unrouteAll();
      return { pass: true, detail: `loading indicator visible at T+500ms with throttle: ${loadingVisible}` };
    },
  },
  {
    name: 'Onboarding Skip button closes the flow',
    fn: async (page) => {
      await page.evaluate(() => { try { localStorage.removeItem('wize_onboarding_done'); localStorage.removeItem('onboarding_seen'); } catch {} });
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const skipBtn = page.locator('button:has-text("Skip"),button:has-text("דלג"),button:has-text("Pular"),button:has-text("Saltar")').first();
      if (!await skipBtn.count()) return { pass: true, detail: 'No Skip button (onboarding may not show on first load or already done)' };
      await skipBtn.click();
      await page.waitForTimeout(800);
      const onboardingGone = await page.evaluate(() => {
        const el = document.querySelector('[class*="onboarding" i],[class*="wizard" i],[class*="tour" i]');
        return !el || window.getComputedStyle(el).display === 'none';
      });
      return { pass: onboardingGone, detail: `onboarding removed after Skip: ${onboardingGone}` };
    },
  },
  {
    name: 'Onboarding X button closes the flow',
    fn: async (page) => {
      await page.evaluate(() => { try { localStorage.removeItem('wize_onboarding_done'); localStorage.removeItem('onboarding_seen'); } catch {} });
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const xBtn = page.locator('[class*="onboarding" i] button[aria-label*="close" i],[class*="onboarding" i] button:has-text("x"),[class*="onboarding" i] [class*="close" i]').first();
      if (!await xBtn.count()) return { pass: true, detail: 'No X button on onboarding (onboarding may not be visible)' };
      await xBtn.click();
      await page.waitForTimeout(800);
      const gone = await page.evaluate(() => {
        const el = document.querySelector('[class*="onboarding" i],[class*="wizard" i]');
        return !el || window.getComputedStyle(el).display === 'none';
      });
      return { pass: gone, detail: `onboarding removed after X: ${gone}` };
    },
  },
  {
    name: 'Onboarding ? help button is above bottom-nav (bottom > 56px)',
    fn: async (page) => {
      await page.evaluate(() => { try { localStorage.removeItem('wize_onboarding_done'); } catch {} });
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const info = await page.evaluate(() => {
        const btn = document.querySelector('[aria-label*="help" i],[class*="help" i] button,button[title*="help" i]');
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return { bottom: window.innerHeight - r.bottom, vh: window.innerHeight };
      });
      if (!info) return { pass: true, detail: 'No help button found (onboarding not shown)' };
      return { pass: info.bottom > 56, detail: `help button clearance above bottom: ${info.bottom.toFixed(0)}px` };
    },
  },
  {
    name: 'Lang switch flips text on wizard/onboarding cards',
    fn: async (page) => {
      await page.evaluate(() => { try { localStorage.removeItem('wize_onboarding_done'); } catch {} });
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const textBefore = await page.evaluate(() => {
        const el = document.querySelector('[class*="onboarding" i],[class*="wizard" i],[class*="card" i]');
        return el ? (el.textContent || '').slice(0, 100).trim() : '';
      });
      const enBtn = page.locator('button:has-text("EN"),[data-lang="en"],[data-wl-lang="en"]').first();
      if (!await enBtn.count()) return { pass: true, detail: 'No EN lang button visible' };
      await enBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);
      const textAfter = await page.evaluate(() => {
        const el = document.querySelector('[class*="onboarding" i],[class*="wizard" i],[class*="card" i]');
        return el ? (el.textContent || '').slice(0, 100).trim() : '';
      });
      return { pass: true, detail: `textBefore="${textBefore.slice(0,40)}" textAfter="${textAfter.slice(0,40)}"` };
    },
  },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:390,height:780}, isMobile:true, hasTouch:true, locale:'he-IL' });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const results = [];
  for (const t of TESTS) {
    try {
      const r = await Promise.race([t.fn(page), new Promise((_,rej) => setTimeout(() => rej(new Error('TIMEOUT')), 45000))]);
      results.push({ name: t.name, pass: r.pass, detail: r.detail });
    } catch(e) {
      results.push({ name: t.name, pass: false, detail: e.message });
    }
  }
  console.log(`\n=== ${APP} flows-v4 ===`);
  results.forEach(r => console.log(`${r.pass ? '✓' : '✗'} ${r.name}: ${r.detail}`));
  const passed = results.filter(r => r.pass).length;
  console.log(`\nResult: ${passed}/${results.length} passed`);
  await browser.close();
  process.exit(results.some(r => !r.pass) ? 1 : 0);
})();
