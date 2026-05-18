// Safety check before Show HN — verify the 4 key pages render without
// errors and key flows work. Run this Monday evening before submission.
const { chromium, devices } = require('playwright');

const PAGES = [
  { name: 'salary-compare', url: 'https://wizelife.ai/p/salary-compare.html', check: ['#gross', '.r-row', '.pp', '#openDeepBtn', '#shareWrap'] },
  { name: 'relocate-portugal', url: 'https://wizelife.ai/p/relocate-portugal.html', check: ['#gross', '#savingsBig', '.caveats'] },
  { name: 'tax /relocation-analyzer', url: 'https://mastermove.vercel.app/relocation-analyzer', check: ['h1', 'table'] },
  { name: 'tax /social-compare', url: 'https://mastermove.vercel.app/social-compare', check: ['h1', 'table'] },
  { name: 'tax /exit-tax-calculator', url: 'https://mastermove.vercel.app/exit-tax-calculator', check: ['h1', 'input[type=number]'] },
];

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  console.log('--- Show HN safety check, ' + new Date().toISOString() + ' ---\n');
  for (const p of PAGES) {
    const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const txt = m.text();
      // Filter known-harmless noise: CSP from 3rd-party widgets + Firebase Auth iframe
      if (/cloudflareinsights|recaptcha|cdn-cgi|google\.com\/recaptcha|finzilla-7f1f9\.firebaseapp\.com|Framing.*Content Security/i.test(txt)) return;
      errs.push('[' + m.type() + '] ' + txt.slice(0, 200));
    });
    try {
      const resp = await page.goto(p.url + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
      const status = resp ? resp.status() : 0;
      if (status >= 400) { console.log('✗ ' + p.name + ' — HTTP ' + status); failed++; await ctx.close(); continue; }
      await page.waitForTimeout(2500);
      const missing = [];
      for (const sel of p.check) {
        const cnt = await page.locator(sel).count();
        if (cnt === 0) missing.push(sel);
      }
      if (missing.length === 0 && errs.length === 0) {
        console.log('✓ ' + p.name);
      } else {
        console.log('✗ ' + p.name);
        missing.forEach(m => console.log('    missing: ' + m));
        errs.slice(0, 4).forEach(e => console.log('    error:   ' + e));
        failed++;
      }
    } catch (e) {
      console.log('✗ ' + p.name + ' — ' + e.message);
      failed++;
    }
    await ctx.close();
  }
  // Bonus: test the deep modal flow on salary-compare
  console.log('\n--- /p/salary-compare deep-modal flow ---');
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto('https://wizelife.ai/p/salary-compare.html?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  try {
    await page.locator('#openDeepBtn').click();
    await page.waitForTimeout(400);
    const modalVisible = await page.locator('#deepModal.on').count();
    console.log((modalVisible ? '✓' : '✗') + ' modal opens');
    const tabs = await page.locator('.deep-modal-tabs button').count();
    console.log((tabs === 2 ? '✓' : '✗') + ' two tabs visible (manual + upload)');
    await page.locator('#runDeep').click();
    await page.waitForTimeout(600);
    const deepRows = await page.locator('#deepResult .deep-row').count();
    console.log((deepRows > 0 ? '✓' : '✗') + ' deep result rendered (' + deepRows + ' rows)');
  } catch (e) {
    console.log('✗ deep modal flow failed: ' + e.message);
    failed++;
  }
  await ctx.close();
  await browser.close();
  console.log('\n' + (failed === 0 ? '✅ ALL CHECKS PASS — ready for Show HN' : '❌ ' + failed + ' issue(s) — fix before Show HN'));
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
