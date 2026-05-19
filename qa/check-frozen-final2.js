const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERR:', e.message.slice(0,150)));

  await page.goto('https://tax.wizelife.ai/relocation-analyzer?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Check page height + scroll state BEFORE dismissing anything
  const state1 = await page.evaluate(() => ({
    docHeight: document.documentElement.scrollHeight,
    viewHeight: window.innerHeight,
    scrollable: document.documentElement.scrollHeight > window.innerHeight,
    bodyOverflow: getComputedStyle(document.body).overflow,
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
    bodyPosition: getComputedStyle(document.body).position,
    obVisible: !!document.getElementById('wize-onboarding'),
    obDisplay: document.getElementById('wize-onboarding') && getComputedStyle(document.getElementById('wize-onboarding')).display,
  }));
  console.log('STATE BEFORE dismiss:', JSON.stringify(state1, null, 2));

  // Try to scroll
  await page.evaluate(() => window.scrollTo(0, 1000));
  await page.waitForTimeout(200);
  const sy1 = await page.evaluate(() => window.scrollY);
  console.log('Scroll Y after scrollTo(1000) WITH modal:', sy1);

  // Dismiss onboarding
  console.log('--- Dismissing onboarding ---');
  await page.locator('#wize-onboarding').click({ position: { x: 10, y: 10 }, force: true });
  await page.waitForTimeout(500);
  console.log('Onboarding visible after click:', await page.locator('#wize-onboarding').isVisible());

  // Try to scroll again
  await page.evaluate(() => window.scrollTo(0, 1000));
  await page.waitForTimeout(200);
  const sy2 = await page.evaluate(() => window.scrollY);
  console.log('Scroll Y after scrollTo(1000) WITHOUT modal:', sy2);

  const state2 = await page.evaluate(() => ({
    bodyOverflow: getComputedStyle(document.body).overflow,
    bodyOverflowInline: document.body.style.overflow,
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
  }));
  console.log('STATE AFTER dismiss:', JSON.stringify(state2));

  // Click a chip to verify selector works
  try {
    const ptChip = page.locator('span[data-code="PT"]');
    console.log('PT chip count:', await ptChip.count());
    await ptChip.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    console.log('✓ PT chip click works');
  } catch (e) {
    console.log('✗ PT chip click FAILED:', e.message.slice(0,150));
  }

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
