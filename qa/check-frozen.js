const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('requestfailed', r => errs.push('reqfail: ' + r.url() + ' — ' + r.failure().errorText));
  await page.goto('https://tax.wizelife.ai/relocation-analyzer?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  // Check basic elements
  const title = await page.title();
  const rows = await page.locator('tbody tr').count();
  const onboard = await page.locator('#wize-onboarding').count();
  const obVisible = onboard ? await page.locator('#wize-onboarding').isVisible() : false;
  const body = await page.locator('body').isVisible();
  const bodyText = (await page.locator('body').innerText()).slice(0, 200);
  console.log('title:', title);
  console.log('body visible:', body);
  console.log('rows:', rows);
  console.log('onboarding count:', onboard, 'visible:', obVisible);
  console.log('body first 200 chars:', bodyText);
  console.log('---ERRORS---');
  errs.forEach(e => console.log(e));
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
