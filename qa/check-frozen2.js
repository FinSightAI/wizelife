const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.goto('https://tax.wizelife.ai/relocation-analyzer?cb=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Try to click everything that should dismiss the modal
  console.log('Initial rows:', await page.locator('tbody tr').count());
  console.log('Onboarding visible:', await page.locator('#wize-onboarding').isVisible());

  const skipBtn = page.locator('#wize-onboarding button:has-text("דלג"), #wize-onboarding button:has-text("Skip"), #wize-onboarding button[aria-label*="close"]').first();
  console.log('Skip button count:', await skipBtn.count());
  if (await skipBtn.count() > 0) {
    await skipBtn.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(500);
    console.log('After skip click - modal visible:', await page.locator('#wize-onboarding').isVisible());
  }

  // Try to interact with the input
  const inp = page.locator('input[type=number]').first();
  console.log('Input count:', await inp.count());
  if (await inp.count() > 0) {
    try {
      await inp.fill('30000', { timeout: 5000 });
      console.log('Input fill OK');
    } catch (e) {
      console.log('Input fill FAIL:', e.message.slice(0, 100));
    }
  }
  
  // Try clicking toggle
  const tog = page.locator('label').filter({ hasText: /עולה חדש/ }).first();
  console.log('Olim label count:', await tog.count());
  if (await tog.count() > 0) {
    try {
      await tog.click({ timeout: 5000 });
      console.log('Toggle click OK');
    } catch (e) {
      console.log('Toggle click FAIL:', e.message.slice(0, 100));
    }
  }

  // Final state
  console.log('Final rows:', await page.locator('tbody tr').count());
  console.log('---ERRORS---');
  errs.slice(0, 20).forEach(e => console.log(e));
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
