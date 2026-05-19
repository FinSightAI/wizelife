// Verify Pro /relocation-analyzer after 13-country + 8-regime expansion
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  ✗ pageerror:', e.message.slice(0, 150)));

  await page.goto('https://mastermove.vercel.app/relocation-analyzer?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Dismiss onboarding modal if it shows up (1st-visit only)
  try {
    const ob = page.locator('#wize-onboarding');
    if (await ob.isVisible()) {
      // Try close button / skip
      const close = ob.locator('button:has-text("Skip"), button:has-text("דלג"), button[aria-label*="close"], button:has-text("×")').first();
      if (await close.count() > 0) await close.click({ force: true });
      // Or click outside
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (_) {}

  // 1) Country rows present
  const rows = await page.locator('tbody tr').count();
  console.log((rows === 13 ? '✓' : '✗') + ` ${rows} country rows (expected 13)`);

  // 2) Each new country visible
  for (const c of ['Madrid','Athens','Sliema','Tbilisi','São Paulo']) {
    const found = await page.locator('tbody').filter({ hasText: c }).count();
    console.log((found >= 1 ? '✓' : '✗') + ` ${c} visible`);
  }

  // 3) Olim toggle present — find by surrounding text label
  const toggleLabel = page.locator('label').filter({ hasText: /עולה חדש|new immigrant|returning resident/ }).first();
  const toggle = toggleLabel.locator('input[type=checkbox]');
  const hasToggle = await toggle.count();
  console.log((hasToggle === 1 ? '✓' : '✗') + ' olim toggle present');

  // 4) No regime badges before toggle
  const badgesBefore = await page.locator('tbody tr td span:has-text("⭐")').count();
  console.log((badgesBefore === 0 ? '✓' : '✗') + ` ${badgesBefore} regime badges before toggle (expected 0)`);

  // 5) Capture PT net + best-pick before
  const ptNetBefore = await page.locator('tbody tr').filter({ hasText: 'Lisbon' }).locator('td').nth(1).textContent();
  const bestBefore = await page.locator('div').filter({ hasText: /BEST BY PURCHASING POWER|הבחירה המיטבית/ }).locator('+ div').first().textContent().catch(() => '?');

  // 6) Click olim toggle (force, in case onboarding modal still hovers)
  await toggle.check({ force: true });
  await page.waitForTimeout(700);

  // 7) Regime badges should appear (8 expected)
  const badgesAfter = await page.locator('tbody tr td span:has-text("⭐")').count();
  console.log((badgesAfter >= 7 ? '✓' : '✗') + ` ${badgesAfter} regime badges after toggle (expected ≥7)`);

  // 8) PT net should change (NHR applied)
  const ptNetAfter = await page.locator('tbody tr').filter({ hasText: 'Lisbon' }).locator('td').nth(1).textContent();
  console.log('  PT net: ' + ptNetBefore.trim().split('\n')[0] + ' → ' + ptNetAfter.trim().split('\n')[0]);

  // 9) Brazil should NOT have a regime badge
  const brRow = page.locator('tbody tr').filter({ hasText: 'São Paulo' });
  const brBadges = await brRow.locator('span:has-text("⭐")').count();
  console.log((brBadges === 0 ? '✓' : '✗') + ' Brazil correctly has NO regime badge');

  // 10) ES should have Beckham badge
  const esBadge = await page.locator('tbody tr').filter({ hasText: 'Madrid' }).locator('span:has-text("Beckham")').count();
  console.log((esBadge === 1 ? '✓' : '✗') + ' Spain Beckham badge visible');

  // 11) GE should have Small Business badge
  const geBadge = await page.locator('tbody tr').filter({ hasText: 'Tbilisi' }).locator('span:has-text("Small Business")').count();
  console.log((geBadge === 1 ? '✓' : '✗') + ' Georgia Small Business badge visible');

  // 12) GR olim 7% badge
  const grBadge = await page.locator('tbody tr').filter({ hasText: 'Athens' }).locator('span:has-text("7%")').count();
  console.log((grBadge === 1 ? '✓' : '✗') + ' Greece 7% olim badge visible');

  // 13) MT Non-Dom
  const mtBadge = await page.locator('tbody tr').filter({ hasText: 'Sliema' }).locator('span:has-text("Non-Dom")').count();
  console.log((mtBadge === 1 ? '✓' : '✗') + ' Malta Non-Dom badge visible');

  // 14) SVG chart still renders
  const svgCount = await page.locator('svg[aria-label*="10-year"]').count();
  console.log((svgCount === 1 ? '✓' : '✗') + ' 10-year SVG chart still renders');

  // 15) Best pick callout
  const bestCallout = await page.locator('div').filter({ hasText: /BEST BY|הבחירה המיטבית/ }).count();
  console.log((bestCallout >= 1 ? '✓' : '✗') + ' Best-pick callout present');

  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
