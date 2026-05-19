const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 800, height: 900 } })).newPage();
  page.on('pageerror', e => console.log('PAGE:', e.message));
  page.on('console', m => { if (m.type()==='error') console.log('CONS:', m.text().slice(0,150)); });
  // --- TEST 1: Free user — should see CTA, not table ---
  await page.goto('http://localhost:8765/p/salary-compare.html?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.evaluate(() => localStorage.removeItem('wl_sso'));
  await page.fill('#gross', '25000');
  await page.click('#openDeepBtn');
  await page.waitForTimeout(400);
  await page.click('#runDeep');
  await page.waitForTimeout(400);
  const ctaFree = await page.locator('text=/Pro\\/YOLO|שדרג ל-Pro/').count();
  const tableFree = await page.locator('table tr td:has-text("Keren")').count() + await page.locator('table tr td:has-text("קרן")').count();
  console.log('FREE: CTA shown=' + (ctaFree > 0 ? '✓' : '✗') + ', table absent=' + (tableFree === 0 ? '✓' : '✗'));

  // --- TEST 2: Pro user — should see full line-item table ---
  await page.evaluate(() => localStorage.setItem('wl_sso', JSON.stringify({ plan: 'pro' })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.fill('#gross', '25000');
  await page.click('#openDeepBtn');
  await page.waitForTimeout(400);
  await page.click('#runDeep');
  await page.waitForTimeout(500);
  const tableRows = await page.locator('table tbody tr').count();
  const ilFlag    = await page.locator('table thead :text("🇮🇱")').count();
  const kerenRow  = await page.locator('table tbody tr:has-text("Keren"), table tbody tr:has-text("קרן")').count();
  console.log('PRO: table rows=' + tableRows + ' (expect 9)' + (tableRows === 9 ? ' ✓' : ' ✗'));
  console.log('PRO: IL flag in header=' + (ilFlag > 0 ? '✓' : '✗'));
  console.log('PRO: Keren Hishtalmut row=' + (kerenRow > 0 ? '✓' : '✗'));

  // --- TEST 3: YOLO user — same unlock ---
  await page.evaluate(() => localStorage.setItem('wl_sso', JSON.stringify({ plan: 'yolo' })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.fill('#gross', '25000');
  await page.click('#openDeepBtn');
  await page.waitForTimeout(400);
  await page.click('#runDeep');
  await page.waitForTimeout(500);
  const yoloTable = await page.locator('table tbody tr').count();
  console.log('YOLO: table rows=' + yoloTable + (yoloTable === 9 ? ' ✓' : ' ✗'));

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
