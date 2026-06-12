const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await (await browser.newContext()).newPage();
  const hits = [];
  page.on('response', r => { if (r.url().includes('exchangeRecaptchaV3Token')) hits.push(r.status()); });
  await page.goto('https://wizelife.ai/feedback.html', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(12000);
  console.log('HEADED exchangeRecaptchaV3Token statuses:', JSON.stringify(hits));
  await browser.close();
})();
