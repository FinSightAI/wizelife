#!/usr/bin/env node
/* digital-nomad-matrix.js — 4-language matrix for /p/digital-nomad.html
 *
 * Tests on a LOCAL server (port 8765) so we can validate uncommitted changes
 * before push. Same width × engine × language sweep as landing-matrix-4lang.js.
 */
const path = require('path');
const { chromium, webkit } = require(path.join(__dirname, '..', 'node_modules', 'playwright'));

const BASE = 'http://localhost:8765';
const APP = { name: 'digital-nomad', path: '/p/digital-nomad.html',
  requires: ['#country', '#days', '#employerIL', '#maxSafe', '#zones', '#grid', '#shareWrap'] };

const WIDTHS = [320, 360, 390, 414, 768];
const ENGINES = [{ name: 'Chromium', launcher: chromium }, { name: 'WebKit', launcher: webkit }];
const LANGS = ['he', 'en', 'pt', 'es'];

function evalCheck() {
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
    let inOffscreen = false;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(ps.overflowX)) { inOffscreen = true; break; }
      if (ps.position === 'fixed' || ps.position === 'absolute' || ps.transform !== 'none') {
        const pr = p.getBoundingClientRect();
        if (pr.right <= 1 || pr.left >= vw - 1) { inOffscreen = true; break; }
      }
    }
    if (inOffscreen) continue;
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

  const docLang = document.documentElement.getAttribute('lang') || 'he';
  const untranslated = [];
  if (docLang !== 'he') {
    const ALLOWED = ['חוק ההסדרים', 'בל"מ'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      let txt = (el.textContent || '').trim();
      for (const n of ALLOWED) txt = txt.split(n).join('');
      if (/[֐-׿]/.test(txt)) untranslated.push({ key: el.getAttribute('data-i18n'), txt: (el.textContent || '').trim().slice(0, 32) });
    });
  }

  // Sanity: confirm verdict actually rendered (NOMAD_DATA loaded). The new
  // single-number hero exposes `#maxNum`; the 4-zone axis exposes `.zone`
  // children inside `#axis`. Both should populate from the data file.
  const maxNum = (document.querySelector('#maxNum') || {}).textContent || '';
  const zoneCount = document.querySelectorAll('#axis .zone').length;
  const gridCells = document.querySelectorAll('.gcell').length;
  return { vw, horizOverflow: scrollW > vw + 2, overflowPx: Math.max(0, scrollW - vw), clipped: uniq.slice(0, 6), untranslated: untranslated.slice(0, 6), maxNum: maxNum.trim(), zoneCount, gridCells };
}

async function checkRequired(page, sels) {
  return await page.evaluate((sels) => {
    const missing = [];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) { missing.push(sel + ' MISSING'); continue; }
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) missing.push(sel + ' zero-size');
    }
    return missing;
  }, sels);
}

(async () => {
  const results = [];
  for (const engine of ENGINES) {
    const browser = await engine.launcher.launch();
    for (const width of WIDTHS) {
      for (const lang of LANGS) {
        const ctx = await browser.newContext({
          viewport: { width, height: Math.round(width * 2.1) },
          deviceScaleFactor: 3, isMobile: width < 768, hasTouch: true,
        });
        const page = await ctx.newPage();
        await page.route('**/wize-track-beacon.js', r => r.abort());
        await page.route('**/cloudfunctions.net/logEvent**', r => r.abort());
        const errs = [];
        page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
        await page.addInitScript(l => { try { localStorage.setItem('wl_lang', l); } catch (e) {} }, lang);
        let loadErr = null;
        for (let a = 0; a < 2; a++) {
          try { await page.goto(BASE + APP.path, { waitUntil: 'domcontentloaded', timeout: 35000 }); loadErr = null; break; }
          catch (e) { loadErr = String(e).slice(0, 70); }
        }
        await page.waitForTimeout(1800);
        let layout, missing;
        try { layout = await page.evaluate(evalCheck); } catch (e) { layout = { error: String(e).slice(0, 70) }; }
        try { missing = await checkRequired(page, APP.requires); } catch (e) { missing = ['eval ' + e.message.slice(0,60)]; }
        const probs = [];
        if (loadErr) probs.push('load failed: ' + loadErr);
        if (layout && layout.horizOverflow) probs.push('H-OVERFLOW +' + layout.overflowPx + 'px');
        if (layout && layout.clipped && layout.clipped.length) probs.push('CLIPPED: ' + layout.clipped.map(c => `${c.el}["${c.txt}"]→${c.clipped}`).join(' | '));
        if (layout && layout.untranslated && layout.untranslated.length) probs.push('UNTRANSLATED(HE-leak): ' + layout.untranslated.map(u => `${u.key}="${u.txt}"`).join(', '));
        if (layout && (!layout.maxNum || layout.maxNum === '—')) probs.push('MAX-NUM empty (NOMAD_DATA load failed?)');
        if (layout && layout.zoneCount === 0) probs.push('AXIS EMPTY (zones not built)');
        if (layout && layout.gridCells < 12) probs.push('GRID INCOMPLETE: ' + layout.gridCells + ' cells');
        if (missing && missing.length) probs.push('REQ ' + missing.join(','));
        const realErrs = errs.filter(e =>
          !/logEvent|finzilla-7f1f9\.cloudfunctions/.test(e) &&
          !/sw\.js due to access control/.test(e)
        );
        if (realErrs.length) probs.push('JS ERR: ' + JSON.stringify(realErrs.slice(0, 2)));
        results.push({ lang, engine: engine.name, width, probs });
        await ctx.close();
      }
    }
    await browser.close();
  }
  const failed = results.filter(r => r.probs.length);
  console.log(`\n=== Digital-Nomad Matrix (${LANGS.join('/')}) ===`);
  console.log(`Combinations: ${results.length} | Failing: ${failed.length}\n`);
  if (!failed.length) console.log(`✅ ${APP.name} — clean across all ${results.length} combinations`);
  else for (const r of failed) console.log(`🚨 ${r.lang}/${r.engine} @${r.width}px: ${r.probs.join(' ; ')}`);
  console.log('\n' + (failed.length ? `🚨 ${failed.length} combination(s) FAILED` : '✅ all combinations passed') + '\n');
  process.exit(failed.length ? 1 : 0);
})();
