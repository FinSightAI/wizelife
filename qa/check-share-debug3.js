const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  await ctx.route('**/wize-share.js*', async (route) => {
    const res = await fetch(route.request().url(), { cache: 'no-store' });
    const body = await res.text();
    await route.fulfill({ status: 200, contentType: 'application/javascript', body });
  });
  const page = await ctx.newPage();

  await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Dump the actual share() source as the page sees it
  const src = await page.evaluate(() => window.WizeShare?.share?.toString() || 'no WizeShare');
  console.log('SHARE FN SOURCE:\n', src);
})().catch(e => { console.error(e); process.exit(2); });
