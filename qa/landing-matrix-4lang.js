#!/usr/bin/env node
/* landing-matrix-4lang.js — same as landing-matrix.js but pre-sets each of the
 * 4 supported languages via localStorage before navigation, so every layout
 * is verified across he/en/pt/es. Points at a local http server (port 8765)
 * so we can validate uncommitted changes before push.
 */
const path = require('path');
const { chromium, webkit } = require(path.join(__dirname, '..', 'node_modules', 'playwright'));

const BASE = 'http://localhost:8765';
const APPS = [
  { name: 'salary-compare',    path: '/p/salary-compare.html',
    requires: ['#gross', '#countriesChips', '#openDeepBtn', '#shareWrap'] },
  { name: 'relocate-portugal', path: '/p/relocate-portugal.html',
    requires: ['#gross', '#incomeType', '#savingsBig', '#shareWrap'] },
];

const WIDTHS = [320, 360, 390, 414, 768];
const ENGINES = [{ name: 'Chromium', launcher: chromium }, { name: 'WebKit', launcher: webkit }];
const LANGS = ['he', 'en', 'pt', 'es'];

function evalClipAndUntranslated() {
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
  // Untranslated check: scan visible [data-i18n] elements. If the rendered
  // text contains Hebrew characters but lang is not 'he', flag it.
  const docLang = document.documentElement.getAttribute('lang') || 'he';
  const untranslated = [];
  if (docLang !== 'he') {
    // Allow specific Hebrew proper nouns that are intentionally NOT translated
    // (Israeli law/concept names in source citations).
    const ALLOWED_HE_NOUNS = ['חוק ההסדרים'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      let txt = (el.textContent || '').trim();
      for (const noun of ALLOWED_HE_NOUNS) txt = txt.split(noun).join('');
      if (/[֐-׿]/.test(txt)) untranslated.push({ key: el.getAttribute('data-i18n'), txt: (el.textContent || '').trim().slice(0, 32) });
    });
  }
  return { vw, horizOverflow: scrollW > vw + 2, overflowPx: Math.max(0, scrollW - vw), clipped: uniq.slice(0, 6), untranslated: untranslated.slice(0, 6) };
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
        for (const lang of LANGS) {
          const ctx = await browser.newContext({
            viewport: { width, height: Math.round(width * 2.1) },
            deviceScaleFactor: 3, isMobile: width < 768, hasTouch: true,
          });
          const page = await ctx.newPage();
          // Block analytics beacon — localhost origin returns 403 from logEvent
          // Cloud Function, which trips the >5/5min error alarm in prod.
          await page.route('**/wize-track-beacon.js', r => r.abort());
          await page.route('**/cloudfunctions.net/logEvent**', r => r.abort());
          const errs = [];
          page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
          // Pre-set wl_lang via an init script (localStorage is per-origin so
          // it has to be set after origin is known — addInitScript runs at
          // page-context creation, before any page script).
          await page.addInitScript(l => {
            try { localStorage.setItem('wl_lang', l); } catch (e) {}
          }, lang);
          let loadErr = null;
          for (let a = 0; a < 2; a++) {
            try { await page.goto(BASE + app.path, { waitUntil: 'domcontentloaded', timeout: 35000 }); loadErr = null; break; }
            catch (e) { loadErr = String(e).slice(0, 70); }
          }
          await page.waitForTimeout(1800);
          let layout, missing;
          try { layout = await page.evaluate(evalClipAndUntranslated); } catch (e) { layout = { error: String(e).slice(0, 70) }; }
          try { missing = await checkRequired(page, app.requires); } catch (e) { missing = ['eval ' + e.message.slice(0,60)]; }
          const probs = [];
          if (loadErr) probs.push('load failed: ' + loadErr);
          if (layout && layout.horizOverflow) probs.push('H-OVERFLOW +' + layout.overflowPx + 'px');
          if (layout && layout.clipped && layout.clipped.length) probs.push('CLIPPED: ' + layout.clipped.map(c => `${c.el}["${c.txt}"]→${c.clipped}`).join(' | '));
          if (layout && layout.untranslated && layout.untranslated.length) probs.push('UNTRANSLATED(HE-leak): ' + layout.untranslated.map(u => `${u.key}="${u.txt}"`).join(', '));
          if (missing && missing.length) probs.push('REQ ' + missing.join(','));
          // Filter out known localhost-only false positives: the wize-track-beacon
          // CORS error fetching the prod Cloud Function from a localhost origin.
          const realErrs = errs.filter(e =>
            !/logEvent|finzilla-7f1f9\.cloudfunctions/.test(e) &&
            !/sw\.js due to access control/.test(e)
          );
          if (realErrs.length) probs.push('JS ERR: ' + JSON.stringify(realErrs.slice(0, 2)));
          results.push({ app: app.name, lang, engine: engine.name, width, probs });
          await ctx.close();
        }
      }
    }
    await browser.close();
  }
  const failed = results.filter(r => r.probs.length);
  const byApp = {};
  for (const r of results) (byApp[r.app] = byApp[r.app] || []).push(r);
  console.log('\n=== Landing-Pages Matrix Check (4 languages) ===');
  console.log(`Widths: ${WIDTHS.join(', ')}px | Engines: Chromium + WebKit | Langs: ${LANGS.join('/')}`);
  console.log(`Combinations: ${results.length} | Failing: ${failed.length}\n`);
  for (const app of Object.keys(byApp)) {
    const bad = byApp[app].filter(r => r.probs.length);
    if (!bad.length) { console.log(`✅ ${app} — clean across all ${byApp[app].length} combinations`); continue; }
    console.log(`🚨 ${app}`);
    for (const r of bad) console.log(`   - ${r.lang}/${r.engine} @${r.width}px: ${r.probs.join(' ; ')}`);
  }
  console.log('\n' + (failed.length ? `🚨 ${failed.length} combination(s) FAILED` : '✅ all combinations passed') + '\n');
  process.exit(failed.length ? 1 : 0);
})();
