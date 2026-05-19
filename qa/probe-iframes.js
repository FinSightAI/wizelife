const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  await page.goto('https://money.wizelife.ai/pages/ai-chat.html?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const frames = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('iframe')).map(f => ({
      src: f.src || '(no src)',
      sandbox: f.sandbox.toString() || '(none)',
      id: f.id, name: f.name, cls: f.className,
    }));
  });
  console.log('Iframes:', JSON.stringify(frames, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
