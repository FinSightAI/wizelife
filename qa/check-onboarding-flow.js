const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE: ' + m.text().slice(0,150)); });

  await page.goto('https://tax.wizelife.ai/relocation-analyzer', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Onboarding visible:', await page.locator('#wize-onboarding').isVisible());

  // Click "הבא" repeatedly — see if modal eventually closes
  for (let i = 1; i <= 8; i++) {
    const nextBtn = page.locator('#wize-onboarding button:has-text("הבא"), #wize-onboarding button:has-text("Next"), #wize-onboarding button:has-text("סיום"), #wize-onboarding button:has-text("Finish"), #wize-onboarding button:has-text("הבנתי"), #wize-onboarding button:has-text("Got it")').first();
    const cnt = await nextBtn.count();
    if (cnt === 0) { console.log(`Step ${i}: no Next button found`); break; }
    const txt = await nextBtn.textContent();
    console.log(`Step ${i}: clicking "${txt.trim()}"`);
    try {
      await nextBtn.click({ timeout: 3000 });
      await page.waitForTimeout(400);
    } catch (e) {
      console.log(`  click failed: ${e.message.slice(0,80)}`);
      break;
    }
    const stillVis = await page.locator('#wize-onboarding').isVisible();
    console.log(`  modal visible after: ${stillVis}`);
    if (!stillVis) { console.log('  ✓ modal closed'); break; }
  }

  // Try ✕ button if still visible
  if (await page.locator('#wize-onboarding').isVisible()) {
    console.log('--- Modal still visible. Trying ✕ ---');
    const x = page.locator('#wize-onboarding button:has-text("✕"), #wize-onboarding button[aria-label*="סגור" i], #wize-onboarding button[aria-label*="close" i]').first();
    if (await x.count() > 0) {
      await x.click({ force: true });
      await page.waitForTimeout(400);
      console.log('After ✕:', await page.locator('#wize-onboarding').isVisible());
    }
  }

  // Try Escape
  if (await page.locator('#wize-onboarding').isVisible()) {
    console.log('--- Still visible. Trying Esc ---');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    console.log('After Esc:', await page.locator('#wize-onboarding').isVisible());
  }

  // Try clicking backdrop
  if (await page.locator('#wize-onboarding').isVisible()) {
    console.log('--- Still visible. Trying backdrop click ---');
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(400);
    console.log('After backdrop:', await page.locator('#wize-onboarding').isVisible());
  }

  console.log('---ERRORS---');
  errs.slice(0,5).forEach(e => console.log(e));
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
