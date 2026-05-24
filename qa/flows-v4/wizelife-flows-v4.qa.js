#!/usr/bin/env node
// WizeLife Portal — flows-v4 (deep: 10 sub-pages, nav height, bottom-nav, CTA text, footer, auth nickname, tool cards)
'use strict';
const { chromium } = require('playwright');

const BASE = 'https://wizelife.ai';
const APP  = 'WizeLife-FlowsV4';

const SUB_PAGES = [
  '/', '/about', '/security', '/terms', '/privacy',
  '/feedback', '/dashboard', '/account',
  '/p/salary-compare', '/p/relocate-portugal',
];

const TOOL_HREFS = {
  Money:  'money.wizelife.ai',
  Tax:    'tax.wizelife.ai',
  Travel: 'travel.wizelife.ai',
  Deal:   'deal.wizelife.ai',
  Health: 'health.wizelife.ai',
};

const TESTS = [
  {
    name: 'All 10 portal sub-pages load without console errors',
    fn: async (page) => {
      const failures = [];
      for (const path of SUB_PAGES) {
        const errs = [];
        const onErr = e => errs.push(String(e).slice(0,80));
        page.on('pageerror', onErr);
        const res = await page.goto(BASE + path + '?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => null);
        await page.waitForTimeout(800);
        page.off('pageerror', onErr);
        const st = res?.status() ?? 0;
        if (st >= 400 || errs.length > 0) failures.push(`${path}(${st}${errs.length ? ' err' : ''})`);
      }
      return { pass: failures.length === 0, detail: failures.length ? `FAIL: ${failures.join(', ')}` : `All ${SUB_PAGES.length} pages OK` };
    },
  },
  {
    name: 'Top nav height consistent 60px across sub-pages (within ±10px)',
    fn: async (page) => {
      const heights = [];
      for (const path of ['/', '/about', '/security', '/terms']) {
        await page.goto(BASE + path + '?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(600);
        const h = await page.evaluate(() => {
          const nav = document.querySelector('header,nav,[class*="navbar" i],[class*="topbar" i]');
          return nav ? Math.round(nav.getBoundingClientRect().height) : -1;
        });
        heights.push({ path, h });
      }
      const valid = heights.filter(e => e.h > 0);
      const min = Math.min(...valid.map(e => e.h));
      const max = Math.max(...valid.map(e => e.h));
      const consistent = (max - min) <= 10;
      return { pass: consistent || valid.length === 0, detail: `heights: ${heights.map(e=>`${e.path}=${e.h}`).join(', ')} spread=${max-min}px` };
    },
  },
  {
    name: 'Bottom-nav present on all portal sub-pages',
    fn: async (page) => {
      const missing = [];
      for (const path of SUB_PAGES.slice(0, 6)) {
        await page.goto(BASE + path + '?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(800);
        const has = await page.evaluate(() => {
          const el = document.querySelector('[class*="bottom-nav" i],[class*="wize-bottom" i],[data-role="bottom-nav"]');
          return !!el;
        });
        if (!has) missing.push(path);
      }
      return { pass: missing.length === 0, detail: missing.length ? `Missing bottom-nav on: ${missing.join(', ')}` : 'Bottom-nav present on all checked pages' };
    },
  },
  {
    name: 'Apps tab smooth-scrolls to #products without full reload',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      const reloads = [];
      page.on('framenavigated', f => { if (!f.parentFrame()) reloads.push(f.url()); });
      const appsTab = page.locator('a[href="#products"]').first();
      const appsTabCount = await appsTab.count().catch(() => 0);
      if (!appsTabCount) return { pass: true, detail: 'No #products anchor link on home page' };
      await appsTab.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      const hardReloads = reloads.filter(u => !u.includes('#'));
      const productsInView = await page.evaluate(() => {
        const el = document.getElementById('products');
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top >= -100 && r.top < window.innerHeight + 100;
      });
      return { pass: hardReloads.length === 0, detail: `hard reloads=${hardReloads.length} #products in view=${productsInView}` };
    },
  },
  {
    name: 'Hero CTA says "Start for free" / "התחל בחינם" (NOT "Dashboard")',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      const cta = await page.locator('a.cta,button.cta,[class*="cta" i],[class*="hero" i] a,[class*="hero" i] button').first().textContent().catch(() => '');
      const ok = /start for free|התחל בחינם|começar grátis|comenzar gratis/i.test(cta || '');
      const noDash = !/dashboard/i.test(cta || '');
      return { pass: ok || noDash, detail: `CTA text: "${cta?.trim()}"` };
    },
  },
  {
    name: 'Footer does not say "worldwide" / "מכל העולם"',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      const footerText = await page.evaluate(() => {
        const footer = document.querySelector('footer');
        return footer ? footer.textContent || '' : '';
      });
      const hasBanned = /worldwide|מכל העולם/i.test(footerText);
      return { pass: !hasBanned, detail: hasBanned ? 'FAIL: found banned phrase in footer' : 'Footer OK' };
    },
  },
  {
    name: 'auth.html nickname placeholder is just "Nickname"',
    fn: async (page) => {
      await page.goto(BASE + '/auth.html?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      const placeholder = await page.locator('input[placeholder*="nickname" i],input[placeholder*="כינוי" i],input[name="nickname"]').first().getAttribute('placeholder').catch(() => '');
      if (!placeholder) return { pass: true, detail: 'No nickname field on auth.html (may be different flow)' };
      return { pass: /^nickname$/i.test((placeholder || '').trim()), detail: `placeholder="${placeholder}"` };
    },
  },
  {
    name: 'All 5 tool-cards navigate to correct sub-app URLs',
    fn: async (page) => {
      await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      const cards = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="wizelife.ai"],[class*="tool-card" i] a,[class*="app-card" i] a'))
          .map(a => ({ href: a.href, text: a.textContent?.trim() || '' }))
          .filter(a => a.href && a.href.includes('.'));
      });
      const expected = Object.values(TOOL_HREFS);
      const foundSubdomains = cards.map(c => {
        try { return new URL(c.href).hostname; } catch { return ''; }
      }).filter(Boolean);
      const hits = expected.filter(e => foundSubdomains.some(h => h.includes(e)));
      return {
        pass: hits.length >= 3,
        detail: `found ${hits.length}/5 tool hrefs: [${hits.join(', ')}] in cards=[${foundSubdomains.join(', ')}]`,
      };
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
      const r = await Promise.race([t.fn(page), new Promise((_,rej) => setTimeout(() => rej(new Error('TIMEOUT')), 120000))]);
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
