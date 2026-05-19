// Local smoke test for country selector on /p/salary-compare.html
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 200)); });
  const file = 'http://localhost:8765/p/salary-compare.html';
  await page.goto(file, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  // 1) Chips render
  const chips = await page.locator('.cchip').count();
  console.log((chips >= 20 ? '✓' : '✗') + ` ${chips} chips rendered (expected ≥20)`);

  // 2) IL chip is locked + on
  const ilChip = page.locator('.cchip[data-code="IL"]');
  const ilCls = await ilChip.getAttribute('class');
  console.log((ilCls && ilCls.includes('on') && ilCls.includes('locked') ? '✓' : '✗') + ' IL chip is on+locked: ' + ilCls);

  // 3) Default selection — 8 chips with 'on'
  const onCount = await page.locator('.cchip.on').count();
  console.log((onCount === 8 ? '✓' : '✗') + ` ${onCount} chips initially "on" (expected 8)`);

  // 4) Click a non-selected chip (TH should not be in default) — toggle on
  const thChip = page.locator('.cchip[data-code="TH"]');
  const thBefore = await thChip.getAttribute('class');
  await thChip.click();
  await page.waitForTimeout(100);
  const thAfter = await thChip.getAttribute('class');
  console.log((thBefore && !thBefore.includes('on') && thAfter && thAfter.includes('on') ? '✓' : '✗') + ' TH chip toggled on');

  // 5) Click IL — should NOT toggle (locked)
  await page.locator('.cchip[data-code="IL"]').click();
  await page.waitForTimeout(100);
  const ilAfter = await page.locator('.cchip[data-code="IL"]').getAttribute('class');
  console.log((ilAfter && ilAfter.includes('on') ? '✓' : '✗') + ' IL remains on after click');

  // 6) Clear button — IL stays
  await page.click('#selClear');
  await page.waitForTimeout(150);
  const afterClear = await page.locator('.cchip.on').count();
  console.log((afterClear === 1 ? '✓' : '✗') + ` ${afterClear} chip(s) on after Clear (expected 1 = IL)`);

  // 7) Select All — all 25 chips on
  await page.click('#selAll');
  await page.waitForTimeout(150);
  const afterAll = await page.locator('.cchip.on').count();
  console.log((afterAll >= 20 ? '✓' : '✗') + ` ${afterAll} chips on after Select All`);

  // 8) Default — back to 8
  await page.click('#selDefault');
  await page.waitForTimeout(150);
  const afterDefault = await page.locator('.cchip.on').count();
  console.log((afterDefault === 8 ? '✓' : '✗') + ` ${afterDefault} chips on after Default (expected 8)`);

  // 9) Results filter — fill salary, count rows = 8
  await page.fill('#gross', '25000');
  await page.waitForTimeout(400);
  const rows = await page.locator('#results .r-row').count();
  console.log((rows === 8 ? '✓' : '✗') + ` ${rows} result rows (expected 8 — matches Default)`);

  // 10) Toggle off PT → 7 rows
  await page.locator('.cchip[data-code="PT"]').click();
  await page.waitForTimeout(300);
  const rows2 = await page.locator('#results .r-row').count();
  console.log((rows2 === 7 ? '✓' : '✗') + ` ${rows2} rows after deselecting PT (expected 7)`);

  // 11) localStorage persists
  const stored = await page.evaluate(() => localStorage.getItem('wl_selected_countries'));
  console.log((stored && !stored.includes('"PT"') ? '✓' : '✗') + ' localStorage updated (no PT): ' + (stored||'').slice(0,80));

  // 12) Lang switch — chips re-render (tax-data.js names are HE-only string,
  //     pre-existing limitation; just verify re-render happens without error)
  await page.click('#langSwitch button[data-l="en"]');
  await page.waitForTimeout(300);
  const enChip = await page.locator('.cchip[data-code="PT"]').textContent();
  const stillRenders = enChip && enChip.trim().length > 2;
  console.log((stillRenders ? '✓' : '✗') + ' Re-render after lang switch: PT chip = "' + (enChip||'').trim() + '"');

  console.log('---ERRORS---');
  errs.slice(0, 5).forEach(e => console.log(e));
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
