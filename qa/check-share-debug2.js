// Verify Object.defineProperty actually stuck for navigator.clipboard
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  page.on('console', m => console.log(`[console:${m.type()}]`, m.text()));

  await page.addInitScript(() => {
    window.__events = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => { window.__events.push('share-called'); const e = new Error(); e.name = 'NotAllowedError'; throw e; },
    });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (t) => { window.__events.push('clip-' + t); return; },
        },
      });
    } catch (e) { window.__events.push('clip-def-err: ' + e.message); }
  });

  await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // 1) Check that clipboard.writeText IS our stub by calling it directly
  const direct = await page.evaluate(async () => {
    try {
      await navigator.clipboard.writeText('TEST-DIRECT');
      return { ok: true, marker: window.__events.slice() };
    } catch (e) { return { ok: false, err: e.message }; }
  });
  console.log('Direct clipboard call:', direct);

  // 2) Now call WizeShare.share() directly
  const result = await page.evaluate(async () => {
    window.__events.push('about-to-call-share');
    try {
      const r = await window.WizeShare.share();
      window.__events.push('share-returned:' + r);
      return { ok: true, events: window.__events.slice() };
    } catch (e) { return { ok: false, err: e.message, events: window.__events.slice() }; }
  });
  console.log('WizeShare.share() result:', JSON.stringify(result, null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
