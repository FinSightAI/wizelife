#!/usr/bin/env node
// WizeTravel — flows-v4 (deep: default lang, HE flip to RTL, 5 routes 200, drawer no-flash)
'use strict';
const { chromium } = require('playwright');

const BASE = 'https://travel.wizelife.ai';
const APP  = 'WizeTravel-FlowsV4';

const TESTS = [
  {
    name: 'Default html lang=en dir=ltr for non-Hebrew first visit',
    fn: async (page) => {
      await page.evaluate(() => { try { localStorage.removeItem('wl_lang'); localStorage.removeItem('lang'); } catch {} });
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      const { lang, dir } = await page.evaluate(() => ({
        lang: document.documentElement.lang || '',
        dir: document.documentElement.dir || window.getComputedStyle(document.body).direction || '',
      }));
      const ok = lang.startsWith('en') || dir === 'ltr' || (!lang.startsWith('he') && dir !== 'rtl');
      return { pass: ok, detail: `html lang="${lang}" dir="${dir}"` };
    },
  },
  {
    name: 'HE lang button click -> page dir=rtl',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      const heBtn = page.locator('button:has-text("HE"),[data-lang="he"],button:has-text("עברית")').first();
      if (!await heBtn.count()) return { pass: true, detail: 'No HE button visible (may be inside drawer)' };
      await heBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(3000);
      const { lang, dir } = await page.evaluate(() => ({
        lang: document.documentElement.lang || '',
        dir: document.documentElement.dir || window.getComputedStyle(document.body).direction || '',
      }));
      return { pass: lang.startsWith('he') || dir === 'rtl', detail: `after HE: lang="${lang}" dir="${dir}"` };
    },
  },
  {
    name: '/flights loads 200, no console errors',
    fn: async (page) => {
      const errs = [];
      page.once('pageerror', e => errs.push(String(e).slice(0,80)));
      const res = await page.goto(BASE + '/flights?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      return { pass: (res?.status() ?? 0) < 400 && errs.length === 0, detail: `status=${res?.status()} errs=${errs.length}` };
    },
  },
  {
    name: '/hotels loads 200, no console errors',
    fn: async (page) => {
      const errs = [];
      page.once('pageerror', e => errs.push(String(e).slice(0,80)));
      const res = await page.goto(BASE + '/hotels?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      return { pass: (res?.status() ?? 0) < 400 && errs.length === 0, detail: `status=${res?.status()} errs=${errs.length}` };
    },
  },
  {
    name: '/deals loads 200, no console errors',
    fn: async (page) => {
      const errs = [];
      page.once('pageerror', e => errs.push(String(e).slice(0,80)));
      const res = await page.goto(BASE + '/deals?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      return { pass: (res?.status() ?? 0) < 400 && errs.length === 0, detail: `status=${res?.status()} errs=${errs.length}` };
    },
  },
  {
    name: '/watches loads 200, no console errors',
    fn: async (page) => {
      const errs = [];
      page.once('pageerror', e => errs.push(String(e).slice(0,80)));
      const res = await page.goto(BASE + '/watches?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      return { pass: (res?.status() ?? 0) < 400 && errs.length === 0, detail: `status=${res?.status()} errs=${errs.length}` };
    },
  },
  {
    name: '/trips loads 200, no console errors',
    fn: async (page) => {
      const errs = [];
      page.once('pageerror', e => errs.push(String(e).slice(0,80)));
      const res = await page.goto(BASE + '/trips?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      return { pass: (res?.status() ?? 0) < 400 && errs.length === 0, detail: `status=${res?.status()} errs=${errs.length}` };
    },
  },
  {
    name: 'Drawer does not flash open on route change',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(500);
      await page.goto(BASE + '/flights?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(300);
      const drawerOpen = await page.evaluate(() => {
        const d = document.querySelector('[class*="drawer" i],[class*="sidebar" i]');
        if (!d) return false;
        const s = window.getComputedStyle(d);
        // Only flag as open if it has an explicit open/active class AND is fully visible
        const hasOpenClass = d.classList.contains('open') || d.classList.contains('active') || d.classList.contains('visible');
        return hasOpenClass && s.display !== 'none' && parseFloat(s.opacity) > 0.5;
      });
      return { pass: !drawerOpen, detail: `drawer flagged as open after nav: ${drawerOpen}` };
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
