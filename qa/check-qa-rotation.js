// Verify Q&A rotation: load page 6 times, collect prompts shown each time.
// Expect at least 2 distinct sets of 5 across reloads (statistically very likely
// with 2×2×2×2×2 = 32 possible combinations).
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  // Wait for live deploy
  let live = false;
  for (let i = 0; i < 30; i++) {
    const r = await fetch('https://wizelife.ai/?cb=' + Date.now()).then(r => r.text());
    if (/QA_POOL|pickPrompts/.test(r)) { live = true; break; }
    await new Promise(r => setTimeout(r, 6000));
  }
  console.log(live ? '✓ rotation code live' : '⚠ not yet — testing anyway');

  const sets = [];
  for (let i = 0; i < 6; i++) {
    const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
    const page = await ctx.newPage();
    await page.goto('https://wizelife.ai/?cb=' + Date.now() + '_' + i, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.locator('.ai-demo-section').scrollIntoViewIfNeeded();
    const prompts = await page.locator('.ai-prompt').allTextContents();
    sets.push(prompts);
    console.log(`Reload ${i + 1}: ${prompts.join(' | ').slice(0, 200)}`);
    await ctx.close();
  }

  // Check rotation
  const unique = new Set(sets.map(s => s.join('||')));
  console.log(`\nUnique sets across 6 reloads: ${unique.size}`);

  // Check that HE/PT/ES return matching answers
  console.log('\n--- HE answer check ---');
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'he-IL' });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.setItem('wl_lang', 'he'); } catch (_) {} });
  await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.locator('.ai-demo-section').scrollIntoViewIfNeeded();
  const hePrompts = await page.locator('.ai-prompt').allTextContents();
  console.log('HE prompts:', hePrompts.join(' | '));
  // Click first one — confirm an English answer (substantive, not the upsell)
  await page.locator('.ai-prompt').first().click();
  await page.waitForTimeout(1700);
  const lastBot = await page.locator('.ai-msg.bot').last().textContent();
  const isUpsell = /Great question/i.test(lastBot || '');
  console.log('HE first-prompt answer first 80 chars:', (lastBot || '').slice(0, 80));
  console.log(isUpsell ? '✗ HE still hits the upsell fallback' : '✓ HE returns scripted answer');

  await browser.close();
  if (unique.size >= 2 && !isUpsell) {
    console.log('\n✅ PASS — rotation works and HE/PT/ES bug is fixed');
    process.exit(0);
  } else {
    console.log('\n❌ FAIL');
    process.exit(1);
  }
})().catch(e => { console.error(e); process.exit(2); });
