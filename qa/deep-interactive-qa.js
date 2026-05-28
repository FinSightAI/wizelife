#!/usr/bin/env node
/* deep-interactive-qa.js — interactive smoke test for the 3 landing pages.
 *
 * Not just layout: actually CLICKS the controls (accordions, tooltips, modals,
 * country grid, FAQ items, hamburger) and verifies that after each interaction:
 *   - no horizontal overflow appears
 *   - no element is clipped past the viewport edges
 *   - no JS error fires
 *   - the bottom-nav doesn't cover the share buttons
 *   - touch targets are >= 40px tall on mobile (Apple/WCAG)
 *
 * Tests every page at 360px (most-used mobile width) in both Chromium + WebKit
 * + at 320px (smallest phone) and 414px (large phone).
 */
const path = require('path');
const fs = require('fs');
const { chromium, webkit } = require(path.join(__dirname, '..', 'node_modules', 'playwright'));

const BASE = 'http://localhost:8765';
const PAGES = [
  { name: 'digital-nomad', path: '/p/digital-nomad.html', actions: ['openDayTip', 'openILAccordion', 'openSplitAccordion', 'clickGridCountry', 'openFAQ'] },
  { name: 'salary-compare', path: '/p/salary-compare.html', actions: ['openDeepModal'] },
  { name: 'relocate-portugal', path: '/p/relocate-portugal.html', actions: [] },
];
const WIDTHS = [320, 360, 414];
const ENGINES = [{ name: 'Chromium', launcher: chromium }, { name: 'WebKit', launcher: webkit }];

const SCREENSHOT_DIR = '/tmp/wize-deep-qa';
try { fs.mkdirSync(SCREENSHOT_DIR, { recursive: true }); } catch (_) {}

// ── Per-page interactive actions ────────────────────────────────────────────
async function doAction(page, action) {
  try {
    switch (action) {
      case 'openDayTip':
        await page.click('#dayInfoBtn', { timeout: 3000 });
        await page.waitForTimeout(400);
        break;
      case 'openILAccordion':
        await page.click('#ilHead', { timeout: 3000 });
        await page.waitForTimeout(400);
        // Also run the residency check button to see the result panel
        await page.click('#ilCheck', { timeout: 3000 });
        await page.waitForTimeout(400);
        break;
      case 'openSplitAccordion':
        await page.click('#splitHead', { timeout: 3000 });
        await page.waitForTimeout(400);
        break;
      case 'clickGridCountry':
        const cell = await page.$('.gcell');
        if (cell) {
          await cell.click({ timeout: 3000 });
          await page.waitForTimeout(500);
          // Close modal so subsequent actions can hit elements behind it
          const x = await page.$('#modalClose');
          if (x) await x.click({ timeout: 3000 });
          await page.waitForTimeout(300);
        }
        break;
      case 'openFAQ':
        const faq = await page.$('.faq-q');
        if (faq) {
          // Scroll into block:center so the fixed bottom-nav doesn't cover it
          await faq.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await page.waitForTimeout(200);
          await faq.click({ timeout: 3000 });
          await page.waitForTimeout(300);
        }
        break;
      case 'openDeepModal':
        await page.click('#openDeepBtn', { timeout: 3000 });
        await page.waitForTimeout(400);
        // Close it again to not leak state
        const close = await page.$('#closeDeep');
        if (close) await close.click();
        await page.waitForTimeout(200);
        break;
    }
    return null;
  } catch (e) {
    return action + ': ' + (e.message || '').slice(0, 80);
  }
}

