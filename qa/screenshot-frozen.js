const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  await page.goto('https://tax.wizelife.ai/relocation-analyzer', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/pro-frozen-cold.png', fullPage: false });

  // Try to scroll
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/pro-frozen-scroll.png', fullPage: false });

  // Check if there's any service worker
  const swInfo = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'no SW API';
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.map(r => r.scope + ' active=' + !!r.active);
  });
  console.log('SW regs:', swInfo);

  // Is the page responsive at all?
  const obVis = await page.locator('#wize-onboarding').isVisible();
  console.log('Onboarding visible:', obVis);
  const pageScrolled = await page.evaluate(() => window.scrollY);
  console.log('Scroll Y:', pageScrolled);

  await browser.close();
  console.log('Screenshots: /tmp/pro-frozen-cold.png, /tmp/pro-frozen-scroll.png');
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
