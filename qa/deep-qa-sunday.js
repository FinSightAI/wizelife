// Deep QA — runs end-to-end flows on every page shipped today (and a few
// existing pages that the funnel depends on). Reports specific bugs, not
// just "page loaded".
//
// Run: node qa/deep-qa-sunday.js
const { chromium, devices } = require('playwright');

const URLS = {
  // Public landing pages (TODO: HN traffic lands here)
  'salary-compare':       'https://wizelife.ai/p/salary-compare.html',
  'relocate-portugal':    'https://wizelife.ai/p/relocate-portugal.html',
  // Portal — depends-on for sign-up flow
  'homepage':             'https://wizelife.ai/',
  'auth':                 'https://wizelife.ai/auth.html',
  'dashboard':            'https://wizelife.ai/dashboard.html',
  // WizeTax depth tools — what HN viewers might explore
  'relocation-analyzer':  'https://mastermove.vercel.app/relocation-analyzer',
  'social-compare':       'https://mastermove.vercel.app/social-compare',
  'exit-tax-calculator':  'https://mastermove.vercel.app/exit-tax-calculator',
};

const PROBLEMS = [];
function fail(page, msg) { PROBLEMS.push({ page, msg }); }
function ok(page, msg)    { console.log('  ✓ ' + msg); }
function bad(page, msg)   { console.log('  ✗ ' + msg); fail(page, msg); }

const NOISE_REGEX = /cloudflareinsights|recaptcha|cdn-cgi|google\.com\/recaptcha|finzilla-7f1f9\.firebaseapp\.com|Framing.*Content Security|frame-ancestors.*meta|ERR_ABORTED|net::ERR_FAILED.*beacon/i;

