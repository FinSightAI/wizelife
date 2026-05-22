#!/usr/bin/env node
/* mobile-drawer-check.js — opens the mobile hamburger drawer on every app at a
   390 px viewport (iPhone 14 Pro) and asserts three things we broke in production:

     (a) CONTENT VISIBLE / NOT COVERED — the topmost element at the drawer's
         visible center is INSIDE the drawer, not an overlay stacked above it.
         Catches the CSS z-index stacking-context "black screen" regression.
     (b) HAMBURGER OVERLAP — the hamburger button (if still visible with the
         drawer open) must NOT intersect the drawer's top content area (first
         80 px), which would cover nav items.
     (c) CLOSEABLE — the drawer can be dismissed by: close button, backdrop
         click (outside the drawer), or re-clicking the hamburger.

   Drawer detection: position-based — looks for a fixed/absolute sidebar element
   that is visibly on-screen (left edge >= -20px) after the hamburger click.
   Does NOT require a specific class name like "open".
   Apps where the drawer doesn't open (auth-gated or no drawer) are SKIP, not FAIL.

   Read-only.  Exits non-zero if any app fails.
   Run: node qa/mobile-drawer-check.js
*/
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'node_modules', 'playwright'));

const APPS = [
  { name: 'WizeMoney',  url: 'https://money.wizelife.ai/' },
  { name: 'WizeTax',    url: 'https://tax.wizelife.ai/advisor' },
  { name: 'WizeHealth', url: 'https://health.wizelife.ai/' },
  { name: 'WizeTravel', url: 'https://travel.wizelife.ai/' },
  { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/' },
  { name: 'WizeLife',   url: 'https://wizelife.ai/' },
];

// Hamburger toggle selectors, in priority order.
const HAM_SELECTORS = [
  '.wh-app-ham',
  '.wl-tr-ham',
  '.wl-deal-ham',
  '.mobile-menu-toggle',
  '#wize-ham-btn',
  '.wt-hamburger',
  '#hamburger',
  '[aria-label="Menu"]',
  '[aria-label="menu"]',
];

// Reuse intro-dismiss pattern from mobile-render-check.js.
async function dismissIntros(page) {
  for (let i = 0; i < 5; i++) {
    let acted = false;
    try {
      acted = await page.evaluate(() => {
        let did = false;
        const cb = document.querySelector('input[type="checkbox"]');
        if (cb && !cb.checked && cb.offsetParent !== null) { cb.click(); did = true; }
        const re = /^(\u05d4\u05de\u05e9\u05da|continue|\u05d3\u05dc\u05d2|skip|later|got it|\u05d4\u05d1\u05e0\u05ea\u05d9)/i;
        const bad = /(\u05e8\u05e2\u05e0\u05df|refresh|sign in|\u05db\u05e0\u05d9\u05e1\u05d4|\u05d4\u05ea\u05d7\u05d1\u05e8)/i;
        const btns = Array.from(document.querySelectorAll('button,[role="button"]'))
          .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const hit = btns.find(b => { const t = (b.textContent || '').trim(); return re.test(t) && !bad.test(t); });
        if (hit) { hit.click(); did = true; }
        return did;
      });
    } catch (e) { break; }
    await page.waitForTimeout(700);
    if (!acted) break;
  }
}

// Find hamburger center coords (DOM-based, no Playwright actionability wait).
async function findHamburgerCoords(page) {
  for (const sel of HAM_SELECTORS) {
    try {
      const info = await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const visible = cs.display !== 'none' && cs.visibility !== 'hidden'
          && parseFloat(cs.opacity || 1) > 0.01
          && r.width > 0 && r.height > 0
          && r.left >= -r.width && r.left < window.innerWidth
          && r.top  >= -r.height && r.top  < window.innerHeight;
        return visible ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), sel: s } : null;
      }, sel);
      if (info) return info;
    } catch (_) {}
  }
  // ☰ text fallback
  try {
    const info = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button,[role="button"],a'));
      for (const b of all) {
        if ((b.textContent || '').trim() !== '\u2630') continue;
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0) continue;
        if (r.left < -r.width || r.left >= window.innerWidth) continue;
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), sel: '\u2630-text' };
      }
      return null;
    });
    if (info) return info;
  } catch (_) {}
  return null;
}

