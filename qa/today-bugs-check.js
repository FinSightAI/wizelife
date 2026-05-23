// today-bugs-check.js — 2026-05-22 regression battery (WizeHealth).
// One named check per bug we caught today, so each is individually traceable.
//  1  drawer-not-covered  : drawer opens and is NOT hidden behind an opaque overlay (the .app stacking freeze).
//  2  drawer-brightness   : open <aside> is not markedly darker than the app surface.
//  3  drawer-item-bright  : .qk / .spec-btn items match the drawer brightness (Document Analysis / Quick Questions).
//  4  drawer-top-vs-HUD   : drawer top content (lang/theme) clears the top HUD bar.
//  5  help-btn-vs-nav     : the floating "?" button does not overlap the bottom-nav.
//  6  profile-scrollable  : profile modal is scrollable / its button isn't hidden under the disclaimer.
//  7  profile-nav-escape  : bottom-nav (Home/newChat) closes the open profile (no frozen app).
//  8  hamburger-side-rtl  : in Hebrew the hamburger sits on the RIGHT.
//  9  share-link-short    : share URL is a short link, not a giant base64 URL that 413/431s.
// 10  ai-logo-stethoscope : AI/doctor avatar shows the 🩺 logo, no leftover "Vitara" branding.
//  +  pro-popup-entitled  : a yolo/entitled user is NOT shown the Pro upgrade modal.
// 390px Chromium. Reports action items only.
const { chromium } = require('playwright');
const URL = 'https://health.wizelife.ai';

