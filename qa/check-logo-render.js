const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  // Wait for deploy
  let live = false;
  for (let i = 0; i < 20; i++) {
    const r = await fetch('https://wizelife.ai/?cb=' + Date.now()).then(r => r.text());
    if (/wl-logo-icon\{[^}]*wizelife-logo-v2/.test(r)) { live = true; break; }
    await new Promise(r => setTimeout(r, 6000));
  }
  console.log(live ? '✓ logo CSS deployed' : '⚠ logo CSS not yet live — testing anyway');

  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  await page.goto('https://wizelife.ai/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const r = await page.locator('.wl-logo-icon').first().evaluate(el => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      bg: cs.backgroundImage,
      w: cs.width, h: cs.height,
      rectW: rect.width, rectH: rect.height,
      visible: rect.width > 0 && rect.height > 0,
    };
  });
  console.log('Nav .wl-logo-icon computed:');
  console.log('  background-image:', r.bg);
  console.log('  size (CSS):', r.w, '×', r.h);
  console.log('  size (rendered):', r.rectW, '×', r.rectH);
  console.log('  visible (has dimensions):', r.visible);

  // Verify SVG actually fetched
  const svgRes = await page.evaluate(async () => {
    const res = await fetch('/img/wizelife-logo-v2.svg', { cache: 'no-cache' });
    return { status: res.status, ok: res.ok };
  });
  console.log('SVG fetch:', svgRes);

  await browser.close();
  if (r.visible && /wizelife-logo-v2/.test(r.bg) && svgRes.ok) {
    console.log('\n✅ PASS — nav logo renders with new SVG');
    process.exit(0);
  } else {
    console.log('\n❌ FAIL');
    process.exit(1);
  }
})().catch(e => { console.error(e); process.exit(2); });
