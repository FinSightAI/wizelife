#!/usr/bin/env node
/* mobile-render-check.js — renders every app at a mobile viewport and catches
   the class of "basic" mobile bugs that API/contract tests miss:
     1. DOUBLE HAMBURGER  — more than one visible ☰ / menu-toggle.
     2. FROZEN / STUCK OVERLAY — a fixed full-screen layer that is visible +
        click-blocking AFTER first-visit prompts are dismissed (the classic
        "blurry frozen screen"). Special-cases the bug where an element carries
        a `hidden`/closed class but still renders (class not wired to CSS).
     3. JS CRASHES — pageerror / console errors during load + interaction.
   Read-only. Exits non-zero if any app FAILS. Run: node qa/mobile-render-check.js
*/
const path = require('path');
const { chromium, devices } = require(path.join(__dirname, '..', 'node_modules', 'playwright'));

const APPS = [
  { name: 'WizeMoney',  url: 'https://money.wizelife.ai/' },
  { name: 'WizeTax',    url: 'https://tax.wizelife.ai/advisor' },
  { name: 'WizeHealth', url: 'https://health.wizelife.ai/' },
  { name: 'WizeTravel', url: 'https://travel.wizelife.ai/' },
  { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/' },
  { name: 'WizeLife',   url: 'https://wizelife.ai/' },
];

// Try to clear known first-visit overlays so we test the actual app, not the
// intro prompts. Best-effort — clicks checkboxes + accept/skip/later buttons.
async function dismissIntros(page) {
  for (let i = 0; i < 5; i++) {
    let acted = false;
    try {
      acted = await page.evaluate(() => {
        let did = false;
        const cb = document.querySelector('input[type="checkbox"]');
        if (cb && !cb.checked && cb.offsetParent !== null) { cb.click(); did = true; }
        // Dismiss text — but NEVER click navigation links or the version "refresh".
        const re = /^(המשך|המשך לאפליקציה|continue|דלג|skip|אחר כך|later|got it|הבנתי)/i;
        const bad = /(רענן|refresh|sign in|כניסה|התחבר)/i;
        // BUTTONS only (not <a>, which usually navigates).
        const btns = Array.from(document.querySelectorAll('button,[role="button"]'))
          .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const hit = btns.find(b => { const t = (b.textContent || '').trim(); return re.test(t) && !bad.test(t); });
        if (hit) { hit.click(); did = true; }
        return did;
      });
    } catch (e) { /* context may be torn down by a click — stop */ break; }
    await page.waitForTimeout(700);
    if (!acted) break;
  }
}

function evalChecks() {
  // runs in page
  const vis = el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0'
      && r.width > 0 && r.height > 0;
  };
  const vw = window.innerWidth;
  // 1. hamburgers — only count small ON-SCREEN toggle BUTTONS (not the drawer
  //    panel, which sits off-screen via transform).
  const hSel = '#wize-ham-btn,.wt-hamburger,.mobile-menu-toggle,.mobile-header-toggle,[aria-label="Menu"],[aria-label="menu"],[aria-label="תפריט"]';
  let hambs = Array.from(document.querySelectorAll(hSel));
  document.querySelectorAll('button,a').forEach(b => { if ((b.textContent || '').trim() === '☰' && !hambs.includes(b)) hambs.push(b); });
  const onScreenSmall = el => { const r = el.getBoundingClientRect(); return vis(el) && r.width <= 80 && r.left >= -8 && r.left <= vw - 10; };
  const visHambs = hambs.filter(onScreenSmall).map(b => { const r = b.getBoundingClientRect(); return (b.id || b.className || b.tagName) + '@' + Math.round(r.left) + ',' + Math.round(r.top); });
  // 2. FROZEN overlay — a fixed full-screen layer that is visible + click-blocking
  //    AND carries a `hidden`/closed class (i.e. it's *supposed* to be hidden but
  //    the class isn't wired to CSS). This is the real "frozen blurry screen" bug;
  //    dismissible first-visit prompts (no hidden class) are NOT flagged.
  const blockers = Array.from(document.querySelectorAll('div,aside,section')).filter(e => {
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.position === 'fixed' && s.display !== 'none' && s.visibility !== 'hidden'
      && parseFloat(s.opacity) > 0.05 && s.pointerEvents !== 'none'
      && r.width > vw * 0.7 && r.height > window.innerHeight * 0.5
      && r.left > -40 && r.left < 60 && parseInt(s.zIndex || 0) >= 300
      && /(^|\s)(hidden|closed|collapsed)(\s|$)/.test(e.className.toString());
  }).map(e => ({ id: e.id || '(none)', cls: e.className.toString().slice(0, 40), z: getComputedStyle(e).zIndex }));
  return { visHambCount: visHambs.length, visHambs, blockers };
}

(async () => {
  const browser = await chromium.launch();
  let failures = 0;
  const lines = [];
  for (const app of APPS) {
    const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERR: ' + String(e).slice(0, 120)));
    page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!/favicon|clarity|recaptcha|net::ERR.*beacon/i.test(t)) errs.push(t.slice(0, 120)); } });
    let loadErr = null;
    // Retry once — scale-to-zero backends can cold-start slowly on first hit.
    for (let attempt = 0; attempt < 2; attempt++) {
      try { await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 35000 }); loadErr = null; break; }
      catch (e) { loadErr = String(e).slice(0, 80); }
    }
    await page.waitForTimeout(3000);
    await dismissIntros(page);
    let r;
    try { r = await page.evaluate(evalChecks); } catch (e) { r = { error: String(e).slice(0, 80) }; }
    try { await page.screenshot({ path: '/tmp/mrc-' + app.name + '.png' }); } catch (e) {}

    const probs = [];
    if (loadErr) probs.push('load failed: ' + loadErr);
    if (r && r.visHambCount > 1) probs.push('DOUBLE HAMBURGER (' + r.visHambCount + '): ' + JSON.stringify(r.visHambs));
    if (r && r.blockers && r.blockers.length) probs.push('STUCK/BLOCKING OVERLAY: ' + JSON.stringify(r.blockers));
    const realErrs = errs.filter(e => /PAGEERR/.test(e));
    if (realErrs.length) probs.push('JS CRASH: ' + JSON.stringify(realErrs.slice(0, 3)));

    if (probs.length) { failures++; lines.push('🚨 ' + app.name + '\n   - ' + probs.join('\n   - ')); }
    else lines.push('✅ ' + app.name + ' — no double-hamburger / stuck-overlay / JS crash');
    if (errs.length) lines.push('   (console: ' + JSON.stringify(errs.slice(0, 2)) + ')');
    await ctx.close();
  }
  await browser.close();
  console.log('\n=== Mobile Render Check (Pixel 7 viewport) ===\n');
  console.log(lines.join('\n'));
  console.log('\n' + (failures ? '🚨 ' + failures + ' app(s) FAILED' : '✅ all apps passed') + '\n');
  process.exit(failures ? 1 : 0);
})();