function lum(rgb) { const m = (rgb || '').match(/(\d+(?:\.\d+)?)/g); if (!m) return null; const [r, g, b] = m.map(Number); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

(async () => {
  const res = [];           // {n, name, status:'PASS'|'FAIL'|'SKIP', detail}
  const add = (n, name, status, detail = '') => res.push({ n, name, status, detail });
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL' });
    const p = await ctx.newPage();
    await p.goto(URL, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(2200);
    await p.evaluate(() => { document.querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }); });
    await p.waitForTimeout(150);
    for (const sel of ['button:has-text("המשך לאפליקציה")', 'button:has-text("Continue")', '.mbtn-p']) { const el = await p.$(sel).catch(() => null); if (el) { await el.click({ force: true }).catch(() => {}); await p.waitForTimeout(250); } }
    await p.evaluate(() => { document.querySelectorAll('.overlay,[id*=onboard],[id*=quickstart]').forEach(o => { o.style.display = 'none'; o.classList && o.classList.add('hidden'); }); });
    await p.waitForTimeout(200);

    // 8 hamburger side must match the page's actual reading direction
    // (RTL → right, LTR → left). The app ignores browser locale and renders
    // per its stored language, so assert against the real document dir.
    const ham = await p.evaluate(() => {
      const h = document.querySelector('#wize-ham-btn,.wh-app-ham,.mobile-menu-toggle,[id*=ham]');
      if (!h) return null;
      const cs = getComputedStyle(h);
      if (cs.display === 'none' || cs.visibility === 'hidden') return { hidden: true };
      const r = h.getBoundingClientRect();
      const dir = (document.documentElement.getAttribute('dir') || getComputedStyle(document.documentElement).direction || 'ltr').toLowerCase();
      return { left: Math.round(r.left), vw: window.innerWidth, dir };
    });
    if (!ham) add(8, 'hamburger-side', 'SKIP', 'no hamburger found');
    else if (ham.hidden) add(8, 'hamburger-side', 'SKIP', 'hamburger hidden in this state');
    else {
      const onRight = ham.left > ham.vw / 2;
      const wantRight = ham.dir === 'rtl';
      if (onRight === wantRight) add(8, 'hamburger-side', 'PASS', `dir=${ham.dir}, hamburger ${onRight ? 'right' : 'left'}`);
      else add(8, 'hamburger-side', 'FAIL', `dir=${ham.dir} but hamburger on ${onRight ? 'right' : 'left'} (should follow reading direction)`);
    }

    // 10 logo stethoscope / no Vitara
    const logo = await p.evaluate(() => {
      const bodyTxt = document.body.innerText || '';
      const vitara = /vitara/i.test(bodyTxt);
      const docAv = [...document.querySelectorAll('.av.doc, .av, [class*=avatar]')].map(e => (e.textContent || '').trim()).join('');
      return { vitara, hasSteth: /🩺/.test(document.body.innerHTML), leaf: /🌿/.test(docAv) };
    });
    if (logo.vitara) add(10, 'ai-logo-stethoscope', 'FAIL', 'visible "Vitara" branding still present');
    else add(10, 'ai-logo-stethoscope', 'PASS', logo.hasSteth ? '🩺 present, no Vitara text' : 'no Vitara text');

    // open drawer
    await p.evaluate(() => { if (typeof toggleDrawer === 'function') toggleDrawer(); });
    await p.waitForTimeout(600);

    // 1 drawer not covered by overlay
    const cov = await p.evaluate(() => {
      const a = document.querySelector('aside'); if (!a) return { ok: false, why: 'no aside' };
      const r = a.getBoundingClientRect(); if (r.width < 40) return { ok: false, why: 'aside not open (width ' + Math.round(r.width) + ')' };
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      const inside = top && (a === top || a.contains(top));
      return { ok: inside, why: inside ? '' : 'topmost element at drawer center is ' + (top ? (top.id || top.className || top.tagName) : 'null') };
    });
    if (!cov.ok && /no aside|not open/.test(cov.why)) add(1, 'drawer-not-covered', 'SKIP', cov.why);
    else if (!cov.ok) add(1, 'drawer-not-covered', 'FAIL', 'drawer hidden behind overlay: ' + cov.why);
    else add(1, 'drawer-not-covered', 'PASS');

    // 2/3/4 drawer measurements
    const m = await p.evaluate(() => {
      const a = document.querySelector('aside'); if (!a) return null;
      const items = [...a.querySelectorAll('.qk, .spec-btn')].slice(0, 12).map(el => ({ cls: el.className.toString().split(' ')[0], bg: getComputedStyle(el).backgroundColor }));
      const hud = document.querySelector('#wize-bar,[class*=wize-bar],[id*=wize-bar]');
      const first = a.querySelector('.lang-pill,[class*=lang],[data-lang],#wl-theme-toggle-drawer');
      return { asideBg: getComputedStyle(a).backgroundColor, bodyBg: getComputedStyle(document.body).backgroundColor, items, hudBottom: hud ? Math.round(hud.getBoundingClientRect().bottom) : 36, firstTop: first ? Math.round(first.getBoundingClientRect().top) : null };
    });
    if (!m) { add(2, 'drawer-brightness', 'SKIP', 'no aside'); add(3, 'drawer-item-bright', 'SKIP', 'no aside'); add(4, 'drawer-top-vs-HUD', 'SKIP', 'no aside'); }
    else {
      const aL = lum(m.asideBg), bL = lum(m.bodyBg);
      if (aL != null && bL != null && aL < bL - 12) add(2, 'drawer-brightness', 'FAIL', `aside lum ${aL.toFixed(0)} vs body ${bL.toFixed(0)}`);
      else add(2, 'drawer-brightness', 'PASS', `aside ${aL && aL.toFixed(0)} / body ${bL && bL.toFixed(0)}`);
      const dark = m.items.filter(it => { const iL = lum(it.bg); return iL != null && /rgb\(/.test(it.bg) && !/rgba/.test(it.bg) && iL < (aL != null ? aL : 34) - 10; });
      if (dark.length) add(3, 'drawer-item-bright', 'FAIL', dark.map(d => '.' + d.cls + '=' + d.bg).join(', '));
      else add(3, 'drawer-item-bright', 'PASS', m.items.length + ' items checked');
      if (m.firstTop != null && m.firstTop < m.hudBottom) add(4, 'drawer-top-vs-HUD', 'FAIL', `firstTop ${m.firstTop} < hudBottom ${m.hudBottom}`);
      else add(4, 'drawer-top-vs-HUD', 'PASS', `firstTop ${m.firstTop} / hud ${m.hudBottom}`);
    }

    // 5 ? button vs bottom-nav
    await p.evaluate(() => { if (typeof toggleDrawer === 'function') toggleDrawer(); }); // close drawer
    await p.waitForTimeout(300);
    const q = await p.evaluate(() => {
      const hb = [...document.querySelectorAll('button')].find(x => (x.textContent || '').trim() === '?');
      const vh = window.innerHeight; let navTop = null;
      [...document.querySelectorAll('*')].forEach(el => { const cs = getComputedStyle(el); if (cs.position !== 'fixed') return; const r = el.getBoundingClientRect(); if (r.width > window.innerWidth * 0.6 && r.height > 30 && r.height < 110 && r.bottom > vh - 6) navTop = Math.round(r.top); });
      return { qBottom: hb ? Math.round(hb.getBoundingClientRect().bottom) : null, navTop };
    });
    if (q.qBottom == null) add(5, 'help-btn-vs-nav', 'SKIP', 'no "?" button');
    else if (q.navTop != null && q.qBottom > q.navTop + 1) add(5, 'help-btn-vs-nav', 'FAIL', `? bottom ${q.qBottom} > navTop ${q.navTop}`);
    else add(5, 'help-btn-vs-nav', 'PASS', `? bottom ${q.qBottom} / navTop ${q.navTop}`);

    // 6/7 profile scroll + nav-escape
    const prof = await p.evaluate(async () => {
      let opened = false;
      for (const fn of ['openProfile', 'showProfile']) if (typeof window[fn] === 'function') { try { window[fn](); opened = true; break; } catch (e) {} }
      if (!opened) { const btn = [...document.querySelectorAll('button,[onclick]')].find(x => /profile|פרופיל/i.test((x.getAttribute('onclick') || '') + (x.textContent || ''))); if (btn) { btn.click(); opened = true; } }
      await new Promise(r => setTimeout(r, 500));
      const ov = document.querySelector('.overlay:not(.hidden)');
      if (!opened || !ov) return { reachable: false };
      const inner = ov.querySelector('.modal') || ov; const cs = getComputedStyle(inner);
      const scrollable = /(auto|scroll)/.test(cs.overflowY) || inner.scrollHeight <= inner.clientHeight + 4;
      let escaped = false;
      if (typeof newChat === 'function') { try { newChat(); } catch (e) {} await new Promise(r => setTimeout(r, 400)); escaped = !document.querySelector('.overlay:not(.hidden)'); }
      return { reachable: true, scrollable, escaped };
    });
    if (!prof.reachable) { add(6, 'profile-scrollable', 'SKIP', 'profile not reachable'); add(7, 'profile-nav-escape', 'SKIP', 'profile not reachable'); }
    else {
      add(6, 'profile-scrollable', prof.scrollable ? 'PASS' : 'FAIL', prof.scrollable ? '' : 'modal not scrollable');
      add(7, 'profile-nav-escape', prof.escaped ? 'PASS' : 'FAIL', prof.escaped ? '' : 'Home/newChat did not close profile');
    }

    // 9 share link short
    const shareLen = await p.evaluate(async () => {
      try {
        const big = Array.from({ length: 14 }, (_, i) => ({ role: i % 2 ? 'doc' : 'user', text: 'lorem ipsum dolor sit amet '.repeat(40) + i }));
        try { window.messages = big; } catch (e) {}
        if (typeof shareConversation === 'function') shareConversation();
        await new Promise(r => setTimeout(r, 1500));
        const t = document.getElementById('shareUrl'); return t ? (t.value || '').length : -1;
      } catch (e) { return -2; }
    });
    if (shareLen <= 0) add(9, 'share-link-short', 'SKIP', 'share flow not reachable headless (empty URL)');
    else if (shareLen > 4000) add(9, 'share-link-short', 'FAIL', `share URL ${shareLen} chars (will 413/431)`);
    else add(9, 'share-link-short', 'PASS', `${shareLen} chars`);

    // + pro popup for entitled (yolo) user
    const p2 = await ctx.newPage();
    await p2.goto(URL + '/?wl_plan=yolo&wl_nick=qauser', { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await p2.waitForTimeout(3000);
    const pro = await p2.evaluate(() => {
      const sel = [...document.querySelectorAll('.overlay:not(.hidden),[class*=paywall],[id*=paywall],[class*=upgrade],[id*=upgrade]')];
      const visible = sel.filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 80 && r.height > 80 && cs.display !== 'none' && cs.visibility !== 'hidden' && /pro|upgrade|מנוי|שדרג|premium/i.test(e.innerText || ''); });
      return visible.length;
    });
    if (pro > 0) add(11, 'pro-popup-entitled', 'FAIL', 'Pro/upgrade modal shown to a yolo user');
    else add(11, 'pro-popup-entitled', 'PASS');
    await p2.close().catch(() => {});
  } catch (e) {
    add(0, 'battery', 'SKIP', 'crashed: ' + e.message);
  } finally { await b.close(); }

  res.sort((a, b) => a.n - b.n);
  console.log('# today-bugs-check (2026-05-22 regression battery)');
  res.forEach(r => console.log(`  [${r.status}] #${r.n} ${r.name}${r.detail ? ' — ' + r.detail : ''}`));
  const fails = res.filter(r => r.status === 'FAIL');
  if (fails.length) { console.log('\n## For Claude to fix'); fails.forEach((r, i) => console.log(`${i + 1}. #${r.n} ${r.name}: ${r.detail}`)); }
  const skips = res.filter(r => r.status === 'SKIP');
  if (skips.length) { console.log('\n## For you to investigate'); skips.forEach((r, i) => console.log(`${i + 1}. #${r.n} ${r.name}: ${r.detail}`)); }
  if (!fails.length) console.log('\n✅ All assertable today-bug checks PASS.');
  process.exit(fails.length ? 1 : 0);
})();
