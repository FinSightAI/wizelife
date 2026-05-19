const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const url of ['https://tax.wizelife.ai/relocation-analyzer','https://deal.wizelife.ai/']) {
    const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
    const page = await ctx.newPage();
    await page.goto(url + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    if (!(await page.locator('#wize-onboarding').isVisible())) { console.log(url + ': no modal'); await ctx.close(); continue; }
    // All buttons inside the modal
    const btns = await page.locator('#wize-onboarding button').all();
    console.log('--- ' + url + ' --- ' + btns.length + ' buttons:');
    for (let i = 0; i < btns.length; i++) {
      const b = btns[i];
      const t = (await b.textContent() || '').trim().slice(0, 12);
      const al = await b.getAttribute('aria-label') || '';
      const box = await b.boundingBox();
      console.log(`  [${i}] "${t}" aria="${al}" — ${box ? Math.round(box.width)+'×'+Math.round(box.height) : 'no-box'}`);
    }
    // Also pull the live JS content to see what version is deployed
    const live = await page.evaluate(async () => {
      const r = await fetch('/wize-onboarding.js', { cache: 'no-cache' });
      const text = await r.text();
      const m = text.match(/closeBtn\.style\.cssText\s*=\s*['"][^'"]+['"]/);
      return m ? m[0].slice(0, 250) : '(no match)';
    });
    console.log('  live closeBtn style:', live);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