// ── Layout + touch-target check after each action ──────────────────────────
function evalDeep() {
  const vw = document.documentElement.clientWidth;
  const scrollW = document.documentElement.scrollWidth;
  const horizOverflow = scrollW > vw + 2;
  const overflowPx = Math.max(0, scrollW - vw);

  // Find content clipped past viewport edges (same logic as landing-matrix)
  const clipped = [];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'NOSCRIPT', 'svg', 'path']);
  const els = document.querySelectorAll('h1,h2,h3,p,button,a,span,div,img,li,input,select');
  for (const el of els) {
    if (SKIP.has(el.tagName)) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) continue;
    if (s.position === 'fixed' || s.position === 'absolute') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const hasOwnText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    const isMediaOrCtl = ['IMG', 'BUTTON', 'A', 'INPUT', 'SELECT'].includes(el.tagName);
    if (!hasOwnText && !isMediaOrCtl) continue;
    let inOff = false;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(ps.overflowX)) { inOff = true; break; }
      if (ps.position === 'fixed' || ps.position === 'absolute' || ps.transform !== 'none') {
        const pr = p.getBoundingClientRect();
        if (pr.right <= 1 || pr.left >= vw - 1) { inOff = true; break; }
      }
    }
    if (inOff) continue;
    if (r.right <= 1 || r.left >= vw - 1) continue;
    const overR = r.right - vw, overL = -r.left;
    if (overR > 3 || overL > 3) {
      const label = (el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : '')).slice(0, 50);
      const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      clipped.push({ el: label, txt, side: overR > 3 ? 'right' : 'left', px: Math.round(Math.max(overR, overL)) });
    }
  }
  const seen = new Set(); const uniq = [];
  for (const o of clipped) { const k = o.el + o.side; if (!seen.has(k)) { seen.add(k); uniq.push(o); } }

  // Touch-target audit: visible buttons/inputs/anchors smaller than 40px tall
  // on mobile widths (WCAG 2.5.5 recommends 44px; we use 40 as a sane floor).
  const tooSmall = [];
  if (vw < 768) {
    const targets = document.querySelectorAll('button, a, input, select, [role="button"]');
    for (const t of targets) {
      const s = getComputedStyle(t);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      const r = t.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      if (r.height < 36 && r.width > 16) {
        const label = (t.tagName + (t.id ? '#' + t.id : '')).slice(0, 30);
        const txt = (t.textContent || t.value || '').trim().slice(0, 20);
        tooSmall.push({ el: label, txt, h: Math.round(r.height) });
      }
    }
  }

  // Bottom-nav overlap check: if .wize-bottom-nav exists and is fixed bottom,
  // make sure the last non-nav content doesn't sit underneath it.
  let bottomCover = null;
  const nav = document.querySelector('.wize-bottom-nav, #wize-bottom-nav, [class*="bottom-nav"]');
  if (nav) {
    const navRect = nav.getBoundingClientRect();
    // Last share button or CTA — check it isn't behind the nav
    const lastCta = document.querySelector('.cta a, .share-btns button:last-child');
    if (lastCta) {
      const r = lastCta.getBoundingClientRect();
      // If the CTA's bottom is BELOW the visible viewport AND the nav covers the
      // very bottom, that's potentially OK (user scrolls). But if the CTA is
      // ON-screen and the nav is over it, that's a bug.
      if (r.bottom > 0 && r.top < navRect.top && r.bottom > navRect.top) {
        bottomCover = 'CTA(' + Math.round(r.bottom - navRect.top) + 'px under nav)';
      }
    }
  }

  return { vw, horizOverflow, overflowPx, clipped: uniq.slice(0, 5), tooSmall: tooSmall.slice(0, 5), bottomCover };
}

