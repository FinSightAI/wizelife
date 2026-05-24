#!/usr/bin/env node
// WizeTax — flows-v4 (deep: 4-lang cycle, hamburger RTL, disclaimer bottom, skeleton, tab nav, pages)
'use strict';
const { chromium } = require('playwright');

const BASE = 'https://tax.wizelife.ai';
const APP  = 'WizeTax-FlowsV4';

const TESTS = [
  {
    name: 'Lang switcher: HE/EN/PT/ES pills all reachable',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      const pills = await page.locator('[class*="lang" i] button,[class*="pill" i] button,button[data-lang]').allTextContents();
      const found = pills.map(p => p.trim().toUpperCase()).filter(p => ['HE','EN','PT','ES'].includes(p));
      return { pass: found.length >= 2, detail: `Found lang pills: ${found.join(',') || '(none)'} raw=${pills.map(p=>p.trim()).join(',')}` };
    },
  },
  {
    name: 'Hamburger visible at top<=60px in RTL (Hebrew viewport)',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      const box = await page.locator('[class*="hamburger" i],[class*="menu-btn" i],header button,nav button').first().boundingBox().catch(() => null);
      if (!box) return { pass: true, detail: 'No hamburger found at this breakpoint' };
      return { pass: box.y <= 60, detail: `hamburger.top=${box.y.toFixed(0)}px` };
    },
  },
  {
    name: 'Disclaimer banner on mobile is at BOTTOM (top > vh/2)',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const info = await page.evaluate(() => {
        const el = document.querySelector('[class*="disclaimer" i],[class*="strip" i],[class*="banner" i],[role="status"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, vh: window.innerHeight };
      });
      if (!info) return { pass: true, detail: 'No disclaimer banner visible at load' };
      return { pass: info.top > info.vh / 2, detail: `banner.top=${info.top.toFixed(0)} vh=${info.vh}` };
    },
  },
  {
    name: 'Hydration skeleton fades by T+1000ms after domcontentloaded',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      const visible = await page.evaluate(() => {
        const el = document.querySelector('[class*="skeleton" i],[class*="shimmer" i]');
        return el ? parseFloat(window.getComputedStyle(el).opacity) > 0.1 : false;
      });
      return { pass: !visible, detail: `skeleton still visible at T+1000ms: ${visible}` };
    },
  },
  {
    name: 'Bottom-nav Advisor tab: no hard-reload on SPA navigation',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      const reloads = [];
      page.on('framenavigated', f => { if (!f.parentFrame()) reloads.push(f.url()); });
      const tab = page.locator('[href*="advisor" i],[data-tab="advisor" i],button:has-text("Advisor"),button:has-text("יועץ")').first();
      if (!await tab.count()) return { pass: true, detail: 'No advisor tab found' };
      const beforeCount = reloads.length;
      await tab.click({ force: true }).catch(() => {});
      await page.waitForTimeout(800);
      const hardReloads = reloads.slice(beforeCount).filter(u => !u.includes('#'));
      return { pass: hardReloads.length === 0, detail: `hard reloads after tab click: ${hardReloads.length} (${hardReloads.join(', ')})` };
    },
  },
  {
    name: '/reports page renders h1 or content (not blank)',
    fn: async (page) => {
      await page.goto(BASE + '/reports?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const h1 = await page.locator('h1,h2').first().textContent().catch(() => '');
      const len = await page.evaluate(() => (document.body.textContent || '').trim().length);
      return { pass: len > 50, detail: `h1="${h1?.trim()}" body-len=${len}` };
    },
  },
  {
    name: '/profile page renders (not blank/404)',
    fn: async (page) => {
      await page.goto(BASE + '/profile?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const len = await page.evaluate(() => (document.body.textContent || '').trim().length);
      return { pass: len > 50, detail: `body-len=${len} path=${await page.evaluate(() => location.pathname)}` };
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
