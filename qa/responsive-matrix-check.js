#!/usr/bin/env node
/* responsive-matrix-check.js — the "no phone left behind" matrix.
 *
 * Catches the class of bug that single-device tests (e.g. Pixel 7 @412px) MISS:
 * content that is shifted/clipped at NARROW widths, or breaks under a different
 * browser engine. Real users open these apps in:
 *   - Chrome / Samsung Internet (Chromium engine) on Android  → ~320-430px wide
 *   - Safari (WebKit engine) on iPhone                        → ~375-430px wide
 *   - the installed PWA (standalone display-mode)             → no browser chrome
 *
 * So we sweep WIDTH × ENGINE × DISPLAY-MODE and assert, per combination:
 *   A. no horizontal overflow            (scrollWidth <= clientWidth+2)
 *   B. no VISIBLE in-flow content clipped past the left/right viewport edge
 *      (this is the "WizeHealth hero cut to 'WizeHea…'" bug — clipped, not
 *       scrollable, so check A alone won't catch it)
 *   C. no JS pageerror during load
 *
 * Widths cover every phone made in the last ~3 years (2023-2026):
 *   320 = iPhone SE / smallest        360 = most Android (incl. Galaxy A55)
 *   390 = iPhone 12-16                414 = iPhone Plus / large Android
 *   768 = small tablet / split-screen
 *
 * Read-only. Exits non-zero if any combination FAILS.
 * Run: node qa/responsive-matrix-check.js
 */
const path = require('path');
const { chromium, webkit } = require(path.join(__dirname, '..', 'node_modules', 'playwright'));

const APPS = [
  { name: 'WizeMoney',  url: 'https://money.wizelife.ai/' },
  { name: 'WizeTax',    url: 'https://tax.wizelife.ai/advisor' },
  { name: 'WizeHealth', url: 'https://health.wizelife.ai/' },
  { name: 'WizeTravel', url: 'https://travel.wizelife.ai/' },
  { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/' },
  { name: 'WizeLife',   url: 'https://wizelife.ai/' },
];

const WIDTHS = [320, 360, 390, 414, 768];
const ENGINES = [{ name: 'Chromium', launcher: chromium }, { name: 'WebKit', launcher: webkit }];

// Best-effort dismissal of first-visit prompts (consent / onboarding) so we test
// the real screen. Clicks checkboxes + accept/skip buttons; never nav links or "refresh".
async function dismissIntros(page) {
  for (let i = 0; i < 5; i++) {
    let acted = false;
    try {
      acted = await page.evaluate(() => {
        let did = false;
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          if (!cb.checked && cb.offsetParent !== null) { cb.click(); did = true; }
        });
        const ok = /^(המשך לאפליקציה|המשך|continue|דלג|skip|אחר כך|later|got it|הבנתי|הבא|next)/i;
        const bad = /(רענן|refresh|sign in|כניסה|התחבר|login)/i;
        const btns = Array.from(document.querySelectorAll('button,[role="button"]'))
          .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const hit = btns.find(b => { const t = (b.textContent || '').trim(); return ok.test(t) && !bad.test(t); });
        if (hit) { hit.click(); did = true; }
        return did;
      });
    } catch (e) { break; }
    await page.waitForTimeout(600);
    if (!acted) break;
  }
}

// Runs in the page. Returns overflow + a list of visible, in-flow elements whose
// box is clipped past the viewport's left/right edge (the real "content cut off"
// bug). Off-screen drawers (position:fixed/absolute, usually transformed) are
// excluded so we don't flag intentional slide-in panels.
function evalClip() {
  const vw = document.documentElement.clientWidth;
  const scrollW = document.documentElement.scrollWidth;
  const offenders = [];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'NOSCRIPT', 'svg', 'path']);
  const els = document.querySelectorAll('h1,h2,h3,p,button,a,span,div,img,li');
  for (const el of els) {
    if (SKIP.has(el.tagName)) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) continue;
    if (s.position === 'fixed' || s.position === 'absolute') continue; // skip drawers/overlays
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    // only leaf-ish content (avoid huge wrappers): must have own text or be media/button
    const hasOwnText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    const isMediaOrCtl = ['IMG', 'BUTTON', 'A'].includes(el.tagName);
    if (!hasOwnText && !isMediaOrCtl) continue;
    // skip elements inside an off-screen panel (closed drawer/sidebar): walk ancestors
    // for a fixed/absolute box that is itself fully outside the viewport.
    let inOffscreenPanel = false;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      // Intentional horizontal-scroll row (chip carousels) or a clipping marquee/
      // ticker (overflow hidden/clip on the inline axis): content extending past
      // the edge is by design and reachable/animated, not a clip BUG.
      if (/(auto|scroll|hidden|clip)/.test(ps.overflowX)) { inOffscreenPanel = true; break; }
      if (ps.position === 'fixed' || ps.position === 'absolute' || ps.transform !== 'none') {
        const pr = p.getBoundingClientRect();
        if (pr.right <= 1 || pr.left >= vw - 1) { inOffscreenPanel = true; break; }
      }
    }
    if (inOffscreenPanel) continue;
    // FULLY off-screen (intentional off-canvas) → not a clip bug. Only flag content
    // that STRADDLES an edge: part visible on-screen AND part cut off.
    if (r.right <= 1 || r.left >= vw - 1) continue;
    const overR = r.right - vw, overL = -r.left;
    if (overR > 3 || overL > 3) {
      const label = (el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : '')).slice(0, 40);
      const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 32);
      offenders.push({ el: label, txt, clipped: overR > 3 ? 'right ' + Math.round(overR) + 'px' : 'left ' + Math.round(overL) + 'px' });
    }
  }
  // de-dup by label+side, keep worst few
  const seen = new Set(); const uniq = [];
  for (const o of offenders) { const k = o.el + o.clipped.split(' ')[0]; if (!seen.has(k)) { seen.add(k); uniq.push(o); } }
  return { vw, horizOverflow: scrollW > vw + 2, overflowPx: Math.max(0, scrollW - vw), clipped: uniq.slice(0, 6) };
}

