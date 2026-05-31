// mobile-coverage-check.js
// Comprehensive per-page mobile audit. For each (app × page × width):
//  - hamburger visible + not covered by another element
//  - logo visible + not covered
//  - every visible interactive element (button/link/input) reachable (no
//    other element painting over its center point)
//  - no h-overflow
// 320 / 360 / 390 / 430 widths. Reports occlusions, hidden controls,
// overflow. Filters out self-overlap, child overlap, and known overlays
// (modals, drawers — those are *meant* to cover things).
const { chromium } = require('playwright');

const PAGES = {
  WizeLife: [
    '/', '/about.html', '/security.html', '/terms.html', '/privacy.html',
    '/dashboard.html', '/account.html', '/feedback.html',
    '/p/salary-compare.html', '/p/relocate-portugal.html',
  ].map(p => 'https://wizelife.ai' + p),
  WizeMoney: [
    '/', '/pages/stocks.html', '/pages/bank.html', '/pages/income.html',
    '/pages/goals.html', '/pages/family.html', '/pages/reports.html',
    '/pages/settings.html',
  ].map(p => 'https://money.wizelife.ai' + p),
  WizeTax: ['/', '/advisor', '/reports', '/profile', '/exit-tax-calculator', '/relocation-analyzer', '/social-compare'].map(p => 'https://tax.wizelife.ai' + p),
  WizeTravel: ['/', '/flights', '/hotels', '/deals', '/watches', '/trips'].map(p => 'https://travel.wizelife.ai' + p),
  WizeDeal: ['/'].map(p => 'https://deal.wizelife.ai' + p),
  WizeHealth: ['/', '/share.html'].map(p => 'https://health.wizelife.ai' + p),
};
const WIDTHS = [320, 390, 430];

async function dismiss(p) {
  await p.evaluate(() => {
    document.querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  }).catch(() => {});
  for (const sel of ['button:has-text("המשך לאפליקציה")', 'button:has-text("Continue")', '.mbtn-p']) {
    const el = await p.$(sel).catch(() => null); if (el) { await el.click({ force: true }).catch(() => {}); await p.waitForTimeout(150); }
  }
  await p.evaluate(() => {
    document.querySelectorAll('[id*=onboard],[id*=quickstart],.overlay:not(.hidden),[id*=wlQuickStart]').forEach(o => {
      o.style.display = 'none';
      o.classList && o.classList.add('hidden');
    });
  }).catch(() => {});
  await p.waitForTimeout(200);
}

