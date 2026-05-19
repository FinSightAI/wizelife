const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('console', m => console.log(`[c:${m.type()}]`, m.text()));

  await page.addInitScript(() => {
    window.__events = [];

    // Wrap navigator.share to log and throw
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data) => {
        window.__events.push('NS:called ' + JSON.stringify(data).slice(0, 60));
        const e = new Error('forced'); e.name = 'NotAllowedError'; throw e;
      },
    });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => { window.__events.push('NS:canShare-true'); return true; } });

    // Wrap navigator.clipboard
    const stub = { writeText: async (t) => { window.__events.push('NC:writeText ' + t); return; } };
    try {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: stub });
      window.__events.push('NC:override-ok');
    } catch (e) { window.__events.push('NC:override-FAIL ' + e.message); }

    // Wrap document.execCommand to detect fallback path
    const origExec = document.execCommand?.bind(document);
    if (origExec) {
      document.execCommand = function(...args) {
        window.__events.push('DOC:execCommand ' + args.join(','));
        return origExec(...args);
      };
    }
  });

  await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Sanity-check state
  const pre = await page.evaluate(() => ({
    eventsSoFar: window.__events.slice(),
    clipIsStub: navigator.clipboard?.writeText?.toString().includes('__events'),
    shareIsStub: navigator.share?.toString().includes('__events'),
  }));
  console.log('Pre-share state:', JSON.stringify(pre, null, 2));

  // Call share
  const result = await page.evaluate(async () => {
    window.__events.push('CALL:start');
    const r = await window.WizeShare.share();
    window.__events.push('CALL:returned ' + r);
    return { r, events: window.__events.slice() };
  });
  console.log('\nFull event log:');
  result.events.forEach(e => console.log('  ', e));

  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
