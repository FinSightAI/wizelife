const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Scroll the AI demo section into view
  const sec = page.locator('.ai-demo-section');
  if (await sec.count() === 0) { console.log('NO ai-demo-section'); return; }
  await sec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Count visible prompts
  const prompts = page.locator('.ai-prompt');
  const n = await prompts.count();
  console.log(`Prompts visible: ${n}`);
  for (let i = 0; i < n; i++) console.log('  •', (await prompts.nth(i).textContent()).trim());

  // Click "Should I relocate to Portugal?"
  console.log('\nClicking Portugal suggestion…');
  await prompts.filter({ hasText: 'Portugal' }).first().click();
  await page.waitForTimeout(2000);

  // Read the bot reply
  const botMsgs = page.locator('.ai-msg.bot');
  const last = await botMsgs.last().textContent();
  console.log('\nLast bot message:');
  console.log('  ' + (last || '').slice(0, 200));

  // Type a question that does NOT match scripted keys
  console.log('\nTyping unscripted question…');
  await page.locator('#aiInput').fill('How many calories does a banana have?');
  await page.locator('#aiSend').click();
  await page.waitForTimeout(2500);
  const last2 = await botMsgs.last().textContent();
  console.log('Reply to off-script question:');
  console.log('  ' + (last2 || '').slice(0, 250));

  console.log('\nJS errors:', errs.length);
  errs.forEach(e => console.log('  ✗', e));

  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
