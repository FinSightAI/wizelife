// Verify wize-share.js falls through to clipboard when navigator.share()
// throws a non-AbortError (the user-reported "Share failed" scenario).
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();

  // Wait for deploy
  let live = false;
  for (let i = 0; i < 20; i++) {
    const r = await fetch('https://wizelife.ai/js/wize-share.js?cb=' + Date.now()).then(r => r.text());
    if (/copyToClipboard/.test(r)) { live = true; break; }
    await new Promise(r => setTimeout(r, 6000));
  }
  console.log(live ? '✓ updated share.js deployed' : '⚠ not yet — testing anyway');

  const cases = [
    { name: 'NotAllowedError',  errName: 'NotAllowedError',  expectToast: 'copied' },
    { name: 'InvalidStateError', errName: 'InvalidStateError', expectToast: 'copied' },
    { name: 'AbortError (user cancelled)', errName: 'AbortError', expectToast: 'none' },
    { name: 'TypeError',         errName: 'TypeError',         expectToast: 'copied' },
  ];

  let failed = 0;
  for (const c of cases) {
    const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
    // Force fresh fetch of wize-share.js (bypasses browser HTTP cache).
    await ctx.route('**/wize-share.js*', async (route) => {
      const res = await fetch(route.request().url(), { cache: 'no-store' });
      const body = await res.text();
      await route.fulfill({ status: 200, contentType: 'application/javascript', body });
    });
    const page = await ctx.newPage();
    await page.addInitScript(({ errName }) => {
      window.__clipCalls = [];
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async () => { const e = new Error('forced'); e.name = errName; throw e; },
      });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      // Replace the WHOLE clipboard object — overriding only writeText on
      // the native Clipboard instance silently fails in some engines.
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (t) => { window.__clipCalls.push(t); return; } },
      });
    }, { errName: c.errName });

    await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.locator('#wlShareBtn').click();
    await page.waitForTimeout(700);

    const clips = await page.evaluate(() => window.__clipCalls);
    const toastText = await page.evaluate(() => {
      const t = Array.from(document.body.children).map(e => (e.textContent || '').trim()).filter(s => /copied|הקישור|failed|נכשל|copiado|copiato/i.test(s));
      return t.join(' | ') || null;
    });

    let pass = false;
    if (c.expectToast === 'copied') {
      pass = clips.length === 1 && clips[0] === 'https://wizelife.ai' && /copied|הקישור|copiado/i.test(toastText || '');
    } else if (c.expectToast === 'none') {
      pass = clips.length === 0 && !toastText;
    }
    console.log(`${pass ? '✓' : '✗'} ${c.name} — clips=${clips.length}, toast="${toastText || ''}"`);
    if (!pass) failed++;
    await ctx.close();
  }

  await browser.close();
  console.log(failed === 0 ? '\n✅ ALL PASS — share fallback now works' : `\n❌ ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
