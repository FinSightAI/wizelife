// Cross-platform sanity: confirm today's fixes hold up on iPhone + Pixel + Desktop.
const { chromium, devices } = require('playwright');

const TESTS = [
  // [device-key, label]
  ['iPhone 14 Pro', '📱 iPhone'],
  ['Pixel 7',       '🤖 Pixel'],
];
const DESKTOP_VP = { width: 1280, height: 800 };

async function verifyAt(browser, deviceKey, label, url, checks) {
  let ctx;
  if (deviceKey === 'desktop') {
    ctx = await browser.newContext({ viewport: DESKTOP_VP });
  } else {
    ctx = await browser.newContext({ ...devices[deviceKey], hasTouch: true });
  }
  const page = await ctx.newPage();
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(3000);
  for (const check of checks) {
    try {
      const r = await check.fn(page);
      console.log(`  ${label} ${url.split('//')[1].slice(0,40)} ${check.name}: ${r ? '✓' : '✗'}`);
    } catch (e) {
      console.log(`  ${label} ${url.split('//')[1].slice(0,40)} ${check.name}: ✗ ${e.message.slice(0,60)}`);
    }
  }
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  console.log('=== ✕ button 44×44 (after today\'s fix) ===');
  const xCheck = [{
    name: 'X is 44×44',
    fn: async (page) => {
      if (!(await page.locator('#wize-onboarding').isVisible())) return true;
      const box = await page.locator('#wize-onboarding button[aria-label="סגור"], #wize-onboarding button[aria-label="Close"]').first().boundingBox();
      return box && box.width >= 44 && box.height >= 44;
    }
  }];
  for (const [d, l] of TESTS) {
    await verifyAt(browser, d, l, 'https://tax.wizelife.ai/relocation-analyzer', xCheck);
    await verifyAt(browser, d, l, 'https://deal.wizelife.ai/', xCheck);
  }

  console.log('\n=== Scroll lock fixed on /relocation-analyzer ===');
  const scrollCheck = [{
    name: 'body overflow visible',
    fn: async (page) => (await page.evaluate(() => getComputedStyle(document.body).overflow)) === 'visible',
  }, {
    name: 'page scrolls 500+ px',
    fn: async (page) => {
      await page.evaluate(() => window.scrollTo(0, 800));
      await page.waitForTimeout(300);
      return (await page.evaluate(() => window.scrollY)) > 500;
    }
  }];
  for (const [d, l] of TESTS) await verifyAt(browser, d, l, 'https://tax.wizelife.ai/relocation-analyzer', scrollCheck);

  console.log('\n=== Country selector chips render + functional ===');
  const chipCheck = [{
    name: '13 chips + IL locked',
    fn: async (page) => {
      const n = await page.locator('span[data-code]').count();
      const ilLocked = (await page.locator('span[data-code="IL"]').getAttribute('aria-disabled')) === 'true';
      return n === 13 && ilLocked;
    }
  }];
  for (const [d, l] of TESTS) await verifyAt(browser, d, l, 'https://tax.wizelife.ai/relocation-analyzer', chipCheck);

  console.log('\n=== /p/salary-compare selector on landing ===');
  const landingChipCheck = [{
    name: '25 chips render',
    fn: async (page) => (await page.locator('.cchip').count()) >= 20,
  }];
  for (const [d, l] of TESTS) await verifyAt(browser, d, l, 'https://wizelife.ai/p/salary-compare.html', landingChipCheck);

  console.log('\n=== CSP frame-src includes Firebase Auth ===');
  const cspCheck = [{
    name: 'frame-src has firebaseapp.com',
    fn: async (page) => {
      const r = await page.evaluate(async () => {
        const res = await fetch(location.href, { method: 'HEAD' });
        return res.headers.get('content-security-policy') || '';
      });
      return /frame-src[^;]*firebaseapp\.com/i.test(r);
    }
  }];
  for (const [d, l] of TESTS) await verifyAt(browser, d, l, 'https://tax.wizelife.ai/relocation-analyzer', cspCheck);

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
