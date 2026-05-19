// Verify WizeShare button on mobile (iPhone 14 Pro viewport).
// Cannot actually trigger the native share sheet in headless Playwright,
// so we stub navigator.share + clipboard and verify the helper picks the
// right path with the expected URL/title/text.

const { chromium, devices } = require('playwright');

const ASSERTIONS = [];
function check(label, ok, extra = '') {
  ASSERTIONS.push({ label, ok, extra });
  console.log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`);
}

(async () => {
  const browser = await chromium.launch();
  const iPhone = devices['iPhone 14 Pro'];

  // -------- Test 1: portal landing (anonymous) --------
  {
    const ctx = await browser.newContext({ ...iPhone, locale: 'en-US' });
    const page = await ctx.newPage();

    let shareCalled = null;
    let clipCalled = null;
    await page.addInitScript(() => {
      window.__shareCalls = [];
      window.__clipCalls = [];
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (d) => { window.__shareCalls.push(d); return; },
      });
      Object.defineProperty(navigator, 'canShare', {
        configurable: true,
        value: () => true,
      });
      // Override clipboard to avoid permission issues
      if (!navigator.clipboard) Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {} });
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: async (t) => { window.__clipCalls.push(t); return; },
      });
    });

    await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500); // let deferred scripts load

    // 1) Share button rendered & visible
    const btn = page.locator('#wlShareBtn');
    const cnt = await btn.count();
    check('landing: #wlShareBtn exists in DOM', cnt === 1);
    if (cnt === 1) {
      const visible = await btn.isVisible();
      check('landing: button is visible in mobile viewport', visible);
      const box = await btn.boundingBox();
      const tappable = box && box.width >= 32 && box.height >= 32;
      check('landing: button is tappable (>=32×32)', !!tappable, box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'no box');
    }

    // 2) WizeShare global loaded
    const hasShare = await page.evaluate(() => typeof window.WizeShare?.share === 'function');
    check('landing: window.WizeShare.share is a function', hasShare);

    // 3) Click → navigator.share called with clean wizelife.ai URL
    if (cnt === 1 && hasShare) {
      await btn.click();
      await page.waitForTimeout(400);
      const calls = await page.evaluate(() => window.__shareCalls);
      check('landing: click invokes navigator.share()', calls.length === 1);
      if (calls.length === 1) {
        const c = calls[0];
        check('landing: shared URL is https://wizelife.ai (not share.google/)',
              c.url === 'https://wizelife.ai',
              c.url);
        check('landing: shared title set to "WizeLife"', c.title === 'WizeLife', c.title);
        check('landing: shared text is the tagline',
              /Live Smarter/.test(c.text || ''), c.text);
      }
    }

    await ctx.close();
  }

  // -------- Test 2: clipboard fallback path (no navigator.share) --------
  {
    const ctx = await browser.newContext({ ...iPhone, locale: 'en-US' });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__clipCalls = [];
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      if (!navigator.clipboard) Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {} });
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: async (t) => { window.__clipCalls.push(t); return; },
      });
    });

    await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    await page.locator('#wlShareBtn').click();
    await page.waitForTimeout(500);
    const clip = await page.evaluate(() => window.__clipCalls);
    check('fallback: clipboard.writeText called when navigator.share missing', clip.length === 1);
    if (clip.length === 1) {
      check('fallback: clipboard URL is https://wizelife.ai', clip[0] === 'https://wizelife.ai', clip[0]);
    }
    // Toast visible
    const toastVisible = await page.evaluate(() => {
      return Array.from(document.body.children).some(el =>
        /Link copied|הקישור הועתק/i.test(el.textContent || ''));
    });
    check('fallback: success toast appears', toastVisible);

    await ctx.close();
  }

  // -------- Test 3: AbortError (user cancelled native share) is silent --------
  {
    const ctx = await browser.newContext({ ...iPhone, locale: 'he-IL' });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; },
      });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      window.__errToasts = 0;
      const origLog = console.error;
      console.error = (...a) => { window.__errToasts++; origLog(...a); };
    });

    await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.locator('#wlShareBtn').click();
    await page.waitForTimeout(400);

    const failToast = await page.evaluate(() => {
      return Array.from(document.body.children).some(el =>
        /failed|נכשל/i.test(el.textContent || ''));
    });
    check('cancel: no "failed" toast when user aborts share', !failToast);

    await ctx.close();
  }

  await browser.close();

  // Summary
  const failed = ASSERTIONS.filter(a => !a.ok);
  console.log('\n========');
  console.log(`PASS: ${ASSERTIONS.length - failed.length}/${ASSERTIONS.length}`);
  if (failed.length) {
    console.log('FAILED:');
    failed.forEach(a => console.log('  ✗', a.label, a.extra ? '— ' + a.extra : ''));
    process.exit(1);
  }
})().catch(e => { console.error(e); process.exit(2); });
