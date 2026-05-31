#!/usr/bin/env node
/* landing-matrix.js — focused responsive sweep for the 2 viral landing pages.
 *
 * Same width × engine × display-mode matrix as responsive-matrix-check.js,
 * but scoped to /p/salary-compare and /p/relocate-portugal. Also asserts the
 * core interactive elements actually rendered (so a JS error that breaks the
 * input/calc gets caught, not just layout).
 */
const path = require('path');
const { chromium, webkit } = require(path.join(__dirname, '..', 'node_modules', 'playwright'));

const APPS = [
  { name: 'salary-compare',    url: 'https://wizelife.ai/p/salary-compare.html',
    requires: ['#gross', '#countriesChips', '#openDeepBtn', '#shareWrap'] },
  { name: 'relocate-portugal', url: 'https://wizelife.ai/p/relocate-portugal.html',
    requires: ['#gross', '#incomeType', '#savingsBig', '#shareWrap'] },
];

const WIDTHS = [320, 360, 390, 414, 768];
const ENGINES = [{ name: 'Chromium', launcher: chromium }, { name: 'WebKit', launcher: webkit }];

function evalClip() {
  const vw = document.documentElement.clientWidth;
  const scrollW = document.documentElement.scrollWidth;
  const offenders = [];
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
    let inOffscreenPanel = false;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(ps.overflowX)) { inOffscreenPanel = true; break; }
      if (ps.position === 'fixed' || ps.position === 'absolute' || ps.transform !== 'none') {
        const pr = p.getBoundingClientRect();
        if (pr.right <= 1 || pr.left >= vw - 1) { inOffscreenPanel = true; break; }
      }
    }
    if (inOffscreenPanel) continue;
    if (r.right <= 1 || r.left >= vw - 1) continue;
    const overR = r.right - vw, overL = -r.left;
    if (overR > 3 || overL > 3) {
      const label = (el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : '')).slice(0, 40);
      const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 32);
      offenders.push({ el: label, txt, clipped: overR > 3 ? 'right ' + Math.round(overR) + 'px' : 'left ' + Math.round(overL) + 'px' });
    }
  }
  const seen = new Set(); const uniq = [];
  for (const o of offenders) { const k = o.el + o.clipped.split(' ')[0]; if (!seen.has(k)) { seen.add(k); uniq.push(o); } }
  return { vw, horizOverflow: scrollW > vw + 2, overflowPx: Math.max(0, scrollW - vw), clipped: uniq.slice(0, 6) };
}

async function checkRequired(page, selectors) {
  return await page.evaluate((sels) => {
    const missing = [];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) { missing.push(sel + ' MISSING'); continue; }
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) missing.push(sel + ' zero-size');
    }
    return missing;
  }, selectors);
}

(async () => {
  const results = [];
  for (const engine of ENGINES) {
    const browser = await engine.launcher.launch();
    for (const app of APPS) {
      for (const width of WIDTHS) {
        const modes = width === 390 ? ['tab', 'standalone'] : ['tab'];
        for (const mode of modes) {
          const ctx = await browser.newContext({
            viewport: { width, height: Math.round(width * 2.1) },
            deviceScaleFactor: 3, isMobile: width < 768, hasTouch: true, locale: 'he-IL',
          });
          const page = await ctx.newPage();
          // Block analytics beacon — keeps test runs from triggering the prod
          // logEvent Cloud Function (returns 403 on non-allowlisted origins).
          await page.route('**/wize-track-beacon.js', r => r.abort());
          await page.route('**/cloudfunctions.net/logEvent**', r => r.abort());
          const errs = [];
          page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
          if (mode === 'standalone') {
            await page.addInitScript(() => {
              const orig = window.matchMedia.bind(window);
              window.matchMedia = q => /display-mode:\s*standalone/i.test(q)
                ? { matches: true, media: q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, onchange: null, dispatchEvent(){return false;} }
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
          let layout, missing;
          try { layout = await page.evaluate(evalClip); } catch (e) { layout = { error: String(e).slice(0, 70) }; }
          try { missing = await checkRequired(page, app.requires); } catch (e) { missing = ['eval ' + e.message.slice(0,60)]; }
          const probs = [];
          if (loadErr) probs.push('load failed: ' + loadErr);
          if (layout && layout.horizOverflow) probs.push('H-OVERFLOW +' + layout.overflowPx + 'px');
          if (layout && layout.clipped && layout.clipped.length) probs.push('CLIPPED: ' + layout.clipped.map(c => `${c.el}["${c.txt}"]→${c.clipped}`).join(' | '));
          if (missing && missing.length) probs.push('REQ ' + missing.join(','));
          if (errs.length) probs.push('JS ERR: ' + JSON.stringify(errs.slice(0, 2)));
          results.push({ app: app.name, engine: engine.name, width, mode, probs });
          await ctx.close();
        }
      }
    }
    await browser.close();
  }
  const failed = results.filter(r => r.probs.length);
  const byApp = {};
  for (const r of results) (byApp[r.app] = byApp[r.app] || []).push(r);
  console.log('\n=== Landing-Pages Matrix Check — width × engine × display-mode ===');
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