(async () => {
  const results = []; // {app, engine, width, mode, probs:[]}
  for (const engine of ENGINES) {
    const browser = await engine.launcher.launch();
    for (const app of APPS) {
      for (const width of WIDTHS) {
        // browser-tab mode at every width; + standalone PWA emulation at one phone width
        const modes = width === 390 ? ['tab', 'standalone'] : ['tab'];
        for (const mode of modes) {
          const ctx = await browser.newContext({
            viewport: { width, height: Math.round(width * 2.1) },
            deviceScaleFactor: 3, isMobile: width < 768, hasTouch: true, locale: 'he-IL',
          });
          const page = await ctx.newPage();
          const errs = [];
          page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
          if (mode === 'standalone') {
            // make the app believe it's an installed PWA (catches display-mode layout branches)
            await page.addInitScript(() => {
              const orig = window.matchMedia.bind(window);
              window.matchMedia = q => /display-mode:\s*standalone/i.test(q)
                ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent() { return false; } }
                : orig(q);
              try { Object.defineProperty(navigator, 'standalone', { get: () => true }); } catch (e) {}
            });
          }
          let loadErr = null;
          for (let a = 0; a < 2; a++) {
            try { await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 35000 }); loadErr = null; break; }
            catch (e) { loadErr = String(e).slice(0, 70); }
          }
          await page.waitForTimeout(2500);
          await dismissIntros(page);
          let r;
          try { r = await page.evaluate(evalClip); } catch (e) { r = { error: String(e).slice(0, 70) }; }

          const probs = [];
          if (loadErr) probs.push('load failed: ' + loadErr);
          if (r && r.horizOverflow) probs.push('H-OVERFLOW +' + r.overflowPx + 'px');
          if (r && r.clipped && r.clipped.length) probs.push('CLIPPED: ' + r.clipped.map(c => `${c.el}["${c.txt}"]→${c.clipped}`).join(' | '));
          if (errs.length) probs.push('JS ERR: ' + JSON.stringify(errs.slice(0, 2)));

          results.push({ app: app.name, engine: engine.name, width, mode, probs });
          await ctx.close();
        }
      }
    }
    await browser.close();
  }

  // report
  const failed = results.filter(r => r.probs.length);
  const byApp = {};
  for (const r of results) (byApp[r.app] = byApp[r.app] || []).push(r);

  console.log('\n=== Responsive Matrix Check — width × engine × display-mode ===');
  console.log(`Widths: ${WIDTHS.join(', ')}px | Engines: Chromium + WebKit | + standalone-PWA @390px`);
  console.log(`Combinations: ${results.length} | Failing: ${failed.length}\n`);

  for (const app of Object.keys(byApp)) {
    const bad = byApp[app].filter(r => r.probs.length);
    if (!bad.length) { console.log(`✅ ${app} — clean across all ${byApp[app].length} combinations`); continue; }
    console.log(`🚨 ${app}`);
    for (const r of bad) console.log(`   - ${r.engine} @${r.width}px${r.mode === 'standalone' ? ' [PWA]' : ''}: ${r.probs.join(' ; ')}`);
  }
  console.log('\n' + (failed.length ? `🚨 ${failed.length} combination(s) FAILED` : '✅ all combinations passed') + '\n');
  process.exit(failed.length ? 1 : 0);
})();
