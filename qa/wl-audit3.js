// WizeLife Portal audit — pass 3: auth widgets, hamburger, authed dashboard, webkit smoke
const { chromium, webkit } = require('playwright');
const BASE = 'https://wizelife.ai';
const R = (n, ok, info = '') => console.log(`${ok ? 'PASS' : 'FAIL'} | ${n}${info ? ' | ' + info : ''}`);
const settle = async (page) => { await page.waitForTimeout(4000); await page.waitForLoadState('load').catch(() => {}); await page.waitForTimeout(2500); };

(async () => {
  const browser = await chromium.launch();

  // --- auth.html widgets ---
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/auth.html', { waitUntil: 'load', timeout: 45000 });
    await settle(page);
    R('auth google button', await page.locator('text=/Google/i').first().isVisible().catch(() => false));
    await page.click('#tabSignup').catch(e => R('signup tab click', false, e.message.slice(0, 80)));
    await page.waitForTimeout(800);
    R('signup form shows', await page.locator('#signupForm').isVisible().catch(() => false));
    await page.fill('#signupName', 'QA Test');
    await page.fill('#signupEmail', 'qa-weakpass-test@example.com');
    await page.fill('#signupPassword', 'weak');
    await page.click('#signupBtn');
    await page.waitForTimeout(3000);
    const err = await page.evaluate(() => (document.getElementById('signupError') || {}).innerText || '');
    R('weak password rejected w/ message', err.length > 3, JSON.stringify(err.slice(0, 120)));
    await page.click('#tabLogin');
    await page.waitForTimeout(500);
    const forgot = page.locator('a:has-text("Forgot"), [onclick*="forgot" i], [onclick*="reset" i], .forgot').first();
    if (await forgot.count()) {
      await page.fill('#loginEmail', '').catch(() => {});
      await forgot.click().catch(() => {});
      await page.waitForTimeout(2000);
      const after = await page.evaluate(() => document.body.innerText.slice(0, 1200));
      R('forgot password responds', /reset|איפוס|sent|שלחנו|email|אימייל/i.test(after), JSON.stringify(after.match(/.{0,80}(reset|איפוס|email|אימייל).{0,40}/i)?.[0] || after.slice(0, 100)));
    } else R('forgot password link exists', false);
    await ctx.close();
  } catch (e) { console.log('AUTH-WIDGETS ERR', e.message.slice(0, 150)); }

  // --- hamburger on mobile landing ---
  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
    await settle(page);
    const burgers = await page.evaluate(() => [...document.querySelectorAll('button, a, div')].filter(e => /menu|☰|נווט/i.test(e.getAttribute('aria-label') || '') || /hamburger|burger|menu-btn|menu-toggle/i.test(e.className.toString())).map(e => ({ cls: e.className.toString().slice(0, 60), vis: !!(e.offsetWidth || e.offsetHeight) })));
    console.log('BURGERS:', JSON.stringify(burgers));
    // language control visible on mobile?
    const mobileLang = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.wl-lang-pill, .lang-pill, [data-wl-lang], select[id*=lang i], #wl_lang_pills *')];
      return els.filter(e => e.offsetWidth > 0).length;
    });
    R('mobile landing has visible language control', mobileLang > 0, `visibleLangEls=${mobileLang}`);
    await ctx.close();
  } catch (e) { console.log('HAMBURGER ERR', e.message.slice(0, 150)); }

  // --- authed dashboard flow (existing QA Pro account, non-destructive) ---
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/auth.html', { waitUntil: 'load', timeout: 45000 });
    await settle(page);
    await page.fill('#loginEmail', process.env.QA_EMAIL_PRO);
    await page.fill('#loginPassword', process.env.QA_PASSWORD_PRO);
    await page.click('#loginBtn');
    await page.waitForURL('**/dashboard.html**', { timeout: 30000 }).catch(() => {});
    await settle(page);
    const url = page.url();
    R('login → dashboard', url.includes('dashboard'), url);
    if (url.includes('dashboard')) {
      const consoleErrs = [];
      page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });
      const cards = await page.evaluate(() => [...document.querySelectorAll('a[href*="money."], a[href*="tax."], a[href*="travel."], a[href*="health."], a[href*="deal."]')].map(a => ({ href: a.href.slice(0, 110), vis: !!(a.offsetWidth || a.offsetHeight) })));
      const apps = ['money.', 'tax.', 'travel.', 'health.', 'deal.'];
      const present = apps.filter(a => cards.some(c => c.href.includes(a) && c.vis));
      R('dashboard 5 app cards visible', present.length === 5, `found: ${present.join(',')} total=${cards.length}`);
      const withToken = cards.filter(c => /wl_token|#sso|token=/.test(c.href)).length;
      console.log('CARDS_SAMPLE:', JSON.stringify(cards.slice(0, 8)));
      R('app cards carry SSO token', withToken > 0, `withToken=${withToken}/${cards.length}`);
      // access-code card EN text check (the he-in-en bug)
      await page.evaluate(() => localStorage.setItem('wl_lang', 'en'));
      await page.reload({ waitUntil: 'load' }).catch(() => {});
      await settle(page);
      const acc = await page.evaluate(() => (document.getElementById('accessCodeIntro') || {}).textContent || 'MISSING');
      R('EN access-code intro is English', !/[֐-׿]/.test(acc) && acc !== 'MISSING', JSON.stringify(acc.slice(0, 100)));
      // plan badge shows
      const planTxt = await page.evaluate(() => document.body.innerText.match(/.{0,30}(Pro|YOLO|Free).{0,30}/)?.[0] || 'none');
      console.log('PLAN_TEXT:', JSON.stringify(planTxt));
      // invalid access code → user-facing error (non-destructive)
      const codeIn = page.locator('#accessCodeInput');
      if (await codeIn.count()) {
        await codeIn.fill('NOT-A-REAL-CODE-123');
        await page.click('#accessCodeBtn');
        await page.waitForTimeout(4000);
        const msg = await page.evaluate(() => (document.getElementById('codeMsg') || {}).innerText || '');
        R('invalid code → visible error', msg.length > 2, JSON.stringify(msg.slice(0, 100)));
      } else R('access code input present', false);
      console.log('DASH_CONSOLE_ERRS:', JSON.stringify(consoleErrs.slice(0, 6)));
      // sign out
      const so = page.locator('button:has-text("Sign out"), a:has-text("Sign out"), [onclick*="signOut" i], [onclick*="logout" i]').first();
      if (await so.count()) {
        await so.click().catch(() => {});
        await page.waitForTimeout(4000);
        R('sign out leaves dashboard', !page.url().includes('dashboard') || (await page.evaluate(() => document.body.innerText)).includes('Sign In'), page.url());
      } else R('sign-out control found', false);
    }
    await ctx.close();
  } catch (e) { console.log('AUTHED ERR', e.message.slice(0, 200)); }

  await browser.close();

  // --- WebKit smoke: landing + auth ---
  try {
    const wb = await webkit.launch();
    const ctx = await wb.newContext({ viewport: { width: 1280, height: 900 } });
    for (const path of ['/', '/auth.html', '/p/salary-compare.html']) {
      const page = await ctx.newPage();
      const errs = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
      await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
      await settle(page);
      const body = await page.evaluate(() => document.body.innerText.length).catch(() => -1);
      R(`webkit ${path} renders`, body > 200, `textLen=${body} consoleErrs=${JSON.stringify(errs.slice(0, 3))}`);
      await page.close();
    }
    await wb.close();
  } catch (e) { console.log('WEBKIT ERR', e.message.slice(0, 200)); }
})();
