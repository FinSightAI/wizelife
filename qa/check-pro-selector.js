// End-to-end test for Pro tool country selector on /relocation-analyzer.
const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  ✗ pageerror:', e.message.slice(0,150)));
  // Pre-seed localStorage so onboarding + quick-start don't show — those modals
  // are well-tested separately, and not what this suite is verifying.
  await ctx.addInitScript(() => {
    try {
      ['wl_ob_tax','wl_ob_relocation','wl_qs_tax','wl_qs_relocation',
       'wl_ob_finsight','wl_ob_wizelife'].forEach(k => localStorage.setItem(k, '1'));
    } catch {}
  });
  await page.goto('https://mastermove.vercel.app/relocation-analyzer?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Fallback: still try backdrop tap if modal somehow shows
  try {
    if (await page.locator('#wize-onboarding').isVisible({ timeout: 500 })) {
      await page.locator('#wize-onboarding').click({ position: { x: 10, y: 10 }, force: true });
      await page.waitForTimeout(500);
    }
  } catch {}

  // 1) Chips render
  const chips = await page.locator('span[data-code]').count();
  console.log((chips === 13 ? '✓' : '✗') + ` ${chips} chips (expected 13)`);

  // 2) IL chip locked (aria-disabled)
  const ilAria = await page.locator('span[data-code="IL"]').getAttribute('aria-disabled');
  console.log((ilAria === 'true' ? '✓' : '✗') + ' IL chip aria-disabled');

  // 3) Default rows = 8 (default selection)
  const initRows = await page.locator('tbody tr').count();
  console.log((initRows === 8 ? '✓' : '✗') + ` ${initRows} rows initially (expected 8)`);

  // 4) Click PT to deselect → 7 rows
  await page.locator('span[data-code="PT"]').click();
  await page.waitForTimeout(300);
  const afterDeselect = await page.locator('tbody tr').count();
  console.log((afterDeselect === 7 ? '✓' : '✗') + ` ${afterDeselect} rows after deselecting PT (expected 7)`);

  // 5) "All" button — 13 rows
  await page.locator('button:has-text("כולן"), button:has-text("All")').first().click();
  await page.waitForTimeout(300);
  const allRows = await page.locator('tbody tr').count();
  console.log((allRows === 13 ? '✓' : '✗') + ` ${allRows} rows after All (expected 13)`);

  // 6) "Clear" — only IL (1 row)
  await page.locator('button:has-text("נקה"), button:has-text("Clear")').first().click();
  await page.waitForTimeout(300);
  const clearRows = await page.locator('tbody tr').count();
  console.log((clearRows === 1 ? '✓' : '✗') + ` ${clearRows} rows after Clear (expected 1 = IL only)`);

  // 7) "Default" — back to 8
  await page.locator('button:has-text("ברירת מחדל"), button:has-text("Default")').first().click();
  await page.waitForTimeout(300);
  const defRows = await page.locator('tbody tr').count();
  console.log((defRows === 8 ? '✓' : '✗') + ` ${defRows} rows after Default (expected 8)`);

  // 8) localStorage persists
  const stored = await page.evaluate(() => localStorage.getItem('wl_selected_countries_pro'));
  console.log((stored && stored.includes('"IL"') ? '✓' : '✗') + ' localStorage persists: ' + (stored||'').slice(0,80));

  // 9) IL chip click → no change (locked)
  await page.locator('span[data-code="IL"]').click();
  await page.waitForTimeout(150);
  const stillThere = await page.locator('tbody tr').count();
  console.log((stillThere === defRows ? '✓' : '✗') + ` IL click does not toggle (rows stay ${defRows})`);

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
