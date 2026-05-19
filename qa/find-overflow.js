const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  await page.goto('https://tax.wizelife.ai/relocation-analyzer?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // Find all stylesheets that mention 'overflow:hidden' on body or html
  const matches = await page.evaluate(() => {
    const found = [];
    // 1) inline style on body / html
    if (document.body.style.overflow) found.push('BODY inline: ' + document.body.style.overflow);
    if (document.documentElement.style.overflow) found.push('HTML inline: ' + document.documentElement.style.overflow);
    // 2) computed style
    found.push('BODY computed overflow: ' + getComputedStyle(document.body).overflow);
    found.push('HTML computed overflow: ' + getComputedStyle(document.documentElement).overflow);
    // 3) walk stylesheets for any rules
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules || []) {
          if (rule.cssText && /^(html|body|html\s*,\s*body|body\s*,\s*html)\s*\{[^}]*overflow\s*:\s*hidden/i.test(rule.cssText)) {
            found.push('SHEET RULE: ' + rule.cssText.slice(0,200) + ' [from: ' + (sheet.href||'inline') + ']');
          }
        }
      } catch (e) { /* cross-origin sheets blocked */ }
    }
    return found;
  });
  console.log(matches.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
