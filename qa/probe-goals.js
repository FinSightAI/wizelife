const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  await page.goto('https://money.wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // Try clicking the Goals link
  const link = page.locator('a[href*="goals"], a:has-text("יעדי חיסכון"), a:has-text("Goals")').first();
  console.log('Link count:', await link.count());
  if (await link.count() > 0) {
    const href = await link.getAttribute('href');
    console.log('href:', href);
    await link.click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    console.log('Landed at:', page.url());
  }
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
