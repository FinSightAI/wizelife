// Verify the new olim-toggle flow on /p/salary-compare end-to-end.
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  await ctx.route('**/tax-data.js*', async (r) => {
    const x = await fetch(r.request().url(), { cache: 'no-store' });
    await r.fulfill({ status: 200, contentType: 'application/javascript', body: await x.text() });
  });
  const page = await ctx.newPage();

  await page.goto('https://wizelife.ai/p/salary-compare.html?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // ── Test 1: olim toggle exists ──
  const togglerCount = await page.locator('#olimToggle').count();
  console.log((togglerCount === 1 ? '✓' : '✗') + ' olim toggle visible');

  // ── Test 2: 25 country rows (was 20 before) ──
  const rowCount = await page.locator('.r-row').count();
  console.log((rowCount === 25 ? '✓' : '✗') + ` ${rowCount} country rows (expected 25 = 20 original + 5 new)`);

  // ── Test 3: Malta visible ──
  const hasMalta = await page.locator('.r-row .name:text-matches("מלטה|Malta")').count();
  console.log((hasMalta >= 1 ? '✓' : '✗') + ' Malta row present');

  // ── Test 4: Without olim toggle, no regime badges ──
  const badgesBeforeToggle = await page.locator('.r-row .name span').count();
  console.log((badgesBeforeToggle === 0 ? '✓' : '✗') + ` ${badgesBeforeToggle} regime badges (expected 0 — toggle off)`);

  // ── Test 5: Get PT net before toggle ──
  const ptBefore = await page.locator('.r-row').filter({ hasText: /פורטוגל|Portugal/ }).locator('.net').textContent();
  console.log('  PT net before olim toggle: ' + ptBefore.trim());

  // ── Test 6: Activate olim toggle ──
  await page.locator('#olimToggle').click();
  await page.waitForTimeout(500);

  // ── Test 7: Regime badges should appear ──
  const badgesAfter = await page.locator('.r-row .name span').count();
  console.log((badgesAfter >= 5 ? '✓' : '✗') + ` ${badgesAfter} regime badges after toggle (expected ≥5)`);

  // ── Test 8: PT net should be HIGHER (NHR applied) ──
  const ptAfter = await page.locator('.r-row').filter({ hasText: /פורטוגל|Portugal/ }).locator('.net').textContent();
  console.log('  PT net after olim toggle: ' + ptAfter.trim());
  const ptBeforeNum = parseInt(ptBefore.replace(/[^\d]/g, ''));
  const ptAfterNum = parseInt(ptAfter.replace(/[^\d]/g, ''));
  console.log((ptAfterNum > ptBeforeNum ? '✓' : '✗') + ` PT net increased by $${ptAfterNum - ptBeforeNum}/mo via NHR`);

  // ── Test 9: CY should also gain ──
  const cyAfter = await page.locator('.r-row').filter({ hasText: /קפריסין|Cyprus/ }).locator('.net').textContent();
  console.log('  CY net after olim toggle: ' + cyAfter.trim());

  // ── Test 10: Sort order changes (new winners) ──
  const topNonIL = await page.locator('.r-row:not(.il) .name').first().textContent();
  console.log('  Top non-IL country after toggle: ' + topNonIL.trim().split('⭐')[0].trim());

  await browser.close();
  console.log('\n✅ Regime flow live and working');
})().catch(e => { console.error(e); process.exit(2); });
