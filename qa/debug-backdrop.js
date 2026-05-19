const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('https://tax.wizelife.ai/relocation-analyzer?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // What's at (10,10)? Should be the root backdrop
  const elInfo = await page.evaluate(() => {
    const el = document.elementFromPoint(10, 10);
    if (!el) return 'null';
    return el.tagName + '#' + el.id + ' parent#' + (el.parentElement?.id||'');
  });
  console.log('At (10,10):', elInfo);

  // Try ✕ button — now 44px
  const xBtn = page.locator('#wize-onboarding button[aria-label="סגור"]').first();
  console.log('X button count:', await xBtn.count());
  const box = await xBtn.boundingBox();
  console.log('X button box:', box);
  if (box) {
    console.log('X button size:', box.width, 'x', box.height, '(should be 44+)');
    await xBtn.click({ timeout: 3000 });
    await page.waitForTimeout(400);
    console.log('After X click — modal visible:', await page.locator('#wize-onboarding').isVisible());
  }

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