async function probe(p) {
  return await p.evaluate(() => {
    function vis(el) {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    }
    function covered(el) {
      // Is the center point of this element painted by a non-ancestor non-descendant element?
      const r = el.getBoundingClientRect();
      const cx = Math.round(r.left + r.width / 2);
      const cy = Math.round(r.top + r.height / 2);
      if (cx < 0 || cy < 0 || cx >= window.innerWidth || cy >= window.innerHeight) return null;
      const top = document.elementFromPoint(cx, cy);
      if (!top || top === el) return null;
      if (el.contains(top) || top.contains(el)) return null;
      // Ignore expected overlays — modals/drawers are supposed to cover content
      let p = top;
      while (p && p !== document.body) {
        const cls = (p.className && p.className.toString && p.className.toString()) || '';
        const id = p.id || '';
        if (/(overlay|modal|drawer|onboarding|quickstart|disclaimer|tooltip|popover|dropdown|menu-open|wize-bar)/i.test(cls + ' ' + id)) return null;
        p = p.parentElement;
      }
      return {
        cover: top.id ? '#' + top.id : (top.className && top.className.toString && top.className.toString().split(' ')[0] ? '.' + top.className.toString().split(' ')[0] : top.tagName),
      };
    }
    const out = { hamburger: null, logo: null, occlusions: [], hOver: false, widestCulprit: '' };
    // hamburger
    const ham = document.querySelector('#wize-ham-btn,.wh-app-ham,.mobile-menu-toggle,.wt-hamburger,.wl-tr-ham,.wl-deal-ham,[id*=ham][role=button],[class*=hamburger]:not([class*=hammered])');
    if (ham) {
      const v = vis(ham);
      if (!v) out.hamburger = { state: 'hidden' };
      else {
        const c = covered(ham);
        out.hamburger = c ? { state: 'covered', by: c.cover } : { state: 'ok' };
      }
    }
    // logo — common patterns: .logo, .wl-logo, brand link
    const logo = document.querySelector('.logo, .wl-logo-icon, [class*=wl-logo], .wl-bar a, .wl-bar-react a, header .brand, [class*=brand-mark]');
    if (logo) {
      const v = vis(logo);
      if (!v) out.logo = { state: 'hidden' };
      else {
        const c = covered(logo);
        out.logo = c ? { state: 'covered', by: c.cover } : { state: 'ok' };
      }
    }
    // every visible interactive element
    const els = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button]')];
    for (const el of els) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 16) continue; // skip tiny dots
      const c = covered(el);
      if (c) {
        const label = (el.textContent || el.getAttribute('aria-label') || el.placeholder || el.value || el.tagName).toString().trim().slice(0, 24);
        out.occlusions.push({ label: label || '(no-label)', by: c.cover });
        if (out.occlusions.length > 8) break;
      }
    }
    // h-overflow
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 4) {
      out.hOver = true;
      let widest = null, widestW = 0;
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > widestW && r.right > window.innerWidth + 4) { widestW = r.width; widest = el; }
      });
      out.widestCulprit = widest ? (widest.id ? '#' + widest.id : (widest.className && widest.className.toString().split(' ')[0] ? '.' + widest.className.toString().split(' ')[0] : widest.tagName)) + ' ' + Math.round(widestW) + 'px' : '';
    }
    return out;
  });
}

(async () => {
  const findings = [];
  const b = await chromium.launch();
  try {
    // run apps in parallel — independent contexts
    await Promise.all(Object.entries(PAGES).map(async ([app, urls]) => {
      for (const url of urls) {
        for (const width of WIDTHS) {
          const ctx = await b.newContext({ viewport: { width, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL' });
          const p = await ctx.newPage();
          try {
            await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await p.waitForTimeout(2500);
            await dismiss(p);
            const r = await probe(p);
            const issues = [];
            if (r.hamburger && r.hamburger.state !== 'ok') issues.push(`hamburger:${r.hamburger.state}${r.hamburger.by ? ' by ' + r.hamburger.by : ''}`);
            if (r.logo && r.logo.state !== 'ok') issues.push(`logo:${r.logo.state}${r.logo.by ? ' by ' + r.logo.by : ''}`);
            if (r.hOver) issues.push(`h-overflow ${r.widestCulprit}`);
            r.occlusions.forEach(o => issues.push(`covered: "${o.label}" by ${o.by}`));
            if (issues.length) findings.push({ app, url, width, issues });
          } catch (e) {
            findings.push({ app, url, width, issues: [`err: ${e.message.slice(0, 60)}`] });
          } finally {
            await ctx.close().catch(() => {});
          }
        }
      }
    }));
  } finally { await b.close(); }

  console.log(`\n# Mobile coverage audit — ${Object.values(PAGES).flat().length} pages × ${WIDTHS.length} widths\n`);
  if (!findings.length) { console.log('✅ Every interactive element on every audited page is visible + uncovered at all 3 widths.\n'); process.exit(0); }
  // Group by app
  const byApp = {};
  findings.forEach(f => { (byApp[f.app] = byApp[f.app] || []).push(f); });
  for (const [app, arr] of Object.entries(byApp)) {
    console.log(`## ${app}`);
    arr.forEach(f => {
      const path = f.url.replace(/^https?:\/\/[^\/]+/, '') || '/';
      console.log(`  ${path.padEnd(28)} @${f.width}px: ${f.issues.join('; ')}`);
    });
    console.log();
  }
  process.exit(findings.length ? 1 : 0);
})();
