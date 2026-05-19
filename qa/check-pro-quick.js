const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 150)); });
  const url = process.argv[2] || 'https://mastermove.vercel.app/relocation-analyzer';
  await page.goto(url + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(4000);
  const rows = await page.locator('tbody tr').count();
  console.log('URL:', url);
  console.log('Rows:', rows);
  // CSP check: did Firebase iframe load?
  const cspErrs = errs.filter(e => /Content Security|frame-src|default-src/i.test(e));
  console.log('CSP errors:', cspErrs.length);
  cspErrs.slice(0, 3).forEach(e => console.log('  -', e.slice(0, 200)));
  console.log('Other errs:', errs.length - cspErrs.length);
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
