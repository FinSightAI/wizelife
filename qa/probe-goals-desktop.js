const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('https://money.wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const link = page.locator('a[href*="goals"]').first();
  console.log('href:', await link.getAttribute('href'));
  const box = await link.boundingBox();
  console.log('box:', box);
  if (box) {
    await link.click({ timeout: 5000 });
    await page.waitForTimeout(2000);
    console.log('Landed at:', page.url());
  } else { console.log('Link off-viewport on desktop too — likely in hidden sidebar'); }
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
