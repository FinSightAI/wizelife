// Debug why fallback isn't firing
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  page.on('console', m => console.log(`[browser:${m.type()}]`, m.text()));
  page.on('pageerror', e => console.log('[pageerror]', e.message));

  await page.addInitScript(() => {
    window.__events = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {
        window.__events.push('share-called-throwing');
        const e = new Error('forced'); e.name = 'NotAllowedError'; throw e;
      },
    });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    // Override clipboard
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (t) => { window.__events.push('clip-called:' + t); return; },
        },
      });
    } catch (e) { window.__events.push('clipboard-define-error:' + e.message); }
  });

  await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Verify the overrides took
  const pre = await page.evaluate(() => ({
    hasShare: typeof navigator.share,
    hasCanShare: typeof navigator.canShare,
    hasClipboard: !!navigator.clipboard,
    hasWriteText: typeof navigator.clipboard?.writeText,
    canShareReturns: navigator.canShare({}),
  }));
  console.log('Pre-click state:', pre);

  await page.locator('#wlShareBtn').click();
  await page.waitForTimeout(800);

  const events = await page.evaluate(() => window.__events);
  console.log('Events:', events);

  const dom = await page.evaluate(() => {
    return Array.from(document.body.children).map(e => ({
      tag: e.tagName,
      text: (e.textContent || '').slice(0, 40),
    })).filter(e => /copied|failed|הקישור|נכשל/i.test(e.text));
  });
  console.log('Toasts seen:', dom);

  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
