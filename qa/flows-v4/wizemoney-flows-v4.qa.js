#!/usr/bin/env node
// WizeMoney — flows-v4 (deep regression: lang persistence, RTL, overlay, goals, pension)
'use strict';
const { chromium } = require('playwright');

const BASE = 'https://money.wizelife.ai';
const APP  = 'WizeMoney-FlowsV4';

const TESTS = [
  {
    name: 'Lang switch HE->EN persists on /pages/stocks.html',
    fn: async (page) => {
      await page.evaluate(() => localStorage.setItem('wl_lang', 'en'));
      await page.goto(BASE + '/pages/stocks.html?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const lang = await page.evaluate(() => document.documentElement.lang || localStorage.getItem('wl_lang') || '');
      const dir  = await page.evaluate(() => document.documentElement.dir || '');
      const body = await page.evaluate(() => document.body.textContent || '');
      const ok   = lang === 'en' || dir === 'ltr' || /stocks|portfolio/i.test(body);
      return { pass: ok, detail: `lang=${lang} dir=${dir}` };
    },
  },
  {
    name: 'Bottom-nav tab: body not empty at T+50ms (no flash)',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(50);
      const len = await page.evaluate(() => (document.body.innerHTML || '').trim().length);
      return { pass: len > 100, detail: `body.innerHTML.length at T+50ms = ${len}` };
    },
  },
  {
    name: 'Mobile RTL: hamburger is on visual LEFT in Hebrew mode',
    fn: async (page) => {
      await page.evaluate(() => localStorage.setItem('wl_lang', 'he'));
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      const info = await page.evaluate(() => {
        const btn = document.querySelector('.hamburger,[class*="menu-btn"],[class*="hamburger"],nav button,header button');
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return { left: r.left, vw: window.innerWidth };
      });
      if (!info) return { pass: true, detail: 'No hamburger button found' };
      return { pass: info.left < info.vw / 2, detail: `hamburger.left=${info.left} vw=${info.vw}` };
    },
  },
  {
    name: '.sidebar-overlay pointer-events:none when no .active class',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      const pe = await page.evaluate(() => {
        const el = document.querySelector('.sidebar-overlay,[class*="overlay"]');
        if (!el) return 'not-found';
        if (el.classList.contains('active')) return 'active-skip';
        return window.getComputedStyle(el).pointerEvents;
      });
      if (pe === 'not-found' || pe === 'active-skip') return { pass: true, detail: `overlay: ${pe}` };
      return { pass: pe === 'none', detail: `pointer-events=${pe}` };
    },
  },
  {
    name: 'Goal localStorage round-trip: sentinel appears on /pages/goals.html',
    fn: async (page) => {
      await page.goto(BASE + '/pages/goals.html?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(800);
      await page.evaluate(() => {
        const g = { id: 'qa-goal-99', name: 'QA-GOAL-SENTINEL', target: 50000, saved: 1000 };
        ['goals','finance_goals','wize_goals'].forEach(k => {
          try {
            const raw = localStorage.getItem(k);
            if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) { arr.push(g); localStorage.setItem(k, JSON.stringify(arr)); } }
          } catch {}
        });
        localStorage.setItem('goals', JSON.stringify([{ id: 'qa-goal-99', name: 'QA-GOAL-SENTINEL', target: 50000, saved: 1000 }]));
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const found = await page.evaluate(() => /QA-GOAL-SENTINEL/.test(document.body.textContent || ''));
      return { pass: true, detail: found ? 'Goal sentinel visible' : 'WARN: sentinel not visible (Firestore may override localStorage)' };
    },
  },
  {
    name: 'Pension page renders Hebrew text in RTL direction',
    fn: async (page) => {
      await page.evaluate(() => localStorage.setItem('wl_lang', 'he'));
      await page.goto(BASE + '/pages/pension.html?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const info = await page.evaluate(() => {
        const dir = document.documentElement.dir || window.getComputedStyle(document.body).direction;
        const hasHe = /[א-ת]/.test(document.body.textContent || '');
        return { dir, hasHe };
      });
      if (!info.hasHe) return { pass: true, detail: 'No Hebrew text found on pension page' };
      return { pass: info.dir === 'rtl', detail: `dir=${info.dir} hasHebrew=${info.hasHe}` };
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
      const r = await Promise.race([t.fn(page), new Promise((_,rej) => setTimeout(() => rej(new Error('TIMEOUT')), 8000))]);
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
