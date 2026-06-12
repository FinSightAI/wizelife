// Crisp repro: does a brand-new visitor's first page reload itself?
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(); // fresh profile = first-time visitor
  const page = await ctx.newPage();
  let navs = 0;
  page.on('framenavigated', f => { if (f === page.mainFrame()) { navs++; console.log(`nav #${navs} at ${Date.now() - t0}ms -> ${f.url()}`); } });
  const t0 = Date.now();
  await page.goto('https://wizelife.ai/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(15000);
  console.log('TOTAL main-frame navigations in 15s:', navs, '(1 = normal, 2+ = self-reload)');
  await browser.close();
})();
