// mobile-overlap-check.js
// Cross-app mobile-layout regressions, 390px Chromium:
//  1) ANY position:fixed floating control in the bottom ~140px overlapping the
//     fixed bottom-nav (the "?" help-button-over-Home class of bug).
//  2) WizeHealth only: side-drawer top content behind the top HUD bar.
//  3) WizeHealth only: share.html header vs body background homogeneity.
// Reports action items only.
const { chromium } = require('playwright');

const APPS = [
  { name: 'WizeLife',  url: 'https://wizelife.ai' },
  { name: 'WizeMoney', url: 'https://money.wizelife.ai' },
  { name: 'WizeTax',   url: 'https://tax.wizelife.ai' },
  { name: 'WizeTravel',url: 'https://travel.wizelife.ai' },
  { name: 'WizeDeal',  url: 'https://deal.wizelife.ai' },
  { name: 'WizeHealth',url: 'https://health.wizelife.ai' },
];

async function dismissFirstRun(p) {
  await p.evaluate(() => { document.querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }); });
  await p.waitForTimeout(150);
  for (const sel of ['button:has-text("המשך לאפליקציה")', 'button:has-text("Continue")', 'button:has-text("אישור")', '.mbtn-p']) {
    const el = await p.$(sel).catch(() => null); if (el) { await el.click({ force: true }).catch(() => {}); await p.waitForTimeout(250); }
  }
  await p.evaluate(() => { document.querySelectorAll('.overlay,[id*=onboard],[id*=quickstart],[id*=wlQuickStart]').forEach(o => { o.style.display = 'none'; o.classList && o.classList.add('hidden'); }); });
  await p.waitForTimeout(200);
}

async function checkBottomOverlap(p) {
  return await p.evaluate(() => {
    const vh = window.innerHeight, vw = window.innerWidth;
    const els = [...document.querySelectorAll('*')];
    // find the fixed bottom-nav: a fixed/sticky bar pinned near the viewport bottom, full-ish width, short.
    let nav = null, navArea = 0;
    for (const el of els) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      const r = el.getBoundingClientRect();
      if (r.width < vw * 0.6 || r.height > 110 || r.height < 30) continue;
      if (r.bottom < vh - 6 || r.top > vh - 30) continue;
      const a = r.width * r.height;
      if (a > navArea) { navArea = a; nav = { el, r }; }
    }
    if (!nav) return { nav: false };
    const navTop = nav.r.top;
    // find floating controls overlapping the nav
    const offenders = [];
    for (const el of els) {
      if (el === nav.el || nav.el.contains(el) || el.contains(nav.el)) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.width > vw * 0.7 || r.height > 160) continue;
      // small floating widget that dips into the nav band
      if (r.bottom > navTop + 2 && r.top < vh - 2 && r.top > navTop - 160) {
        const label = (el.textContent || '').trim().slice(0, 16) || el.id || el.className.toString().slice(0, 24) || el.tagName;
        offenders.push({ label, bottom: Math.round(r.bottom), navTop: Math.round(navTop) });
      }
    }
    return { nav: true, navTop: Math.round(navTop), offenders: offenders.slice(0, 6) };
  });
}

(async () => {
  const fails = [], warns = [];
  const b = await chromium.launch();
  try {
    for (const app of APPS) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL' });
      const p = await ctx.newPage();
      try {
        await p.goto(app.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
        await p.waitForTimeout(2200);
        await dismissFirstRun(p);
        const o = await checkBottomOverlap(p);
        if (!o.nav) {
          warns.push(`${app.name}: no fixed bottom-nav detected (skipped overlap check).`);
        } else if (o.offenders && o.offenders.length) {
          o.offenders.forEach(off => fails.push(`${app.name}: floating "${off.label}" (bottom ${off.bottom}px) overlaps bottom-nav (top ${off.navTop}px). Raise it above the nav.`));
        }

        if (app.name === 'WizeHealth') {
          await p.evaluate(() => { if (typeof toggleDrawer === 'function') toggleDrawer(); });
          await p.waitForTimeout(600);
          const d = await p.evaluate(() => {
            const a = document.querySelector('aside'); if (!a) return null;
            const hud = document.querySelector('#wize-bar,[class*=wize-bar],[id*=wize-bar]');
            const hudBottom = hud ? hud.getBoundingClientRect().bottom : 36;
            const first = a.querySelector('.lang-pill,[class*=lang],[data-lang],#wl-theme-toggle-drawer');
            return { hudBottom: Math.round(hudBottom), firstTop: first ? Math.round(first.getBoundingClientRect().top) : null };
          });
          if (d && d.firstTop != null && d.firstTop < d.hudBottom) {
            fails.push(`WizeHealth: drawer top content (top ${d.firstTop}px) behind HUD bar (bottom ${d.hudBottom}px). Add padding-top to <aside>.`);
          }
          const p2 = await ctx.newPage();
          await p2.goto(app.url + '/share.html', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
          await p2.waitForTimeout(700);
          const sh = await p2.evaluate(() => { const h = document.querySelector('header'); return h ? { hb: getComputedStyle(h).backgroundColor, bb: getComputedStyle(document.body).backgroundColor } : null; });
          if (sh && sh.hb !== sh.bb && !/rgba\(.*0\)$/.test(sh.hb)) {
            warns.push(`WizeHealth share.html: header bg ${sh.hb} != body ${sh.bb} (verify it still looks homogeneous).`);
          }
          await p2.close().catch(() => {});
        }
      } catch (e) {
        warns.push(`${app.name}: check crashed — ${e.message}`);
      } finally {
        await ctx.close().catch(() => {});
      }
    }
  } finally {
    await b.close();
  }

  console.log('# mobile-overlap-check (cross-app)');
  if (fails.length) { console.log('\n## For Claude to fix'); fails.forEach((m, i) => console.log(`${i + 1}. ${m}`)); }
  if (warns.length) { console.log('\n## For you to investigate'); warns.forEach((m, i) => console.log(`${i + 1}. ${m}`)); }
  if (!fails.length && !warns.length) console.log('\n✅ No floating-button / drawer-HUD / share overlap on any app.');
  process.exit(fails.length ? 1 : 0);
})();
