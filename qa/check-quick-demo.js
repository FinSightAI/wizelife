// Verify Quick Demo on landing — new logo, 5 prompts work, YOLO CTA visible,
// no free-text input row, no JS errors.
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  // Poll until new content is live (max ~3 min)
  let live = false;
  for (let i = 0; i < 30; i++) {
    const r = await fetch('https://wizelife.ai/?cb=' + Date.now()).then(r => r.text());
    if (/ai-yolo-cta/.test(r) && /wizelife-logo-v2/.test(r)) { live = true; break; }
    await new Promise(r => setTimeout(r, 6000));
  }
  console.log(live ? '✓ deploy live' : '✗ deploy not live yet — testing anyway');

  await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Scroll AI demo into view
  await page.locator('.ai-demo-section').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const checks = [];
  const ok = (label, cond, extra = '') => { checks.push({ label, ok: cond, extra }); console.log(`${cond ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };

  // 1. New logo image is loaded
  const img = page.locator('.ai-avatar img');
  ok('new logo <img> exists', await img.count() === 1);
  if (await img.count() === 1) {
    const src = await img.getAttribute('src');
    ok('logo src is /img/wizelife-logo-v2.svg', src === '/img/wizelife-logo-v2.svg', src);
    const box = await img.boundingBox();
    ok('logo visible & sized', box && box.width >= 32 && box.height >= 32, box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'no box');
  }

  // 2. Quick demo eyebrow shows
  const eye = await page.locator('.ai-demo-section .sec-eyebrow').textContent();
  ok('eyebrow mentions "demo" or equivalent', /demo|דמו/i.test(eye || ''), (eye || '').slice(0, 60));

  // 3. Exactly 5 prompt buttons
  const prompts = page.locator('.ai-prompt');
  const np = await prompts.count();
  ok('exactly 5 prompts rendered', np === 5, `count=${np}`);

  // 4. NO free-text input box
  const input = page.locator('#aiInput');
  ok('free-text input is gone', await input.count() === 0);

  // 5. YOLO CTA visible with link
  const cta = page.locator('.ai-yolo-cta a');
  ok('YOLO CTA button present', await cta.count() === 1);
  if (await cta.count() === 1) {
    const href = await cta.getAttribute('href');
    ok('CTA href points to auth → upgrade', /auth\.html.*upgrade/i.test(href || ''), href);
  }

  // 6. Click a prompt → scripted answer appears, no JS error
  const portugalBtn = prompts.filter({ hasText: /portugal/i }).first();
  if (await portugalBtn.count() === 1) {
    await portugalBtn.click();
    await page.waitForTimeout(1800);
    const lastBot = await page.locator('.ai-msg.bot').last().textContent();
    ok('scripted answer for Portugal appears', /NHR|פורטוגל|residente/i.test(lastBot || ''), (lastBot || '').slice(0, 80));
  } else {
    ok('found Portugal prompt', false);
  }

  // 7. Switch language to HE → prompts re-render in Hebrew, still 5
  await page.evaluate(() => { try { localStorage.setItem('wl_lang', 'he'); } catch (_) {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.locator('.ai-demo-section').scrollIntoViewIfNeeded();
  const hePrompts = await page.locator('.ai-prompt').allTextContents();
  ok('HE: 5 prompts again after lang switch', hePrompts.length === 5, hePrompts.join(' / '));
  ok('HE: first prompt is in Hebrew', /[א-ת]/.test(hePrompts[0] || ''), hePrompts[0]);

  // 8. JS errors
  ok('no JS pageerrors/console errors', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  const failed = checks.filter(c => !c.ok);
  console.log(`\nPASS ${checks.length - failed.length}/${checks.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
