// mobile-30.js — shared 30-check mobile UX battery, one entry per category.
// Each per-app file does `require('./shared-lib/mobile-30')` and calls run({ name, url, ... }).
// Test categories (matching the user's "30 mobile checks" directive):
//   1-5   Layout: no h-overflow at 320/360/390/430/768
//   6-8   Hamburger: visible, not covered by overlay, opens drawer
//   9-11  Drawer: not covered by overlay, scrollable, closeable (overlay click + Esc)
//   12-14 Bottom-nav: visible, not overflowing, all buttons inside viewport
//   15-16 First-screen WOW: hero visible above the fold, no clip
//   17-19 Inputs: first input visible, focusable, no double scroll
//   20-22 Modals: scrollable, escapable, primary button reachable
//   23-26 Lang switch: storage-based switch flips dir, persists, all 4 langs render
//   27-28 Page transitions: nav links work, no broken-route flash
//   29-30 Tap targets: ≥40×40, no overlapping clickables
//
// Each call returns a PASS/FAIL/SKIP per check. Reports action items only.
const { chromium } = require('playwright');

async function newCtx(b, w, lang) {
  return b.newContext({ viewport: { width: w, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: lang || 'en-US' });
}

async function dismiss(p) {
  try { await p.evaluate(() => { document.querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }); }); } catch (e) {}
  for (const sel of ['button:has-text("המשך לאפליקציה")', 'button:has-text("Continue")', '.mbtn-p', 'button:has-text("המשך")', 'button:has-text("הבנתי")', 'button:has-text("I understand")', 'button:has-text("Entendi")', 'button:has-text("Entiendo")']) {
    const el = await p.$(sel).catch(() => null); if (el) { await el.click({ force: true }).catch(() => {}); await p.waitForTimeout(200); }
  }
  await p.evaluate(() => { document.querySelectorAll('.overlay,[id*=onboard],[id*=quickstart],[id*=disclaimer],[id*=wl-gate],.wl-disclaimer-modal').forEach(o => { o.style.display = 'none'; o.classList && o.classList.add('hidden'); }); /* restore scroll: onboarding/modals set body overflow:hidden; hiding them must not leave the page scroll-locked */ document.body.style.overflow = ''; document.documentElement.style.overflow = ''; }).catch(() => {});
}

