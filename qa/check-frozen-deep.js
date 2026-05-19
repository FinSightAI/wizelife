const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  // Real iPhone profile, no SW block — see what user sees
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  const errs = [];
  const reqs = [];
  page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  page.on('console', m => {
    const t = m.type();
    if (t === 'error' || t === 'warning') errs.push(t.toUpperCase() + ': ' + m.text().slice(0, 200));
  });
  page.on('requestfailed', r => errs.push('REQFAIL: ' + r.url().slice(0,80) + ' — ' + (r.failure()?.errorText||'')));

  console.log('--- 1st visit (cold) ---');
  await page.goto('https://tax.wizelife.ai/relocation-analyzer', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  console.log('Rows:', await page.locator('tbody tr').count());

  // Look for onboarding modal + try to close it
  const obs = await page.locator('#wize-onboarding').count();
  console.log('Onboarding count:', obs);
  if (obs > 0) {
    const visible = await page.locator('#wize-onboarding').isVisible();
    console.log('Onboarding visible:', visible);
    if (visible) {
      // List all clickable elements in onboarding
      const buttons = await page.locator('#wize-onboarding button').all();
      console.log('Buttons in onboarding:', buttons.length);
      for (const b of buttons) {
        const txt = (await b.textContent()).slice(0, 30);
        const al = await b.getAttribute('aria-label');
        console.log('  -', JSON.stringify(txt), 'aria:', al);
      }

      // Try each known close pattern
      const closeAttempts = [
        '#wize-onboarding button:has-text("Skip")',
        '#wize-onboarding button:has-text("דלג")',
        '#wize-onboarding button[aria-label*="close" i]',
        '#wize-onboarding button:has-text("×")',
        '#wize-onboarding button:has-text("✕")',
        '#wize-onboarding [data-close]',
      ];
      for (const sel of closeAttempts) {
        const c = await page.locator(sel).count();
        if (c > 0) console.log('FOUND closer:', sel, '×', c);
      }

      // Try clicking the rightmost / last button (usually "Got it" / "Finish")
      if (buttons.length > 0) {
        try {
          await buttons[buttons.length-1].click({ timeout: 3000 });
          await page.waitForTimeout(500);
          const stillVisible = await page.locator('#wize-onboarding').isVisible();
          console.log('After clicking last button — modal visible:', stillVisible);
        } catch (e) {
          console.log('Last button click FAILED:', e.message.slice(0,100));
        }
      }
    }
  }

  // Now try to interact with the actual page
  const grossInput = page.locator('input[type=number]').first();
  console.log('---After modal handled---');
  console.log('Gross input count:', await grossInput.count());
  if (await grossInput.count() > 0) {
    try {
      await grossInput.fill('35000', { timeout: 3000 });
      console.log('Gross input fill: OK');
      await page.waitForTimeout(700);
      console.log('Rows after fill:', await page.locator('tbody tr').count());
    } catch (e) {
      console.log('Gross input fill FAIL:', e.message.slice(0,100));
    }
  }

  console.log('---ERRORS---');
  errs.slice(0, 15).forEach(e => console.log(e));
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
