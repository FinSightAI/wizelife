const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  // Real iPhone Safari emulation w/ touch
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('https://tax.wizelife.ai/relocation-analyzer', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  console.log('Modal visible:', await page.locator('#wize-onboarding').isVisible());

  // Tap on backdrop (top corner — outside the centered card)
  console.log('--- TAP backdrop (top-left) ---');
  await page.tap('#wize-onboarding', { position: { x: 10, y: 10 }, force: true });
  await page.waitForTimeout(500);
  console.log('Modal visible after corner tap:', await page.locator('#wize-onboarding').isVisible());

  // If still visible, tap the card itself
  if (await page.locator('#wize-onboarding').isVisible()) {
    console.log('--- TAP card center (should NOT dismiss) ---');
    const card = page.locator('#wize-onboarding > div').first();
    const box = await card.boundingBox();
    console.log('Card box:', box);
    // Tap bottom area near skip button
    if (box) {
      await page.tap('#wize-onboarding', { position: { x: 200, y: 50 }, force: true });
      await page.waitForTimeout(500);
      console.log('After top-area tap:', await page.locator('#wize-onboarding').isVisible());
    }
  }
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