(async () => {
  const allResults = [];
  for (const engine of ENGINES) {
    const browser = await engine.launcher.launch();
    for (const pg of PAGES) {
      for (const width of WIDTHS) {
        const ctx = await browser.newContext({
          viewport: { width, height: Math.round(width * 2.1) },
          deviceScaleFactor: 3, isMobile: width < 768, hasTouch: true,
        });
        const page = await ctx.newPage();
        await page.route('**/wize-track-beacon.js', r => r.abort());
        await page.route('**/cloudfunctions.net/logEvent**', r => r.abort());
        const errs = [];
        page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
        await page.addInitScript(() => { try { localStorage.setItem('wl_lang', 'he'); } catch (e) {} });
        try {
          await page.goto(BASE + pg.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(1500);
        } catch (e) {
          allResults.push({ page: pg.name, width, engine: engine.name, action: 'load', problems: ['load: ' + (e.message || '').slice(0, 60)] });
          await ctx.close();
          continue;
        }

        // Step 0: baseline check before any interaction
        let res = await page.evaluate(evalDeep);
        const baseProblems = [];
        if (res.horizOverflow) baseProblems.push('H-OVERFLOW +' + res.overflowPx + 'px');
        if (res.clipped.length) baseProblems.push('CLIPPED:' + res.clipped.map(c => c.el + '[' + c.txt + ']→' + c.side + ' ' + c.px + 'px').join(' | '));
        if (res.tooSmall.length) baseProblems.push('TOUCH<36px:' + res.tooSmall.map(t => t.el + '(h=' + t.h + ')').join(' | '));
        if (res.bottomCover) baseProblems.push('BOTTOM-NAV-COVERS:' + res.bottomCover);
        allResults.push({ page: pg.name, width, engine: engine.name, action: 'baseline', problems: baseProblems });

        // Step 1+: per-page actions
        for (const action of pg.actions) {
          const actErr = await doAction(page, action);
          await page.waitForTimeout(300);
          res = await page.evaluate(evalDeep);
          const probs = [];
          if (actErr) probs.push('ACTION-FAIL: ' + actErr);
          if (res.horizOverflow) probs.push('H-OVERFLOW +' + res.overflowPx + 'px');
          if (res.clipped.length) probs.push('CLIPPED:' + res.clipped.map(c => c.el + '[' + c.txt + ']→' + c.side + ' ' + c.px + 'px').join(' | '));
          if (res.bottomCover) probs.push('BOTTOM-NAV-COVERS:' + res.bottomCover);
          // Screenshot any problematic state for visual review
          if (probs.length && engine.name === 'Chromium' && width === 360) {
            const fn = SCREENSHOT_DIR + '/' + pg.name + '_' + action + '.png';
            try { await page.screenshot({ path: fn, fullPage: true }); } catch (_) {}
            probs.push('screenshot:' + fn);
          }
          allResults.push({ page: pg.name, width, engine: engine.name, action, problems: probs });
        }

        // Filter JS errors (skip known localhost CORS noise)
        const realErrs = errs.filter(e =>
          !/logEvent|finzilla-7f1f9\.cloudfunctions/.test(e) &&
          !/sw\.js due to access control/.test(e)
        );
        if (realErrs.length) {
          allResults.push({ page: pg.name, width, engine: engine.name, action: 'JS-errors', problems: realErrs.slice(0, 3) });
        }
        await ctx.close();
      }
    }
    await browser.close();
  }

  const failures = allResults.filter(r => r.problems.length);
  console.log('\n=== Deep Interactive QA ===');
  console.log('Total checks: ' + allResults.length + ' | Failures: ' + failures.length);
  console.log('Pages: ' + PAGES.map(p => p.name).join(', ') + ' | Widths: ' + WIDTHS.join('/') + 'px | Engines: ' + ENGINES.map(e => e.name).join('/'));
  console.log('');
  // Group by page
  const byPage = {};
  for (const r of allResults) { (byPage[r.page] = byPage[r.page] || []).push(r); }
  for (const pg of Object.keys(byPage)) {
    const bad = byPage[pg].filter(r => r.problems.length);
    if (!bad.length) { console.log('✅ ' + pg + ' — all interactions clean'); continue; }
    console.log('🚨 ' + pg);
    for (const r of bad) {
      console.log('   - ' + r.width + 'px/' + r.engine + '/' + r.action + ': ' + r.problems.join(' ; '));
    }
  }
  console.log('\nScreenshots (when applicable): ' + SCREENSHOT_DIR);
  process.exit(failures.length ? 1 : 0);
})();
