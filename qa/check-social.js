const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const lang of ['he','en','pt','es']) {
    const ctx = await b.newContext({ ...devices['iPhone 14 Pro'] });
    const p = await ctx.newPage();
    await p.addInitScript(l => { try{localStorage.setItem('wl_lang',l);localStorage.setItem('wl_ob_tax','1');localStorage.setItem('wl_qs_tax','1');}catch{} }, lang);
    await p.goto('https://tax.wizelife.ai/social-compare?cb=' + Date.now(), { waitUntil:'domcontentloaded', timeout:30000 });
    await p.waitForTimeout(3500);
    const txt = await p.evaluate(() => document.body.innerText);
    const hasNaN = /\bNaN\b/.test(txt);
    const hasUndef = /\bundefined\b/.test(txt);
    const rows = await p.locator('tbody tr, table tr').count();
    console.log(`${lang}: rows=${rows} NaN=${hasNaN?'✗ FOUND':'✓ none'} undefined=${hasUndef?'✗ FOUND':'✓ none'}`);
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
