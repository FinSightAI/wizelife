const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGE: ' + e.message.slice(0,150)));

  await page.goto('https://tax.wizelife.ai/relocation-analyzer?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // 1) Body scroll unlocked
  const ov = await page.evaluate(() => getComputedStyle(document.body).overflow);
  console.log((ov === 'visible' || ov === 'auto' ? '✓' : '✗') + ' body overflow=' + ov);

  // 2) Page actually scrollable
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(300);
  const sy = await page.evaluate(() => window.scrollY);
  console.log((sy > 0 ? '✓' : '✗') + ' page scrolls (scrollY=' + sy + ')');

  // 3) Onboarding modal can be backdrop-tapped to dismiss
  if (await page.locator('#wize-onboarding').isVisible()) {
    await page.locator('#wize-onboarding').click({ position: { x: 10, y: 10 }, force: true });
    await page.waitForTimeout(500);
    const stillVisible = await page.locator('#wize-onboarding').isVisible();
    console.log((!stillVisible ? '✓' : '✗') + ' backdrop tap dismisses onboarding (visible=' + stillVisible + ')');
  } else {
    console.log('· no onboarding modal (already-seen state)');
  }

  // 4) Chips clickable
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const chips = await page.locator('span[data-code]').count();
  console.log((chips === 13 ? '✓' : '✗') + ` ${chips} chips render`);

  // Need to dismiss any quickstart modal that may have appeared
  try {
    if (await page.locator('#wlQuickStart').isVisible({ timeout: 500 })) {
      await page.locator('#wlQuickStart button:has-text("Later"), #wlQuickStart button:has-text("מאוחר")').first().click({ force: true });
      await page.waitForTimeout(300);
    }
  } catch {}

  try {
    await page.locator('span[data-code="PT"]').click({ timeout: 5000 });
    await page.waitForTimeout(300);
    const rows = await page.locator('tbody tr').count();
    console.log((rows === 7 ? '✓' : '✗') + ` PT chip click works → ${rows} rows (expected 7)`);
  } catch (e) {
    console.log('✗ chip click FAILED:', e.message.slice(0,80));
  }

  console.log('---ERRORS---');
  errs.slice(0,5).forEach(e => console.log(e));
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