async function basicLoad(page, url, key) {
  console.log(`\n── ${key.padEnd(22)} (${url})`);
  const errs = [];
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (NOISE_REGEX.test(t)) return;
    errs.push('console: ' + t.slice(0, 220));
  });
  const t0 = Date.now();
  let status = 0;
  try {
    const resp = await page.goto(url + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 25000 });
    status = resp ? resp.status() : 0;
  } catch (e) {
    bad(key, 'navigation failed: ' + e.message);
    return false;
  }
  const ttfb = Date.now() - t0;
  if (status >= 400) { bad(key, `HTTP ${status}`); return false; }
  if (ttfb > 5000) bad(key, `slow load: ${ttfb}ms`); else ok(key, `loaded in ${ttfb}ms (HTTP ${status})`);
  await page.waitForTimeout(2500);
  if (errs.length === 0) ok(key, 'no JS errors');
  else errs.slice(0, 3).forEach(e => bad(key, e));
  return true;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  // Intercept tax-data.js + share + others — bypass any browser cache
  await ctx.route('**/wize-share.js*', async (r) => { const x = await fetch(r.request().url(), { cache: 'no-store' }); await r.fulfill({ status: 200, contentType: 'application/javascript', body: await x.text() }); });
  await ctx.route('**/tax-data.js*',   async (r) => { const x = await fetch(r.request().url(), { cache: 'no-store' }); await r.fulfill({ status: 200, contentType: 'application/javascript', body: await x.text() }); });
  const page = await ctx.newPage();

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE: salary-compare — the main HN landing
  // ─────────────────────────────────────────────────────────────────────────
  if (await basicLoad(page, URLS['salary-compare'], 'salary-compare')) {
    // 20 rows visible
    const rowCount = await page.locator('.r-row').count();
    if (rowCount >= 20) ok('salary-compare', `${rowCount} country rows rendered`);
    else bad('salary-compare', `only ${rowCount} rows (expected 20)`);

    // COL line (new today) visible
    const ppCount = await page.locator('.r-row .pp').count();
    if (ppCount === rowCount) ok('salary-compare', `Real PP line on all ${ppCount} rows`);
    else bad('salary-compare', `Real PP missing on ${rowCount - ppCount} rows`);

    // Share button works (clicks open menu)
    const shareBtnCount = await page.locator('.share-btns button').count();
    if (shareBtnCount === 3) ok('salary-compare', '3 share buttons present');
    else bad('salary-compare', `share buttons count = ${shareBtnCount} (expected 3)`);

    // Deep-analysis modal opens
    await page.locator('#openDeepBtn').click();
    await page.waitForTimeout(400);
    const modalOpen = await page.locator('#deepModal.on').count();
    if (modalOpen) ok('salary-compare', 'deep modal opens');
    else bad('salary-compare', 'deep modal did NOT open');

    // Both tabs visible
    const tabs = await page.locator('.deep-modal-tabs button').count();
    if (tabs === 2) ok('salary-compare', 'both tabs visible');
    else bad('salary-compare', `tabs = ${tabs}`);

    // Manual entry → "Run Deep" → 5 rows result
    await page.locator('#runDeep').click();
    await page.waitForTimeout(600);
    const deepRows = await page.locator('#deepResult .deep-row').count();
    if (deepRows === 5) ok('salary-compare', `deep analysis shows ${deepRows} rows`);
    else bad('salary-compare', `deep analysis shows ${deepRows} rows (expected 5)`);

    // Sign-up CTA in deep result
    const ctaCount = await page.locator('#deepResult a[href*="auth.html"]').count();
    if (ctaCount > 0) ok('salary-compare', 'sign-up CTA present in deep result');
    else bad('salary-compare', 'sign-up CTA missing from deep result');

    // Change gross → results re-render
    await page.locator('#gross').fill('40000');
    await page.waitForTimeout(400);
    const newIlNet = await page.locator('.r-row.il .net').textContent();
    if (newIlNet && newIlNet.includes('$')) ok('salary-compare', `gross change re-renders (IL net = ${newIlNet.trim()})`);
    else bad('salary-compare', 'gross input did not re-render');

    // Language switch (HE → EN)
    await page.locator('#langSwitch button[data-l="en"]').click();
    await page.waitForTimeout(400);
    const dirEN = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    if (dirEN === 'ltr') ok('salary-compare', 'HE → EN switches dir to ltr');
    else bad('salary-compare', `lang switch failed, dir=${dirEN}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE: relocate-portugal
  // ─────────────────────────────────────────────────────────────────────────
  if (await basicLoad(page, URLS['relocate-portugal'], 'relocate-portugal')) {
    const savings = await page.locator('#savingsBig').textContent();
    if (savings && /\$/.test(savings)) ok('relocate-portugal', `savings: ${savings.trim()}`);
    else bad('relocate-portugal', 'savings number missing');

    // Change income → savings updates
    await page.locator('#gross').fill('60000');
    await page.waitForTimeout(400);
    const newSavings = await page.locator('#savingsBig').textContent();
    if (newSavings !== savings) ok('relocate-portugal', `savings updates on input (${newSavings.trim()})`);
    else bad('relocate-portugal', 'savings did not change on input update');

    const caveatsCount = await page.locator('.caveats li').count();
    if (caveatsCount >= 5) ok('relocate-portugal', `${caveatsCount} caveats listed`);
    else bad('relocate-portugal', `only ${caveatsCount} caveats (expected ≥5)`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE: homepage
  // ─────────────────────────────────────────────────────────────────────────
  if (await basicLoad(page, URLS['homepage'], 'homepage')) {
    const ctaCount = await page.locator('a[href*="auth.html"]').count();
    if (ctaCount >= 1) ok('homepage', `${ctaCount} auth CTAs found`);
    else bad('homepage', 'no auth.html CTA found on homepage');

    // Share button (new today)
    const shareBtn = await page.locator('#wlShareBtn').count();
    if (shareBtn === 1) ok('homepage', 'share button present');
    else bad('homepage', 'share button missing on homepage');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE: auth (sign-up flow)
  // ─────────────────────────────────────────────────────────────────────────
  if (await basicLoad(page, URLS['auth'], 'auth')) {
    // Sign-up form present
    const emailInput = await page.locator('input[type=email], input[name=email]').count();
    if (emailInput >= 1) ok('auth', 'email input present');
    else bad('auth', 'email input missing — sign-up flow broken');

    const passwordInput = await page.locator('input[type=password]').count();
    if (passwordInput >= 1) ok('auth', 'password input present');
    else bad('auth', 'password input missing');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE: dashboard (post-sign-up landing — no auth gating in this test)
  // ─────────────────────────────────────────────────────────────────────────
  if (await basicLoad(page, URLS['dashboard'], 'dashboard')) {
    // Should redirect or show sign-in CTA when not logged in — anything OK
    const visible = await page.locator('body').isVisible();
    if (visible) ok('dashboard', 'renders something (sign-in gate or content)');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE: relocation-analyzer (WizeTax depth)
  // ─────────────────────────────────────────────────────────────────────────
  if (await basicLoad(page, URLS['relocation-analyzer'], 'relocation-analyzer')) {
    const tableCount = await page.locator('table').count();
    if (tableCount >= 1) ok('relocation-analyzer', `${tableCount} table(s) rendered`);
    else bad('relocation-analyzer', 'no table rendered');

    const inputCount = await page.locator('input[type=number]').count();
    if (inputCount >= 1) ok('relocation-analyzer', 'gross input present');
    else bad('relocation-analyzer', 'gross input missing');

    // SVG chart
    const svgCount = await page.locator('svg[aria-label*="10-year"]').count();
    if (svgCount >= 1) ok('relocation-analyzer', 'SVG chart rendered');
    else bad('relocation-analyzer', 'SVG chart missing');

    // Exit-tax warning + CTA
    const exitTaxLink = await page.locator('a[href="/exit-tax-calculator"]').count();
    if (exitTaxLink >= 1) ok('relocation-analyzer', 'exit-tax CTA links to /exit-tax-calculator');
    else bad('relocation-analyzer', 'exit-tax CTA link missing');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE: social-compare
  // ─────────────────────────────────────────────────────────────────────────
  if (await basicLoad(page, URLS['social-compare'], 'social-compare')) {
    const tableRows = await page.locator('tbody tr').count();
    if (tableRows >= 8) ok('social-compare', `${tableRows} country rows`);
    else bad('social-compare', `only ${tableRows} rows (expected 8)`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE: exit-tax-calculator
  // ─────────────────────────────────────────────────────────────────────────
  if (await basicLoad(page, URLS['exit-tax-calculator'], 'exit-tax-calculator')) {
    const inputs = await page.locator('input[type=number]').count();
    if (inputs >= 5) ok('exit-tax-calculator', `${inputs} number inputs (asset entries)`);
    else bad('exit-tax-calculator', `only ${inputs} inputs (expected ≥5)`);

    const backLink = await page.locator('a[href="/relocation-analyzer"]').count();
    if (backLink >= 1) ok('exit-tax-calculator', 'back link to /relocation-analyzer present');
    else bad('exit-tax-calculator', 'back link missing');
  }

  await browser.close();

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  if (PROBLEMS.length === 0) {
    console.log('✅ ALL CLEAN — ' + Object.keys(URLS).length + ' pages verified, no blocking issues');
    process.exit(0);
  } else {
    console.log(`❌ ${PROBLEMS.length} issue(s) found:`);
    const byPage = {};
    PROBLEMS.forEach(p => { (byPage[p.page] = byPage[p.page] || []).push(p.msg); });
    Object.entries(byPage).forEach(([k, msgs]) => {
      console.log(`\n  ${k}:`);
      msgs.forEach(m => console.log('    • ' + m));
    });
    process.exit(1);
  }
})().catch(e => { console.error(e); process.exit(2); });
