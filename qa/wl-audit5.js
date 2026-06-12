// pass 5: webkit auth fields visible + invalid access code final message (long wait)
const { chromium, webkit } = require('playwright');
const R = (n, ok, info = '') => console.log(`${ok ? 'PASS' : 'FAIL'} | ${n}${info ? ' | ' + info : ''}`);
(async () => {
  // webkit auth fields
  const wb = await webkit.launch();
  const wctx = await wb.newContext({ viewport: { width: 1280, height: 900 } });
  const wp = await wctx.newPage();
  await wp.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 60000 });
  await wp.waitForTimeout(5000);
  const emailVis = await wp.locator('#loginEmail').isVisible().catch(() => false);
  const btnVis = await wp.locator('#loginBtn').isVisible().catch(() => false);
  const googleVis = await wp.locator('text=/Google/i').first().isVisible().catch(() => false);
  R('webkit auth: email+signin+google visible', emailVis && btnVis && googleVis, `email=${emailVis} btn=${btnVis} google=${googleVis}`);
  await wb.close();

  // invalid access code — wait up to 20s for final message
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(5000); await page.waitForLoadState('load').catch(()=>{}); await page.waitForTimeout(2000);
  await page.fill('#loginEmail', process.env.QA_EMAIL_PRO);
  await page.fill('#loginPassword', process.env.QA_PASSWORD_PRO);
  await page.click('#loginBtn');
  await page.waitForURL('**/dashboard.html**', { timeout: 30000 });
  await page.waitForTimeout(6000);
  await page.fill('#accessCodeInput', 'NOT-A-REAL-CODE-123');
  await page.click('#accessCodeBtn');
  let finalMsg = '';
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(2500);
    finalMsg = await page.evaluate(() => (document.getElementById('codeMsg') || {}).innerText || '');
    if (finalMsg && !/Checking|בודק|Verificando|Comprobando/i.test(finalMsg)) break;
  }
  R('invalid code → final user-facing error', finalMsg.length > 2 && !/Checking|בודק/i.test(finalMsg), JSON.stringify(finalMsg.slice(0, 140)));
  await browser.close();
})();
