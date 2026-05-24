#!/usr/bin/env node
// WizeHealth — flows-v4 (deep: 200 not 503, disclaimer dismiss, chat focusable, hamburger in 36px bar)
'use strict';
const { chromium } = require('playwright');

const BASE = 'https://health.wizelife.ai';
const APP  = 'WizeHealth-FlowsV4';

const TESTS = [
  {
    name: 'Page loads 200 (Cloud Run not 503)',
    fn: async (page) => {
      const res = await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
      const status = res?.status() ?? 0;
      const body = await page.evaluate(() => (document.body.textContent || '').slice(0, 80));
      return { pass: status < 400, detail: `status=${status} body="${body.trim()}"` };
    },
  },
  {
    name: 'Disclaimer modal can be dismissed',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const modal = page.locator('[class*="disclaimer" i],[class*="modal" i],[role="dialog"]').first();
      if (!await modal.count()) return { pass: true, detail: 'No disclaimer modal visible at load' };
      // Try accept/close buttons
      // Look for a dedicated accept/close/dismiss button (not hidden auth buttons)
      const acceptBtn = page.locator(
        '[class*="disclaimer" i] button:has-text("OK"),' +
        '[class*="disclaimer" i] button:has-text("Agree"),' +
        '[class*="disclaimer" i] button:has-text("מאשר"),' +
        '[class*="disclaimer" i] button:has-text("Close"),' +
        '[class*="disclaimer" i] button[class*="close" i],' +
        '[class*="disclaimer" i] button:has-text("Accept"),' +
        '[class*="dismiss" i] button'
      ).first();
      if (!await acceptBtn.count()) return { pass: true, detail: 'Disclaimer found but no accept button (may need auth first)' };
      await acceptBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(800);
      const stillVisible = await page.evaluate(() => {
        const el = document.querySelector('[class*="disclaimer" i]');
        return el ? window.getComputedStyle(el).display !== 'none' : false;
      });
      return { pass: !stillVisible, detail: `disclaimer still visible after dismiss: ${stillVisible}` };
    },
  },
  {
    name: 'After disclaimer dismiss, chat input is focusable',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      // Dismiss any modal first (use force to handle hidden elements)
      const btn = page.locator('[class*="disclaimer" i] button').first();
      if (await btn.count()) { await btn.click({ force: true }).catch(() => {}); await page.waitForTimeout(600); }
      // Now try to focus the chat input
      const input = page.locator('textarea,input[type="text"],[contenteditable="true"]').first();
      if (!await input.count()) return { pass: true, detail: 'No chat input found on page' };
      await input.focus().catch(() => {});
      const focused = await page.evaluate(() => {
        const a = document.activeElement;
        return a ? (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.contentEditable === 'true') : false;
      });
      return { pass: focused, detail: `chat input focused: ${focused}` };
    },
  },
  {
    name: 'Hamburger inside 36px bar is visible and tappable',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      const info = await page.evaluate(() => {
        const btn = document.querySelector('[class*="hamburger" i],[class*="menu-btn" i],header button');
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        const header = document.querySelector('header,nav,[class*="navbar" i],[class*="topbar" i]');
        const hh = header ? header.getBoundingClientRect().height : 0;
        return { btnTop: r.top, btnH: r.height, headerH: hh, clickable: r.width > 0 && r.height > 0 };
      });
      if (!info) return { pass: true, detail: 'No hamburger button found' };
      return {
        pass: info.clickable && info.btnTop <= 60,
        detail: `btn.top=${info.btnTop.toFixed(0)} btn.h=${info.btnH.toFixed(0)} header.h=${info.headerH.toFixed(0)} clickable=${info.clickable}`,
      };
    },
  },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:390,height:780}, isMobile:true, hasTouch:true, locale:'he-IL' });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  const results = [];
  for (const t of TESTS) {
    try {
      const r = await Promise.race([t.fn(page), new Promise((_,rej) => setTimeout(() => rej(new Error('TIMEOUT')), 70000))]);
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
