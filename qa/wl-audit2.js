// WizeLife Portal audit — pass 2: interactive (lang pills, RTL mobile, auth gating, SW, auth widgets)
const { chromium, webkit } = require('playwright');
const BASE = 'https://wizelife.ai';
const R = (n, ok, info = '') => console.log(`${ok ? 'PASS' : 'FAIL'} | ${n}${info ? ' | ' + info : ''}`);

(async () => {
  const browser = await chromium.launch();

  // --- 1. Landing: lang pills (uppercase, content switches all 4 langs) ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3500);
    const pills = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.wl-lang-pill, .lang-pill, [data-wl-lang], #wl_lang_pills button, #langSwitcher button')];
      return els.map(e => ({ text: e.textContent.trim(), visible: !!(e.offsetWidth || e.offsetHeight) }));
    });
    R('landing lang pills found', pills.length >= 4, JSON.stringify(pills));
    const lower = pills.filter(p => p.text && p.text !== p.text.toUpperCase());
    R('lang pills UPPERCASE', lower.length === 0, JSON.stringify(lower));
    // switch languages, check html lang/dir + content change
    for (const lang of ['en', 'pt', 'es', 'he']) {
      const clicked = await page.evaluate((lng) => {
        const els = [...document.querySelectorAll('.wl-lang-pill, .lang-pill, [data-wl-lang], #wl_lang_pills button')];
        const el = els.find(e => e.textContent.trim().toLowerCase() === lng);
        if (el) { el.click(); return true; } return false;
      }, lang);
      await page.waitForTimeout(1200);
      const state = await page.evaluate(() => ({
        lang: document.documentElement.lang, dir: document.documentElement.dir,
        h1: (document.querySelector('h1') || {}).innerText || ''
      }));
      R(`landing switch to ${lang}`, clicked && (state.lang || '').startsWith(lang), `clicked=${clicked} html.lang=${state.lang} dir=${state.dir} h1="${(state.h1||'').slice(0,60)}"`);
    }
    // CTA visible
    const cta = await page.locator('a[href*="auth"]').first().isVisible().catch(() => false);
    R('landing CTA → auth visible', cta);
    await ctx.close();
  }

  // --- 2. Mobile 360x800 Hebrew RTL: no horizontal overflow on landing + auth + dashboard ---
  for (const path of ['/', '/auth.html', '/about.html', '/p/relocate-portugal.html']) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, locale: 'he-IL' });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { localStorage.setItem('wl_lang', 'he'); } catch (e) {} });
    try {
      await page.goto(BASE + path, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(3500);
      const m = await page.evaluate(() => {
        const d = document.documentElement;
        const over = d.scrollWidth - d.clientWidth;
        // find offending elements if overflow
        let worst = '';
        if (over > 4) {
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.right > d.clientWidth + 4 || r.left < -4) { worst = el.tagName + '.' + (el.className || '').toString().slice(0, 50) + ` rect=${Math.round(r.left)}..${Math.round(r.right)}`; break; }
          }
        }
        return { over, worst, dir: d.dir, lang: d.lang };
      });
      R(`mobile360 he ${path} no h-overflow`, m.over <= 4, `overflowPx=${m.over} dir=${m.dir} ${m.worst}`);
    } catch (e) { R(`mobile360 he ${path}`, false, 'NAV_ERR ' + e.message.slice(0, 120)); }
    await ctx.close();
  }

  // --- 3. Auth gating: dashboard + account logged-out behavior ---
  for (const path of ['/dashboard.html', '/account.html', '/funnel.html']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(5000);
    const url = page.url();
    const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
    console.log(`GATE ${path} -> ${url}\n  body: ${JSON.stringify(body.slice(0, 250))}`);
    await ctx.close();
  }

  // --- 4. SW + manifest ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
    const sw = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'unsupported';
      try {
        const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 12000))]);
        return reg ? (reg.active ? reg.active.scriptURL : 'no-active') : 'timeout';
      } catch (e) { return 'err ' + e.message; }
    });
    R('service worker registers', typeof sw === 'string' && sw.includes('sw.js'), String(sw));
    const manifestHref = await page.evaluate(() => (document.querySelector('link[rel="manifest"]') || {}).href || 'MISSING');
    R('manifest link present', manifestHref !== 'MISSING', manifestHref);
    await ctx.close();
  }

  // --- 5. auth.html widgets: tabs, forgot password, google btn, password strength ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/auth.html', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3500);
    const hasGoogle = await page.evaluate(() => !!document.body.innerText.match(/Google/i));
    R('auth google sign-in present', hasGoogle);
    // signup tab
    await page.click('#tabSignup').catch(() => {});
    await page.waitForTimeout(800);
    const signupVisible = await page.locator('#signupForm').isVisible().catch(() => false);
    R('auth signup tab switches', signupVisible);
    // weak password validation (no real account created — invalid signup attempt)
    await page.fill('#signupName', 'QA Test').catch(() => {});
    await page.fill('#signupEmail', 'qa-weakpass-test@example.com').catch(() => {});
    await page.fill('#signupPassword', 'weak').catch(() => {});
    await page.click('#signupBtn').catch(() => {});
    await page.waitForTimeout(2500);
    const err = await page.evaluate(() => (document.getElementById('signupError') || {}).innerText || '');
    R('weak password rejected with message', err.length > 3, JSON.stringify(err.slice(0, 120)));
    // forgot password
    await page.click('#tabLogin').catch(() => {});
    await page.waitForTimeout(500);
    const forgot = page.locator('a:has-text("Forgot"), a:has-text("שכחת"), .forgot, [onclick*="forgot" i], [onclick*="reset" i]').first();
    const forgotExists = await forgot.count() > 0;
    let forgotWorks = false;
    if (forgotExists) {
      await forgot.click().catch(() => {});
      await page.waitForTimeout(1500);
      forgotWorks = await page.evaluate(() => {
        const t = document.body.innerText;
        return /reset|איפוס|שלחנו|sent|redefin/i.test(t) || !!document.querySelector('.modal:not([style*="display: none"]), [id*="forgot"]');
      });
    }
    R('forgot-password link exists+responds', forgotExists && forgotWorks, `exists=${forgotExists} works=${forgotWorks}`);
    await ctx.close();
  }

  // --- 6. Hamburger / nav on landing ---
  {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3500);
    const burger = page.locator('.wize-hamburger-btn, .hamburger, [aria-label*="menu" i], [onclick*="menu" i]').first();
    const burgerCount = await burger.count();
    if (burgerCount) {
      await burger.click().catch(() => {});
      await page.waitForTimeout(1000);
      const menuOpen = await page.evaluate(() => {
        const els = [...document.querySelectorAll('.wize-hamburger-menu, .mobile-menu, nav [role="menu"], .menu-panel, .drawer')];
        return els.some(e => e.offsetWidth > 0 && e.offsetHeight > 0);
      });
      R('mobile hamburger opens menu', menuOpen, `burgerFound=${burgerCount}`);
      // close with Esc
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      const menuClosed = await page.evaluate(() => {
        const els = [...document.querySelectorAll('.wize-hamburger-menu, .mobile-menu, .menu-panel, .drawer')];
        return !els.some(e => e.offsetWidth > 0 && e.offsetHeight > 0);
      });
      R('hamburger menu closes on Esc', menuClosed);
    } else { R('mobile hamburger present', false, 'no hamburger button found on mobile landing'); }
    await ctx.close();
  }

  await browser.close();
})();
