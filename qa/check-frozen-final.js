const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  const slow = [];
  page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  page.on('console', m => { if (m.type()==='error'||m.type()==='warning') errs.push(m.type().toUpperCase()+': ' + m.text().slice(0,180)); });

  const start = Date.now();
  await page.goto('https://tax.wizelife.ai/relocation-analyzer?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('DOM loaded:', Date.now() - start, 'ms');
  await page.waitForTimeout(2500);

  // Check if there are MULTIPLE overlays
  const overlays = await page.evaluate(() => {
    const all = document.querySelectorAll('[role="dialog"], [aria-modal="true"], #wize-onboarding, #wlQuickStart, .modal, [data-overlay]');
    return Array.from(all).map(el => ({
      id: el.id,
      cls: el.className,
      role: el.getAttribute('role'),
      visible: window.getComputedStyle(el).display !== 'none' && el.offsetWidth > 0,
      zIndex: window.getComputedStyle(el).zIndex,
    }));
  });
  console.log('Overlays detected:', overlays.length);
  overlays.forEach(o => console.log('  ', JSON.stringify(o)));

  // What's at the center of the screen?
  const centerEl = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth/2, window.innerHeight/2);
    if (!el) return 'none';
    return el.tagName + '#' + el.id + '.' + (el.className||'').slice(0,40);
  });
  console.log('Center of screen:', centerEl);

  // Can we interact with the salary input?
  const inp = page.locator('input[type=number]').first();
  console.log('Input exists:', await inp.count());
  try {
    await inp.fill('30000', { timeout: 5000 });
    console.log('✓ Input works');
  } catch (e) { console.log('✗ Input BLOCKED:', e.message.slice(0,100)); }

  // Check for stuck scroll
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(300);
  const sy = await page.evaluate(() => window.scrollY);
  console.log('Scroll Y after scrollTo(500):', sy, '(0 = page locked!)');

  // What screenshots reveal
  await page.screenshot({ path: '/tmp/pro-now.png', fullPage: false });
  console.log('Screenshot: /tmp/pro-now.png');

  console.log('--- ERRORS ---');
  errs.slice(0,10).forEach(e => console.log(e));
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
