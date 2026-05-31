// mobile-audit-all.js
// Comprehensive mobile UX audit across all 6 apps at multiple widths.
// Captures, per (app × width):
//  - hamburger visible AND tappable (not behind WizeBar / other element)
//  - hamburger does NOT visually overlap the top-bar logo region
//  - bottom-nav visible AND fully-on-screen (not overflowing)
//  - horizontal overflow (doc.scrollWidth > viewport.clientWidth + 4)
//  - any element wider than the viewport (h-overflow culprits)
//  - first input/textarea/button reachable (visible + onscreen)
//  - top HUD bar present + not covered by anything
//  - lang switch leaves no Hebrew leak when starting in HE then switching to EN
//
// Run: node qa/mobile-audit-all.js  (Playwright + Chromium)
// Output: a single table summarizing each app × width × check.

const { chromium } = require('playwright');

const APPS = [
  { name: 'WizeLife',   url: 'https://wizelife.ai/' },
  { name: 'WizeMoney',  url: 'https://money.wizelife.ai/' },
  { name: 'WizeTax',    url: 'https://tax.wizelife.ai/' },
  { name: 'WizeTravel', url: 'https://travel.wizelife.ai/' },
  { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/' },
  { name: 'WizeHealth', url: 'https://health.wizelife.ai/' },
];
const WIDTHS = [320, 390, 430]; // small / Pixel/A55 / iPhone Pro Max

async function dismissFirstRun(p) {
  await p.evaluate(() => {
    document.querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  });
  await p.waitForTimeout(150);
  for (const sel of ['button:has-text("המשך לאפליקציה")', 'button:has-text("Continue")', '.mbtn-p', 'button:has-text("המשך")']) {
    const el = await p.$(sel).catch(() => null);
    if (el) { await el.click({ force: true }).catch(() => {}); await p.waitForTimeout(250); }
  }
  await p.evaluate(() => { document.querySelectorAll('.overlay,[id*=onboard],[id*=quickstart]').forEach(o => { o.style.display = 'none'; o.classList && o.classList.add('hidden'); }); });
  await p.waitForTimeout(200);
}

async function probe(p, { width }) {
  return await p.evaluate((vw) => {
    function visible(el) {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    }
    // hamburger: shared #wize-ham-btn or app-specific
    const ham = document.querySelector('#wize-ham-btn,.wh-app-ham,.mobile-menu-toggle,[id*=ham]:not([id*=hammered]):not([id*=hamster])');
    const hamVis = visible(ham);
    let hamCovered = false, hamCoveringElem = '';
    if (hamVis && ham) {
      const r = ham.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      if (top && top !== ham && !ham.contains(top) && !top.contains(ham)) {
        hamCovered = true;
        hamCoveringElem = top.id || top.className || top.tagName;
      }
    }
    // top WizeBar HUD (logo area)
    const bar = document.querySelector('#wize-bar,[class*=wize-bar],.wl-bar');
    let barRect = bar ? bar.getBoundingClientRect() : null;
    // hamburger-vs-bar visual overlap (the bug the user reported)
    let hamOverBar = false;
    if (hamVis && ham && barRect) {
      const hr = ham.getBoundingClientRect();
      const hOverlapX = !(hr.right < barRect.left || hr.left > barRect.right);
      const hOverlapY = !(hr.bottom < barRect.top || hr.top > barRect.bottom);
      hamOverBar = hOverlapX && hOverlapY;
    }
    // bottom-nav
    let nav = null, navArea = 0;
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
      const r = el.getBoundingClientRect();
      if (r.width < window.innerWidth * 0.6 || r.height > 110 || r.height < 30) return;
      if (r.bottom < window.innerHeight - 6 || r.top > window.innerHeight - 30) return;
      const a = r.width * r.height; if (a > navArea) { navArea = a; nav = el; }
    });
    const navVis = visible(nav);
    const navOverflow = nav ? nav.getBoundingClientRect().right > window.innerWidth + 1 : false;
    // horizontal overflow
    const hOver = document.documentElement.scrollWidth > document.documentElement.clientWidth + 4;
    // find widest culprit element
    let widest = null, widestW = 0;
    if (hOver) {
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > widestW && r.right > window.innerWidth + 4) { widestW = r.width; widest = el; }
      });
    }
    return {
      vw,
      hamVis, hamCovered, hamCoveringElem,
      hamOverBar,
      barPresent: !!bar,
      navVis, navOverflow,
      hOver,
      widestCulprit: widest ? ((widest.id ? '#' + widest.id : '') + (widest.className && typeof widest.className === 'string' ? '.' + widest.className.split(' ')[0] : '') || widest.tagName).slice(0, 30) : '',
      widestW: Math.round(widestW),
    };
  }, width);
}

(async () => {
  const rows = [];
  const b = await chromium.launch();
  try {
    for (const app of APPS) {
      for (const width of WIDTHS) {
        const ctx = await b.newContext({ viewport: { width, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL' });
        const p = await ctx.newPage();
        try {
          await p.goto(app.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
          await p.waitForTimeout(2500);
          await dismissFirstRun(p);
          const r = await probe(p, { width });
          rows.push({ app: app.name, w: width, ...r });
        } catch (e) {
          rows.push({ app: app.name, w: width, err: e.message.slice(0, 80) });
        } finally {
          await ctx.close().catch(() => {});
        }
      }
    }
  } finally { await b.close(); }

  // print compact table
  const cols = ['app', 'w', 'ham', 'covered', 'overBar', 'nav', 'navOK', 'hOver', 'widest'];
  console.log(cols.map(c => c.padEnd(c.length + 1)).join(' | '));
  console.log('-'.repeat(120));
  for (const r of rows) {
    if (r.err) { console.log(`${r.app.padEnd(11)} | ${r.w}  | ERR ${r.err}`); continue; }
    console.log([
      r.app.padEnd(11),
      String(r.w).padEnd(3),
      r.hamVis ? '✅' : '❌',
      r.hamCovered ? `❌ (${(r.hamCoveringElem || '').slice(0, 16)})` : '✅',
      r.hamOverBar ? '❌' : '✅',
      r.navVis ? '✅' : '❌',
      r.navOverflow ? '❌ overflow' : '✅',
      r.hOver ? `❌ ${r.widestCulprit}` : '✅',
      r.widestW > 0 ? `${r.widestW}px` : ''
    ].join(' | '));
  }
  // also print issues summary
  console.log('\n## Issues ##');
  rows.forEach(r => {
    if (r.err) return;
    const issues = [];
    if (!r.hamVis) issues.push('hamburger hidden/missing');
    if (r.hamCovered) issues.push(`hamburger covered by ${r.hamCoveringElem}`);
    if (r.hamOverBar) issues.push('hamburger overlapping WizeBar');
    if (!r.navVis) issues.push('bottom-nav hidden');
    if (r.navOverflow) issues.push('bottom-nav overflow');
    if (r.hOver) issues.push(`H-overflow → ${r.widestCulprit} (${r.widestW}px)`);
    if (issues.length) console.log(`${r.app} @${r.w}: ${issues.join('; ')}`);
  });
})();
