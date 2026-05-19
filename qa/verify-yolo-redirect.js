const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type()==='error') console.log('CON:', m.text().slice(0,120)); });
  // Visit salary-compare with #deep hash directly — should auto-open modal
  await page.goto('https://wizelife.ai/p/salary-compare.html#deep?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const modalOpen = await page.evaluate(() => {
    const m = document.getElementById('deepModal');
    return m && m.classList.contains('on');
  });
  console.log('#deep hash auto-opens deep modal:', modalOpen ? '✓' : '✗ — wait for SW to refresh');

  // Also verify the CTA href has the new next= URL
  const ctaHref = await page.evaluate(() => {
    const all = [...document.querySelectorAll('a[href*="auth.html"]')];
    return all.map(a => a.href);
  });
  console.log('auth.html CTA hrefs on page:');
  ctaHref.forEach(h => console.log('  ' + h.slice(0,120)));
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
