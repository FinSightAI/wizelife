const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const url of ['https://tax.wizelife.ai/', 'https://check-deal.vercel.app/']) {
    const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
    const page = await ctx.newPage();
    let hits = 0;
    page.on('request', r => {
      if (/_vercel\/insights/i.test(r.url())) { hits++; console.log('  → ' + r.url().slice(0, 120)); }
    });
    await page.goto(url + '?cb=' + Date.now(), { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(4000);
    console.log(url + ' → hits=' + hits);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
