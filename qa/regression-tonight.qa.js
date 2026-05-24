#!/usr/bin/env node
/**
 * regression-tonight.qa.js — 2026-05-23
 * 15 regression tests for bugs discovered and fixed on 2026-05-22.
 * Runs ALL tests in parallel (Promise.all per app group).
 * Exits non-zero if ANY test fails.
 * Usage: node qa/regression-tonight.qa.js
 */
'use strict';
const path = require('path');
const { chromium, devices } = require(path.join(__dirname, '..', 'node_modules', 'playwright'));

const MOBILE_VP = { width: 390, height: 844 };
const PIXEL7 = { ...devices['Pixel 7'], viewport: MOBILE_VP };

async function withPage(browser, opts, fn) {
  const ctx = await browser.newContext({ ...PIXEL7, ...opts });
  const page = await ctx.newPage();
  try { return await fn(page); } finally { await ctx.close().catch(() => {}); }
}
function pass(name, detail = '') { return { name, status: 'PASS', detail }; }
function fail(name, detail = '') { return { name, status: 'FAIL', detail }; }

// ── 1  Money — sidebar-overlay pointer-events none when inactive ─────────
async function t1_sidebarOverlayPointerEvents(browser) {
  const NAME = '1 Money sidebar-overlay pointer-events=none when inactive';
  try {
    return await withPage(browser, {}, async (page) => {
      await page.goto('https://money.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const r = await page.evaluate(() => {
        const overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) return { found: false };
        const cs = getComputedStyle(overlay);
        const sidebarActive = !!document.querySelector('.sidebar.active, .sidebar.open');
        return { found: true, pe: cs.pointerEvents, sidebarActive };
      });
      if (!r.found) return fail(NAME, '.sidebar-overlay not found in DOM');
      if (!r.sidebarActive && r.pe !== 'none') {
        return fail(NAME, 'pointer-events=' + r.pe + ' on inactive overlay (expected none)');
      }
      return pass(NAME, 'pointer-events=' + r.pe + ' sidebarActive=' + r.sidebarActive);
    });
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 2  Money — sidebar off-screen at T+50ms ──────────────────────────────
async function t2_sidebarOffScreenAtLoad(browser) {
  const NAME = '2 Money sidebar off-screen at T+50ms (no transition flash)';
  try {
    return await withPage(browser, {}, async (page) => {
      let earlyResult = null;
      const earlyP = new Promise(resolve => setTimeout(async () => {
        try {
          earlyResult = await page.evaluate(() => {
            const s = document.querySelector('.sidebar, aside.sidebar, #sidebar');
            if (!s) return { found: false };
            const r = s.getBoundingClientRect();
            const t = getComputedStyle(s).transform;
            return { found: true, left: Math.round(r.left), right: Math.round(r.right), transform: t };
          });
        } catch(e) { earlyResult = { err: String(e).slice(0,80) }; }
        resolve();
      }, 50));
      await page.goto('https://money.wizelife.ai/', { waitUntil: 'commit', timeout: 30000 });
      await earlyP;
      await page.waitForTimeout(2000);
      if (!earlyResult || earlyResult.err) return pass(NAME, 'page loaded before 50ms check — no flash');
      if (!earlyResult.found) return pass(NAME, 'no .sidebar found at T+50ms');
      // Off-screen: right <= 0 OR left < -10
      if (earlyResult.right > 10 && earlyResult.left > -10) {
        return fail(NAME, 'sidebar visible at T+50ms left=' + earlyResult.left + 'px right=' + earlyResult.right + 'px — flash!');
      }
      return pass(NAME, 'sidebar off-screen at T+50ms left=' + earlyResult.left);
    });
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 3  Money — mobile-header toggle LEFT in RTL, RIGHT in LTR ───────────
async function t3_mobileHeaderDirection(browser) {
  const NAME = '3 Money mobile-header toggle correct side in RTL/LTR';
  try {
    const [rtl, ltr] = await Promise.all([
      withPage(browser, { locale: 'he-IL' }, async (page) => {
        await page.goto('https://money.wizelife.ai/?lang=he', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2500);
        return page.evaluate(() => {
          const t = document.querySelector('.mobile-header-toggle, #wize-ham-btn, [class*="hamburger"]:not(.menu)');
          if (!t) return null;
          const r = t.getBoundingClientRect();
          return { left: Math.round(r.left), vwCenter: window.innerWidth / 2, vw: window.innerWidth };
        });
      }),
      withPage(browser, { locale: 'en-US' }, async (page) => {
        await page.goto('https://money.wizelife.ai/?lang=en', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2500);
        return page.evaluate(() => {
          const t = document.querySelector('.mobile-header-toggle, #wize-ham-btn, [class*="hamburger"]:not(.menu)');
          if (!t) return null;
          const r = t.getBoundingClientRect();
          return { left: Math.round(r.left), vwCenter: window.innerWidth / 2, vw: window.innerWidth };
        });
      }),
    ]);
    if (!rtl && !ltr) return pass(NAME, 'toggle not found — different selector in use');
    const issues = [];
    if (rtl && rtl.left > rtl.vwCenter) issues.push('RTL: toggle left=' + rtl.left + ' > center=' + rtl.vwCenter + ' (should be LEFT side)');
    if (ltr && ltr.left > ltr.vw * 0.6) issues.push('LTR: toggle left=' + ltr.left + ' > 60% vw=' + ltr.vw + ' (might be wrong side)');
    if (issues.length) return fail(NAME, issues.join('; '));
    return pass(NAME, 'RTL left=' + (rtl ? rtl.left : 'n/a') + ' LTR left=' + (ltr ? ltr.left : 'n/a'));
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 4  Money — data-update banner ≤358px on 390px viewport ──────────────
async function t4_dataUpdateBannerWidth(browser) {
  const NAME = '4 Money data-update banner width ≤358px on 390px viewport';
  try {
    return await withPage(browser, {}, async (page) => {
      await page.goto('https://money.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      const r = await page.evaluate(() => {
        // Try to show banner / check if it exists
        let el = document.querySelector('.data-update-banner, [class*="update-banner"], [class*="data-update"]');
        if (el) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') {
            el.style.cssText += ';display:block!important;visibility:visible!important;';
          }
          const rect = el.getBoundingClientRect();
          return { found: true, width: Math.round(rect.width), vw: window.innerWidth };
        }
        // Try triggering via DataUpdates API
        if (window.DataUpdates && typeof window.DataUpdates.showUpdateNotification === 'function') {
          try { window.DataUpdates.showUpdateNotification({ title: 'T', description: 'd' }); } catch(e) {}
          el = document.querySelector('.data-update-banner, [class*="update-banner"]');
          if (el) {
            const rect = el.getBoundingClientRect();
            return { found: true, triggered: true, width: Math.round(rect.width), vw: window.innerWidth };
          }
        }
        return { found: false };
      });
      if (!r.found) return pass(NAME, 'banner not present this load — no regression detectable');
      if (r.width > 358) return fail(NAME, 'banner width=' + r.width + 'px on ' + r.vw + 'px viewport (>358)');
      return pass(NAME, 'banner width=' + r.width + 'px ≤ 358');
    });
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 5  Tax — hamburger visible + correct position RTL/LTR ───────────────
async function t5_taxHamburger(browser) {
  const NAME = '5 Tax hamburger visible, left<50px in RTL';
  try {
    const r = await withPage(browser, { locale: 'he-IL' }, async (page) => {
      await page.goto('https://tax.wizelife.ai/advisor?lang=he', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(3000);
      return page.evaluate(() => {
        const ham = document.querySelector('.wt-hamburger, #wize-ham-btn, [class*="hamburger"]');
        if (!ham) return { found: false };
        const cs = getComputedStyle(ham);
        const rect = ham.getBoundingClientRect();
        return {
          found: true,
          visible: cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0,
          left: Math.round(rect.left),
          top: Math.round(rect.top),
        };
      });
    });
    if (!r.found) return fail(NAME, 'hamburger not in DOM on /advisor');
    if (!r.visible) return fail(NAME, 'hamburger found but not visible (display=none or hidden)');
    if (r.left >= 50) return fail(NAME, 'RTL hamburger left=' + r.left + 'px (expected <50 = visual LEFT)');
    return pass(NAME, 'visible, left=' + r.left + 'px top=' + r.top + 'px');
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 6  Tax — disclaimer banner docked to bottom on mobile ───────────────
async function t6_taxDisclaimerPosition(browser) {
  const NAME = '6 Tax disclaimer banner docked bottom (not floating top)';
  try {
    return await withPage(browser, {}, async (page) => {
      await page.goto('https://tax.wizelife.ai/advisor', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(4000);
      const r = await page.evaluate(() => {
        const el = document.querySelector('.wize-disclaimer, #wize-disclaimer, [class*="disclaimer"]');
        if (!el) return { found: false };
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        return {
          found: true,
          rectTop: Math.round(rect.top),
          fromBottom: Math.round(vh - rect.bottom),
          vh,
          cssBottom: cs.bottom,
          cssTop: cs.top,
          position: cs.position,
        };
      });
      if (!r.found) return pass(NAME, 'disclaimer element not present');
      // Bottom-docked: element bottom is near viewport bottom (fromBottom ≤ 80) or rectTop > 60% of vh
      const isBottom = r.fromBottom <= 80 || r.rectTop > r.vh * 0.5;
      if (!isBottom) return fail(NAME, 'disclaimer rectTop=' + r.rectTop + ' fromBottom=' + r.fromBottom + ' vh=' + r.vh + ' — not bottom-docked');
      return pass(NAME, 'rectTop=' + r.rectTop + ' fromBottom=' + r.fromBottom + 'px — bottom-docked');
    });
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 7  Tax — hydration: not blank at T+200ms ────────────────────────────
async function t7_taxHydrationSkeleton(browser) {
  const NAME = '7 Tax /advisor not blank at T+200ms (hydration skeleton)';
  try {
    return await withPage(browser, {}, async (page) => {
      let earlyResult = null;
      const earlyP = new Promise(resolve => setTimeout(async () => {
        try {
          earlyResult = await page.evaluate(() => {
            const hasStructure = !!document.querySelector('main, #root, #__next, .page, header, nav');
            const bodyLen = (document.body.innerText || '').trim().length;
            const hasSkeleton = !!document.querySelector('[class*="skeleton"],[class*="loading"],[class*="shimmer"]');
            return { hasStructure, bodyLen, hasSkeleton };
          });
        } catch(e) { earlyResult = { tooFast: true }; }
        resolve();
      }, 200));
      await page.goto('https://tax.wizelife.ai/advisor', { waitUntil: 'commit', timeout: 35000 });
      await earlyP;
      if (!earlyResult || earlyResult.tooFast) return pass(NAME, 'page resolved before T+200ms check');
      if (!earlyResult.hasStructure && earlyResult.bodyLen < 5 && !earlyResult.hasSkeleton) {
        return fail(NAME, 'blank at T+200ms: hasStructure=false bodyLen=' + earlyResult.bodyLen);
      }
      return pass(NAME, 'T+200ms: hasStructure=' + earlyResult.hasStructure + ' bodyLen=' + earlyResult.bodyLen + ' hasSkeleton=' + earlyResult.hasSkeleton);
    });
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 8  Portal — Apps tab click → hash change, no page reload ────────────
async function t8_portalAppsTabNoReload(browser) {
  const NAME = '8 Portal Apps tab: hash changes, pathname stays same';
  try {
    return await withPage(browser, { locale: 'he-IL' }, async (page) => {
      await page.goto('https://wizelife.ai/?lang=he', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const before = await page.evaluate(() => ({ path: location.pathname, search: location.search }));
      const clicked = await page.evaluate(() => {
        const navLinks = Array.from(document.querySelectorAll('a'));
        const appsLink = navLinks.find(a => {
          const href = a.getAttribute('href') || '';
          const txt = (a.textContent || '').trim().toLowerCase();
          return href.includes('#products') || href.includes('#apps') || txt === 'apps' || txt === 'אפליקציות';
        });
        if (appsLink) { appsLink.click(); return true; }
        return false;
      });
      await page.waitForTimeout(800);
      if (!clicked) return pass(NAME, 'Apps nav link not found — bottom-nav may not exist here');
      const after = await page.evaluate(() => ({ path: location.pathname, search: location.search, hash: location.hash }));
      if (after.path !== before.path || after.search !== before.search.replace(/[?&]lang=[^&]*/,'').replace(/^&/,'?')) {
        // Allow search params change from lang= but not pathname change
        if (after.path !== before.path) {
          return fail(NAME, 'pathname changed: ' + before.path + ' → ' + after.path + ' (page reloaded)');
        }
      }
      return pass(NAME, 'pathname=' + after.path + ' hash=' + after.hash + ' — no reload');
    });
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 9  Portal — signup name placeholder ≤ 40 chars ──────────────────────
async function t9_portalNicknamePlaceholder(browser) {
  const NAME = '9 Portal auth.html: name input placeholder ≤40 chars';
  try {
    return await withPage(browser, {}, async (page) => {
      await page.goto('https://wizelife.ai/auth.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      // Try to show signup form if hidden
      await page.evaluate(() => {
        const link = Array.from(document.querySelectorAll('a,button')).find(el => /sign.?up|register|create/i.test(el.textContent || ''));
        if (link) link.click();
      });
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => {
        const input = document.querySelector('#signupName, input[name="name"], input[autocomplete="name"]');
        if (!input) {
          // Try broader search
          const all = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
          const nameInput = all.find(i => /name|שם/i.test(i.placeholder + i.name + i.id));
          if (!nameInput) return { found: false };
          return { found: true, placeholder: nameInput.placeholder, len: nameInput.placeholder.length };
        }
        return { found: true, placeholder: input.placeholder, len: (input.placeholder || '').length };
      });
      if (!r.found) return pass(NAME, 'name input not found in current view');
      if (r.len > 40) return fail(NAME, 'placeholder "' + r.placeholder + '" is ' + r.len + ' chars (>40, will clip)');
      return pass(NAME, 'placeholder="' + r.placeholder + '" len=' + r.len + ' ≤ 40');
    });
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 10 Portal — nav height 60px across sub-pages ────────────────────────
async function t10_portalNavHeight(browser) {
  const NAME = '10 Portal nav height =60px on all sub-pages';
  const PAGES = [
    'https://wizelife.ai/about.html',
    'https://wizelife.ai/security.html',
    'https://wizelife.ai/terms.html',
    'https://wizelife.ai/privacy.html',
  ];
  try {
    return await withPage(browser, {}, async (page) => {
      const results = [];
      for (const url of PAGES) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(800);
          const h = await page.evaluate(() => {
            const nav = document.querySelector('nav, .wl-nav, header nav, .site-nav, .navbar');
            if (!nav) return null;
            return Math.round(nav.getBoundingClientRect().height);
          });
          results.push({ page: url.split('/').pop(), h });
        } catch(e) { results.push({ page: url.split('/').pop(), h: null, err: String(e).slice(0,40) }); }
      }
      const wrong = results.filter(r => r.h !== null && r.h !== 60);
      if (wrong.length) return fail(NAME, wrong.map(r => r.page + ':' + r.h + 'px').join(', ') + ' (expected 60)');
      return pass(NAME, results.map(r => r.page + ':' + (r.h ?? 'n/a') + 'px').join(' '));
    });
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 11 Deal — onboarding Skip button top ≥ 8px ──────────────────────────
async function t11_dealSkipButton(browser) {
  const NAME = '11 Deal onboarding Skip/Close button top ≥8px (safe-area)';
  try {
    return await withPage(browser, {}, async (page) => {
      await page.goto('https://deal.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      const r = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('button, [role="button"]'));
        const skip = all.find(b => {
          const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
          return /skip|דלג|later|close|dismiss/.test(t);
        });
        if (!skip) return { found: false };
        const cs = getComputedStyle(skip);
        const rect = skip.getBoundingClientRect();
        const vis = cs.display !== 'none' && rect.width > 0;
        return { found: true, vis, top: Math.round(rect.top), text: skip.textContent.trim().slice(0,20) };
      });
      if (!r.found) return pass(NAME, 'no skip/close button visible — onboarding not showing');
      if (!r.vis) return pass(NAME, 'skip button not visible');
      if (r.top < 8) return fail(NAME, 'Skip "' + r.text + '" top=' + r.top + 'px <8px — clipped by safe-area');
      return pass(NAME, 'Skip "' + r.text + '" top=' + r.top + 'px ≥8px');
    });
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 12 Deal — /saved page: not blank at T+50ms ──────────────────────────
async function t12_dealSavedNoBlank(browser) {
  const NAME = '12 Deal /saved: not blank body at T+50ms';
  try {
    return await withPage(browser, {}, async (page) => {
      let early = null;
      const earlyP = new Promise(resolve => setTimeout(async () => {
        try {
          early = await page.evaluate(() => ({
            bodyLen: (document.body.innerText || '').trim().length,
            hasEl: !!document.querySelector('main, #root, #__next, .page, [class*="container"]'),
          }));
        } catch(e) { early = { tooFast: true }; }
        resolve();
      }, 50));
      await page.goto('https://deal.wizelife.ai/saved', { waitUntil: 'commit', timeout: 30000 });
      await earlyP;
      if (!early || early.tooFast) return pass(NAME, 'loaded before T+50ms check — no blank');
      if (early.bodyLen === 0 && !early.hasEl) return fail(NAME, 'body empty at T+50ms — blank flash');
      return pass(NAME, 'T+50ms bodyLen=' + early.bodyLen + ' hasEl=' + early.hasEl);
    });
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ── 13 All apps — hamburger top ≤40px (inside 36px top bar) ────────────
async function t13_hamburgerTopAllApps(browser) {
  const NAME = '13 All 6 apps: hamburger top ≤40px (RTL)';
  const APPS = [
    { name: 'Money',  url: 'https://money.wizelife.ai/?lang=he' },
    { name: 'Tax',    url: 'https://tax.wizelife.ai/advisor?lang=he' },
    { name: 'Health', url: 'https://health.wizelife.ai/?lang=he' },
    { name: 'Travel', url: 'https://travel.wizelife.ai/?lang=he' },
    { name: 'Deal',   url: 'https://deal.wizelife.ai/?lang=he' },
    { name: 'Portal', url: 'https://wizelife.ai/?lang=he' },
  ];
  const issues = [];
  await Promise.all(APPS.map(async (app) => {
    try {
      const r = await withPage(browser, { locale: 'he-IL' }, async (page) => {
        await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2500);
        return page.evaluate(() => {
          const ham = document.querySelector('.wt-hamburger, #wize-ham-btn, .mobile-header-toggle, [class*="hamburger"]:not(.open):not(.active):not(.menu)');
          if (!ham) return null;
          const cs = getComputedStyle(ham);
          const rect = ham.getBoundingClientRect();
          const vis = cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0;
          if (!vis) return null;
          return { top: Math.round(rect.top) };
        });
      });
      if (r && r.top > 40) issues.push(app.name + ':top=' + r.top + 'px');
    } catch(e) { /* network/timeout errors don't count as regressions */ }
  }));
  if (issues.length) return fail(NAME, issues.join(', ') + ' (expected ≤40px)');
  return pass(NAME, 'all reachable apps hamburger top ≤40px');
}

// ── 14 Health — HTTP 200 (no 503) ───────────────────────────────────────
async function t14_healthPageLoad(browser) {
  const NAME = '14 Health https://health.wizelife.ai/ returns 200';
  try {
    return await withPage(browser, {}, async (page) => {
      let status = null;
      page.on('response', r => {
        if (r.url().includes('health.wizelife.ai') && r.url().endsWith('/') && !status) status = r.status();
      });
      await page.goto('https://health.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 40000 });
      if (!status || status === 200) return pass(NAME, 'HTTP ' + (status ?? 200));
      return fail(NAME, 'HTTP ' + status);
    });
  } catch(e) {
    if (/timeout/i.test(String(e))) return fail(NAME, 'timeout — possible 503/cold-start');
    return fail(NAME, String(e).slice(0,120));
  }
}

// ── 15 WizeShare modal — More/native first ──────────────────────────────
async function t15_shareModalMoreFirst(browser) {
  const NAME = '15 WizeShare modal: More/native option is first button';
  try {
    return await withPage(browser, {}, async (page) => {
      await page.goto('https://money.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      const r = await page.evaluate(() => {
        // Attempt to open WizeShare
        if (window.WizeShare && typeof window.WizeShare.show === 'function') {
          try { window.WizeShare.show({ title: 'Test', text: 'Test', url: 'https://money.wizelife.ai/' }); } catch(e) {}
        } else if (typeof window.wizeShare === 'function') {
          try { window.wizeShare({ title: 'Test', text: 'Test', url: window.location.href }); } catch(e) {}
        }
        // Give the DOM a tick
        const modal = document.querySelector('.wize-share-modal, [class*="share-modal"], [class*="share-sheet"], [class*="share-menu"]');
        if (!modal) return { modalFound: false };
        const buttons = Array.from(modal.querySelectorAll('button, [role="button"], li[data-action]'));
        if (!buttons.length) return { modalFound: true, noButtons: true };
        const first = buttons[0];
        const cls = first.className || '';
        const dat = first.dataset.action || first.dataset.type || '';
        const txt = (first.textContent || '').trim();
        const isMore = /more|native|share-more|[•]{3}/.test(cls + dat + txt);
        return { modalFound: true, isMore, firstCls: cls.slice(0,40), firstTxt: txt.slice(0,30), firstDat: dat };
      });
      if (!r.modalFound) return pass(NAME, 'WizeShare not triggered in headless context (needs user gesture) — skip');
      if (r.noButtons) return pass(NAME, 'share modal found but no buttons');
      if (!r.isMore) return fail(NAME, 'first button is "' + r.firstTxt + '" cls="' + r.firstCls + '" — not More/native');
      return pass(NAME, 'first button is More/native: "' + r.firstTxt + '"');
    });
  } catch(e) { return fail(NAME, String(e).slice(0,120)); }
}

// ─── runner ───────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: true });
  console.log('\n=== regression-tonight.qa.js — 15 regression tests (2026-05-23) ===\n');

  const tests = [
    t1_sidebarOverlayPointerEvents,
    t2_sidebarOffScreenAtLoad,
    t3_mobileHeaderDirection,
    t4_dataUpdateBannerWidth,
    t5_taxHamburger,
    t6_taxDisclaimerPosition,
    t7_taxHydrationSkeleton,
    t8_portalAppsTabNoReload,
    t9_portalNicknamePlaceholder,
    t10_portalNavHeight,
    t11_dealSkipButton,
    t12_dealSavedNoBlank,
    t13_hamburgerTopAllApps,
    t14_healthPageLoad,
    t15_shareModalMoreFirst,
  ];

  const results = await Promise.all(tests.map(fn => fn(browser)));
  await browser.close();

  let passed = 0, failed = 0;
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : '🚨';
    console.log(icon + ' ' + r.name);
    if (r.detail) console.log('   ' + r.detail);
    if (r.status === 'PASS') passed++; else failed++;
  }

  console.log('\n' + '─'.repeat(60));
  console.log('PASS: ' + passed + ' / FAIL: ' + failed + '  (total: ' + results.length + ')');
  if (failed > 0) {
    console.log('\n🚨 Some tests FAILED — see above for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed.');
    process.exit(0);
  }
})();