// Find a drawer panel that is visibly on-screen (position-based, not class-based).
async function findOnscreenDrawer(page) {
  try {
    return await page.evaluate(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const selectors = [
        'aside',
        'div[class*="sidebar"]',
        'div[class*="drawer"]',
        'div[class*="mobile-nav"]',
        'div[class*="mobileNav"]',
        'div[id*="mobileNav"]',
        'nav[class*="mobile"]',
        '.wt-sidebar',
        '.wl-tr-sidebar',
        '.wl-deal-sidebar',
        'nav.open',
      ].join(',');

      const cands = Array.from(document.querySelectorAll(selectors));
      for (const el of cands) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (parseFloat(cs.opacity || 1) < 0.1) continue;
        if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 50 || r.height < 100) continue;
        if (r.left < -20 || r.left > vw - 30) continue;
        if (r.height < vh * 0.25) continue;
        return {
          id: el.id || '',
          cls: el.className.toString().slice(0, 60),
          tag: el.tagName,
          rect: { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
        };
      }
      return null;
    });
  } catch (_) { return null; }
}

(async () => {
  const browser = await chromium.launch();
  let failures = 0;
  const lines = [];

  for (const app of APPS) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'en-US',
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();

    let loadErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
        loadErr = null; break;
      } catch (e) { loadErr = String(e).slice(0, 100); }
    }

    if (loadErr) {
      lines.push('FAIL  ' + app.name + '\n      LOAD FAILED: ' + loadErr);
      failures++;
      await ctx.close();
      continue;
    }

    await page.waitForTimeout(5000);
    await dismissIntros(page);
    await page.waitForTimeout(1200);

    // --- Find hamburger ---
    const hamCoords = await findHamburgerCoords(page);
    if (!hamCoords) {
      lines.push('SKIP  ' + app.name + ' — no hamburger button found');
      await ctx.close();
      continue;
    }

    // --- Click hamburger ---
    try {
      await page.mouse.click(hamCoords.x, hamCoords.y);
    } catch (e) {
      lines.push('FAIL  ' + app.name + '\n      could not click hamburger: ' + String(e).slice(0, 80));
      failures++;
      await ctx.close();
      continue;
    }
    await page.waitForTimeout(1200);

    // --- Find on-screen drawer ---
    const drawer = await findOnscreenDrawer(page);
    if (!drawer) {
      lines.push('SKIP  ' + app.name + ' — hamburger clicked (sel: ' + hamCoords.sel + ') but no on-screen drawer detected (may require auth)');
      await ctx.close();
      continue;
    }

    try { await page.screenshot({ path: '/tmp/mdc-' + app.name + '-open.png' }); } catch (_) {}

    const probs = [];
    const dRect = drawer.rect;

    // --- (a) Content not covered by an overlay ---
    try {
      const coverResult = await page.evaluate(({ rect }) => {
        const cx = Math.max(5, Math.min(window.innerWidth  - 5, rect.left + rect.width  / 2));
        const cy = Math.max(5, Math.min(window.innerHeight - 5, rect.top  + rect.height / 2));
        const topEl = document.elementFromPoint(cx, cy);
        if (!topEl) return { covered: false };

        // Re-find drawer by bounding box match.
        const allEls = Array.from(document.querySelectorAll('*'));
        const drawerEl = allEls.find(e => {
          const cs = getComputedStyle(e);
          if (cs.position !== 'fixed' && cs.position !== 'absolute') return false;
          const r = e.getBoundingClientRect();
          return (
            Math.abs(r.left - rect.left) < 5 &&
            Math.abs(r.width - rect.width) < 5 &&
            Math.abs(r.height - rect.height) < 20
          );
        });
        if (!drawerEl) return { covered: false };

        if (!drawerEl.contains(topEl)) {
          return {
            covered: true,
            topEl: topEl.tagName + '#' + topEl.id + '.' + (topEl.className || '').toString().slice(0, 40),
            topZ: getComputedStyle(topEl).zIndex,
            cx: Math.round(cx), cy: Math.round(cy),
          };
        }
        return { covered: false };
      }, { rect: dRect });

      if (coverResult && coverResult.covered) {
        probs.push(
          'OVERLAY COVERS DRAWER (stacking bug): topmost element at (' +
          coverResult.cx + ',' + coverResult.cy + ') is ' + coverResult.topEl +
          ' z=' + coverResult.topZ
        );
      }
    } catch (e) { probs.push('check-a error: ' + String(e).slice(0, 80)); }

    // --- (b) Hamburger does not overlap drawer's top content area ---
    try {
      const overlapResult = await page.evaluate(({ hamSelectors, dRect }) => {
        const hams = [];
        for (const sel of hamSelectors) {
          const el = document.querySelector(sel);
          if (el) hams.push(el);
        }
        document.querySelectorAll('button,[role="button"],a').forEach(b => {
          if ((b.textContent || '').trim() === '\u2630') hams.push(b);
        });

        for (const ham of hams) {
          const cs = getComputedStyle(ham);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const hRect = ham.getBoundingClientRect();
          if (hRect.width === 0) continue;
          const topArea = {
            left: dRect.left, right: dRect.left + dRect.width,
            top: dRect.top, bottom: dRect.top + 80,
          };
          if (
            hRect.right  > topArea.left  && hRect.left   < topArea.right &&
            hRect.bottom > topArea.top   && hRect.top    < topArea.bottom
          ) {
            return {
              overlap: true,
              hamRect: { l: Math.round(hRect.left), t: Math.round(hRect.top), r: Math.round(hRect.right), b: Math.round(hRect.bottom) },
              drawerTop: Math.round(dRect.top),
            };
          }
        }
        return { overlap: false };
      }, { hamSelectors: HAM_SELECTORS, dRect });

      if (overlapResult && overlapResult.overlap) {
        probs.push(
          'HAMBURGER OVERLAPS DRAWER TOP ITEMS: ham [' +
          overlapResult.hamRect.l + ',' + overlapResult.hamRect.t + '-' +
          overlapResult.hamRect.r + ',' + overlapResult.hamRect.b + '] vs drawer top y=' +
          overlapResult.drawerTop
        );
      }
    } catch (e) { probs.push('check-b error: ' + String(e).slice(0, 80)); }

    // --- (c) Drawer can be closed ---
    try {
      let closed = false;

      // Strategy 1: explicit close button (.drawer-close or aria-label="Close").
      if (!closed) {
        try {
          const hasClose = await page.evaluate(() => {
            const el = document.querySelector('.drawer-close,[aria-label="Close"],[aria-label="close"]');
            return !!(el && getComputedStyle(el).display !== 'none');
          });
          if (hasClose) {
            await page.evaluate(() => document.querySelector('.drawer-close,[aria-label="Close"],[aria-label="close"]').click());
            await page.waitForTimeout(800);
            closed = !(await findOnscreenDrawer(page));
          }
        } catch (_) {}
      }

      // Strategy 2: click outside the drawer bounds (backdrop area below or beside drawer).
      if (!closed) {
        try {
          // Find a point clearly outside the drawer.
          const outside = await page.evaluate(({ dRect }) => {
            const vw = window.innerWidth, vh = window.innerHeight;
            // Try clicking below the drawer if space exists.
            if (dRect.top + dRect.height < vh - 10) {
              return { x: Math.round(vw / 2), y: Math.round(dRect.top + dRect.height + 30) };
            }
            // Try clicking beside the drawer (right side if drawer is left-aligned).
            if (dRect.left + dRect.width < vw - 10) {
              return { x: Math.round(dRect.left + dRect.width + 30), y: Math.round(dRect.top + 100) };
            }
            return null;
          }, { dRect });

          if (outside) {
            await page.mouse.click(outside.x, outside.y);
            await page.waitForTimeout(800);
            closed = !(await findOnscreenDrawer(page));
          }
        } catch (_) {}
      }

      // Strategy 3: re-click the hamburger button (toggle).
      if (!closed) {
        try {
          const hamNow = await findHamburgerCoords(page);
          if (hamNow) {
            await page.mouse.click(hamNow.x, hamNow.y);
            await page.waitForTimeout(800);
            closed = !(await findOnscreenDrawer(page));
          }
        } catch (_) {}
      }

      if (!closed) {
        probs.push('DRAWER NOT CLOSEABLE: still on-screen after close button, backdrop click, and hamburger re-click');
      }
    } catch (e) { probs.push('check-c error: ' + String(e).slice(0, 80)); }

    if (probs.length) {
      failures++;
      lines.push('FAIL  ' + app.name + '\n      ' + probs.join('\n      '));
    } else {
      lines.push('PASS  ' + app.name + ' — drawer not covered, no ham overlap, closeable');
    }

    try { await page.screenshot({ path: '/tmp/mdc-' + app.name + '-after.png' }); } catch (_) {}
    await ctx.close();
  }

  await browser.close();

  console.log('\n=== Mobile Drawer Check (390px viewport, Chromium) ===\n');
  console.log(lines.join('\n'));
  console.log('');
  if (failures) {
    console.log('FAIL  ' + failures + ' app(s) have mobile drawer bugs');
  } else {
    console.log('PASS  all apps — drawer open/visible/closeable');
  }
  console.log('');
  process.exit(failures ? 1 : 0);
})();