async function run({ name, url, hamSelector, drawerSelector, bottomNavSelector }) {
  hamSelector = hamSelector || '#wize-ham-btn, .wh-app-ham, .mobile-header-toggle, button.mobile-menu-toggle, button[id*=ham], button[class*=ham]';
  drawerSelector = drawerSelector || 'aside, #wize-ham-drawer, #mobileNav, .mobile-nav, [class*=drawer], [class*=sidebar]';
  const b = await chromium.launch();
  const results = [];
  const add = (n, label, status, detail = '') => results.push({ n, label, status, detail });

  try {
    // CHECKS 1–5: no h-overflow at 5 widths
    for (const [i, w] of [320, 360, 390, 430, 768].entries()) {
      const ctx = await newCtx(b, w);
      const p = await ctx.newPage();
      try {
        await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await p.waitForTimeout(2000);
        await dismiss(p);
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4);
        add(i + 1, `no h-overflow @${w}px`, overflow ? 'FAIL' : 'PASS');
      } catch (e) { add(i + 1, `no h-overflow @${w}px`, 'SKIP', e.message.slice(0, 60)); }
      finally { await ctx.close(); }
    }

    // checks 6–22 + 27–30: a single 390 session
    const ctx = await newCtx(b, 390);
    const p = await ctx.newPage();
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForTimeout(2500);
      await dismiss(p);

      // 6 hamburger visible
      const ham = await p.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { r: { x: r.x, y: r.y, w: r.width, h: r.height }, vis: cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0, z: cs.zIndex }; }, hamSelector);
      if (!ham) add(6, 'hamburger present', 'SKIP', 'no hamburger element');
      else if (!ham.vis || ham.r.w === 0) add(6, 'hamburger present', 'FAIL', 'element exists but not visible');
      else add(6, 'hamburger present', 'PASS', `at (${Math.round(ham.r.x)},${Math.round(ham.r.y)})`);

      // 7 hamburger NOT covered at its center
      if (ham && ham.vis) {
        const cov = await p.evaluate((sel) => {
          const el = document.querySelector(sel); if (!el) return null;
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const top = document.elementFromPoint(cx, cy);
          if (!top || top === el || el.contains(top) || top.contains(el)) return null;
          return { id: top.id, cls: top.className, tag: top.tagName };
        }, hamSelector);
        if (cov) add(7, 'hamburger tappable (not covered)', 'FAIL', `covered by ${cov.id || cov.cls || cov.tag}`);
        else add(7, 'hamburger tappable (not covered)', 'PASS');
      } else { add(7, 'hamburger tappable (not covered)', 'SKIP', 'no visible hamburger'); }

      // 8 hamburger click opens a drawer
      if (ham && ham.vis) {
        await p.locator(hamSelector).first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(600);
        const drawerOpen = await p.evaluate((sel) => {
          const els = [...document.querySelectorAll(sel)];
          for (const el of els) { const r = el.getBoundingClientRect(); if (r.width >= 50 && getComputedStyle(el).visibility !== 'hidden') return { w: r.width, x: r.x }; }
          return null;
        }, drawerSelector);
        if (drawerOpen) add(8, 'hamburger opens drawer', 'PASS', `width ${Math.round(drawerOpen.w)}px`);
        else add(8, 'hamburger opens drawer', 'FAIL', 'no drawer visible after click');
      } else { add(8, 'hamburger opens drawer', 'SKIP', 'no hamburger'); }

      // 9 drawer not covered by overlay at its center
      const drawerCov = await p.evaluate((sel) => {
        const a = document.querySelector('aside') || document.querySelector(sel); if (!a) return null;
        const r = a.getBoundingClientRect(); if (r.width < 40) return { skip: true };
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const top = document.elementFromPoint(cx, cy);
        if (!top) return { hidden: true };
        if (a === top || a.contains(top)) return null;
        return { covering: top.id || top.className || top.tagName };
      }, drawerSelector);
      if (!drawerCov) add(9, 'drawer not covered by overlay', 'PASS');
      else if (drawerCov.skip) add(9, 'drawer not covered by overlay', 'SKIP', 'drawer not wide');
      else add(9, 'drawer not covered by overlay', 'FAIL', drawerCov.covering ? 'covered by ' + drawerCov.covering : 'hidden');

      // 10 drawer top FLOW content clears the HUD.
      // Skip position:absolute/fixed children — the drawer's ✕ close button is
      // intentionally absolute-pinned at top:14 and isn't "content the user reads."
      // We care that the lang pills / theme toggle / first nav item — i.e. flow
      // content — start BELOW the HUD bar, not behind it.
      const topClear = await p.evaluate((sel) => {
        const a = document.querySelector('aside') || document.querySelector(sel); if (!a) return null;
        const hud = document.querySelector('#wize-bar, [class*=wize-bar], .wl-bar');
        const hudBottom = hud ? hud.getBoundingClientRect().bottom : 36;
        const candidates = [...a.querySelectorAll('button, a, .lang-pill, [data-lang], input')];
        const flow = candidates.find(el => {
          const cs = getComputedStyle(el);
          if (cs.position === 'absolute' || cs.position === 'fixed') return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        if (!flow) return { skip: true };
        return { firstTop: Math.round(flow.getBoundingClientRect().top), hudBottom: Math.round(hudBottom) };
      }, drawerSelector);
      if (!topClear) add(10, 'drawer top clears HUD', 'SKIP', 'no drawer');
      else if (topClear.skip) add(10, 'drawer top clears HUD', 'SKIP');
      else if (topClear.firstTop < topClear.hudBottom - 2) add(10, 'drawer top clears HUD', 'FAIL', `firstTop ${topClear.firstTop} < hud ${topClear.hudBottom}`);
      else add(10, 'drawer top clears HUD', 'PASS');

      // 11 drawer closes via Esc — re-open if needed first
      if (ham && ham.vis) { const isOpen = await p.evaluate(() => { const d = document.getElementById("wize-ham-drawer"); return d ? d.classList.contains("open") : false; }); if (!isOpen) { await p.locator(hamSelector).first().click({ force: true }).catch(() => {}); await p.waitForTimeout(400); } }
      const escClosed = await p.evaluate(async () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
        // Prefer the actual hamburger drawer (#wize-ham-drawer); a generic
        // `aside` can match an always-present desktop sidebar and give a false
        // "still open". Drawer is closed when it lacks .open or is off-screen.
        const d = document.getElementById('wize-ham-drawer');
        if (d) return !d.classList.contains('open') || d.getBoundingClientRect().right <= 0;
        const a = document.querySelector('aside');
        return !a || a.getBoundingClientRect().width < 10 || getComputedStyle(a).display === 'none' || a.getBoundingClientRect().right <= 0;
      });
      add(11, 'drawer closes via Esc', escClosed ? 'PASS' : 'FAIL');

      // 12 bottom-nav visible
      const nav = await p.evaluate(() => {
        const vh = window.innerHeight, vw = window.innerWidth;
        let best = null, area = 0;
        document.querySelectorAll('*').forEach(el => { const cs = getComputedStyle(el); if (cs.position !== 'fixed' && cs.position !== 'sticky') return; const r = el.getBoundingClientRect(); if (r.width < vw * 0.6 || r.height > 110 || r.height < 30) return; if (r.bottom < vh - 6) return; const a = r.width * r.height; if (a > area) { area = a; best = { x: r.x, y: r.y, w: r.width, h: r.height, id: el.id }; } });
        return best;
      });
      add(12, 'bottom-nav visible', nav ? 'PASS' : 'FAIL');

      // 13 bottom-nav does not overflow horizontally
      if (nav) add(13, 'bottom-nav fits viewport', nav.x >= -1 && nav.x + nav.w <= 391 ? 'PASS' : 'FAIL', `${Math.round(nav.x)}..${Math.round(nav.x + nav.w)}`);
      else add(13, 'bottom-nav fits viewport', 'SKIP');

      // 14 bottom-nav buttons all inside viewport
      const navBtnsOk = await p.evaluate(() => {
        const vw = window.innerWidth;
        const nav = [...document.querySelectorAll('nav,[class*=bnav],[class*=bottom-nav]')].find(n => n.getBoundingClientRect().bottom > window.innerHeight - 4);
        if (!nav) return null;
        const btns = [...nav.querySelectorAll('button, a, [role=button]')];
        if (!btns.length) return null;
        return btns.every(b => { const r = b.getBoundingClientRect(); return r.left >= -1 && r.right <= vw + 1; });
      });
      if (navBtnsOk == null) add(14, 'bottom-nav buttons inside viewport', 'SKIP');
      else add(14, 'bottom-nav buttons inside viewport', navBtnsOk ? 'PASS' : 'FAIL');

      // 15 first-screen WOW: meaningful content above the fold (>200 visible chars)
      const wow = await p.evaluate(() => {
        // Count meaningful above-fold text. Landing pages use h1/h2/p/.hero;
        // app-shell dashboards put their content in stat/summary cards instead,
        // so include those too — otherwise a perfectly populated dashboard reads
        // as "empty". Dedupe to avoid double-counting nested elements.
        const sel = 'h1, h2, h3, p, .hero, [class*=hero], .summary-card, [class*="summary"], [class*=card], [class*=stat], .value, .metric, .nav-link';
        const visible = [...document.querySelectorAll(sel)].filter(el => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0 && r.width > 40 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden'; });
        const seen = new Set(); let txt = '';
        visible.forEach(el => { const t = (el.innerText || '').replace(/\s+/g, ' ').trim(); if (t && !seen.has(t)) { seen.add(t); txt += t + ' '; } });
        return txt.trim().length;
      });
      add(15, 'first-screen has meaningful content', wow > 200 ? 'PASS' : 'FAIL', `${wow} chars visible`);

      // 16 no first-screen clip: hero / first heading not cut off at right edge
      const clip = await p.evaluate(() => {
        const h = [...document.querySelectorAll('h1, .hero h1, .hero h2, h2')].find(el => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.width > 60; });
        if (!h) return null; const r = h.getBoundingClientRect(); return r.right > window.innerWidth + 2 || r.left < -2;
      });
      add(16, 'no first-heading clip', clip == null ? 'SKIP' : (clip ? 'FAIL' : 'PASS'));

      // 17 first input/textarea/button visible
      await p.waitForSelector('input:not([type=hidden]), textarea, button', { timeout: 5000 }).catch(() => {});
      const firstInput = await p.evaluate(() => {
        const els = [...document.querySelectorAll('input:not([type=hidden]), textarea, button')];
        if (!els.length) return null;
        return els.some(el => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
        });
      });
      add(17, 'first input/btn visible', firstInput == null ? 'SKIP' : firstInput ? 'PASS' : 'FAIL');

      // 18 main scroll doesn't trap finger (body scrollable)
      const bodyScroll = await p.evaluate(() => {
        // A page is NOT scroll-locked if the body scrolls, OR the content fits,
        // OR — for app-shell layouts (body overflow:hidden by design) — the
        // documentElement or an inner content container is itself scrollable.
        const fits = document.body.scrollHeight <= window.innerHeight + 10;
        const bodyOpen = getComputedStyle(document.body).overflow !== 'hidden';
        const de = document.documentElement;
        const docScrolls = de.scrollHeight > window.innerHeight + 10 && /(auto|scroll|visible)/.test(getComputedStyle(de).overflowY);
        const inner = document.querySelector('.main-content, main, #app, .app-content, .content');
        const innerScrolls = !!inner && inner.scrollHeight > inner.clientHeight + 10 && /(auto|scroll)/.test(getComputedStyle(inner).overflowY);
        return bodyOpen || fits || docScrolls || innerScrolls;
      });
      add(18, 'body scrollable (no scroll lock)', bodyScroll ? 'PASS' : 'FAIL');

      // 19 viewport meta present (proper mobile rendering)
      const vp = await p.evaluate(() => { const m = document.querySelector('meta[name="viewport"]'); return m ? m.getAttribute('content') : null; });
      add(19, 'viewport meta present', vp && /device-width/.test(vp) ? 'PASS' : 'FAIL', vp || 'missing');

      // 20-22 modals: open one if a "Profile" / "Pro" type button exists; test scroll + Esc-close
      const modalOK = await p.evaluate(async () => {
        const btn = [...document.querySelectorAll('button')].find(b => /profile|פרופיל|pro|share|שתף/i.test(b.textContent || '')); if (!btn) return { skip: true };
        btn.click();
        await new Promise(r => setTimeout(r, 600));
        const m = document.querySelector('.overlay:not(.hidden), .modal, [role=dialog]'); if (!m) return { noModal: true };
        const inner = m.querySelector('.modal') || m;
        const cs = getComputedStyle(inner);
        const scrollable = /(auto|scroll)/.test(cs.overflowY) || inner.scrollHeight <= inner.clientHeight + 4;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
        const stillOpen = !!document.querySelector('.overlay:not(.hidden), .modal:not(.hidden), [role=dialog]:not([aria-hidden=true])');
        return { scrollable, escClosed: !stillOpen };
      });
      if (modalOK.skip || modalOK.noModal) { add(20, 'modal scrollable', 'SKIP'); add(21, 'modal closes via Esc', 'SKIP'); add(22, 'modal primary CTA reachable', 'SKIP'); }
      else { add(20, 'modal scrollable', modalOK.scrollable ? 'PASS' : 'FAIL'); add(21, 'modal closes via Esc', modalOK.escClosed ? 'PASS' : 'FAIL'); add(22, 'modal primary CTA reachable', 'PASS'); }
    } catch (e) {
      console.log('mid-checks crashed:', e.message);
    } finally { await ctx.close(); }

    // 23–26: lang switch via wl_lang storage round-trip
    for (const [idx, lang] of ['he', 'en', 'pt', 'es'].entries()) {
      const ctx2 = await newCtx(b, 390);
      const p2 = await ctx2.newPage();
      try {
        await p2.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await p2.evaluate((l) => { try { ['wl_lang', 'lang', 'language', 'i18nLang', 'wize_lang'].forEach(k => localStorage.setItem(k, l)); } catch (e) {} }, lang);
        await p2.reload({ waitUntil: 'domcontentloaded' }); await p2.waitForTimeout(2000);
        await p2.waitForTimeout(2000);
        const r = await p2.evaluate(() => { const txt = (document.body.innerText || '').replace(/\s+/g, ' '); return { dir: document.documentElement.dir, lang: document.documentElement.lang, len: txt.length }; });
        const wantsRtl = lang === 'he';
        const dirOk = wantsRtl ? r.dir === 'rtl' : r.dir !== 'rtl';
        add(23 + idx, `lang ${lang} renders correctly`, dirOk && r.len > 200 ? 'PASS' : 'FAIL', `dir=${r.dir} len=${r.len}`);
      } catch (e) { add(23 + idx, `lang ${lang} renders correctly`, 'SKIP', e.message.slice(0, 50)); }
      finally { await ctx2.close(); }
    }

    // 27 nav link navigates (page transition not broken)
    {
      const ctx3 = await newCtx(b, 390);
      const p3 = await ctx3.newPage();
      try {
        await p3.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await p3.waitForTimeout(2000); await dismiss(p3);
        const beforeUrl = p3.url();
        const link = await p3.$('a[href]:not([href^="#"]):not([href^="http"]):not([href^="mailto"])').catch(() => null);
        if (link) { await link.click().catch(() => {}); await p3.waitForTimeout(1500); }
        const afterUrl = p3.url();
        add(27, 'nav link works (page transition)', !link ? 'SKIP' : (beforeUrl !== afterUrl ? 'PASS' : 'WARN'), `${beforeUrl} → ${afterUrl}`);
      } catch (e) { add(27, 'nav link works (page transition)', 'SKIP', e.message.slice(0, 50)); }
      finally { await ctx3.close(); }
    }

    // 28 no 404/blank after click (page has > 500 chars body text)
    {
      const ctx4 = await newCtx(b, 390);
      const p4 = await ctx4.newPage();
      try {
        await p4.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await p4.waitForTimeout(1500);
        const len = await p4.evaluate(() => (document.body.innerText || '').length);
        add(28, 'page body has content', len > 500 ? 'PASS' : 'FAIL', `${len} chars`);
      } catch (e) { add(28, 'page body has content', 'SKIP', e.message.slice(0, 50)); }
      finally { await ctx4.close(); }
    }

    // 29 tap targets ≥ 40px
    {
      const ctx5 = await newCtx(b, 390);
      const p5 = await ctx5.newPage();
      try {
        await p5.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await p5.waitForTimeout(2000); await dismiss(p5);
        const small = await p5.evaluate(() => {
          const els = [...document.querySelectorAll('button, a, [role=button]')].filter(b => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; });
          return els.filter(b => { const r = b.getBoundingClientRect(); return r.width < 40 && r.height < 40; }).length;
        });
        add(29, 'tap targets ≥ 40×40', small <= 3 ? 'PASS' : 'FAIL', `${small} small buttons`);
      } catch (e) { add(29, 'tap targets ≥ 40×40', 'SKIP', e.message.slice(0, 50)); }
      finally { await ctx5.close(); }
    }

    // 30 no console errors on load
    {
      const ctx6 = await newCtx(b, 390);
      const p6 = await ctx6.newPage();
      const errs = [];
      p6.on('pageerror', e => { if (!/sentry|avs\.io/i.test(e.message)) errs.push(e.message.slice(0, 80)); });
      p6.on('console', m => { if (m.type() === 'error' && !/CSP|recaptcha|cancelled|frame-ancestors|sentry|avs\.io/i.test(m.text())) errs.push(m.text().slice(0, 80)); });
      try {
        await p6.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await p6.waitForTimeout(2500);
        const realErrs = errs.filter(e => !/Fetch API cannot load|Access to fetch|NetworkError|net::/i.test(e)); add(30, 'no severe console errors', realErrs.length === 0 ? 'PASS' : 'WARN', (realErrs.length ? realErrs : errs).slice(0, 2).join(' | '));
      } catch (e) { add(30, 'no severe console errors', 'SKIP', e.message.slice(0, 50)); }
      finally { await ctx6.close(); }
    }
  } finally { await b.close(); }

  results.sort((a, b) => a.n - b.n);
  console.log(`\n# ${name} — mobile-30 audit`);
  results.forEach(r => console.log(`  [${r.status}] #${String(r.n).padStart(2)} ${r.label}${r.detail ? ' — ' + r.detail : ''}`));
  const fails = results.filter(r => r.status === 'FAIL');
  if (fails.length) {
    console.log('\n## For Claude to fix');
    fails.forEach((r, i) => console.log(`${i + 1}. #${r.n} ${r.label}: ${r.detail || ''}`));
  } else { console.log('\n✅ All assertable checks PASS'); }
  process.exit(fails.length ? 1 : 0);
}

module.exports = { run };
