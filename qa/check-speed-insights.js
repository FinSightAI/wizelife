const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const URLS = [
    'https://mastermove.vercel.app/',
    'https://check-deal.vercel.app/',
  ];
  for (const url of URLS) {
    const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
    const page = await ctx.newPage();
    let beaconHits = 0;
    page.on('request', r => {
      if (/_vercel\/insights|vitals\.vercel-insights|speed-insights/i.test(r.url())) {
        beaconHits++;
        console.log('  → ' + r.url().slice(0, 100));
      }
    });
    await page.goto(url + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(5000);
    // Speed Insights fires on metrics; need to trigger interaction
    await page.mouse.move(100, 100);
    await page.waitForTimeout(1500);
    console.log(`${url} → beacon hits: ${beaconHits}`);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
