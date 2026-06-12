const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await (await browser.newContext()).newPage();
  page.on('response', async r => {
    if (r.url().includes('exchangeRecaptchaV3Token')) {
      const body = await r.text().catch(() => 'n/a');
      console.log('STATUS', r.status(), 'BODY:', body.slice(0, 500));
    }
  });
  await page.goto('https://wizelife.ai/feedback.html', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(12000);
  // Does the page degrade? check if firestore/auth still works in console state
  const appCheckDebug = await page.evaluate(() => window.__APPCHECK_DEBUG || (localStorage.getItem('wl_lang'), 'n/a'));
  await browser.close();
})();
