/**
 * check-relocation-decision.js — QA for the WizeTax "Stay vs Sever" decision
 * module + numeric break-even on /relocation-analyzer. Checks: renders in all
 * 4 languages, both panels + break-even input present, break-even computes,
 * no uncaught JS errors, and no horizontal overflow on mobile.
 */
const { chromium } = require('playwright');
const URL = 'https://tax.wizelife.ai/relocation-analyzer';

const H2 = {
  he: 'להישאר מול לנתק',
  en: 'Stay vs Sever',
  pt: 'Ficar vs Romper',
  es: 'Quedarse vs Romper',
};

let fails = 0;
const ok = (m) => console.log('✅ ' + m);
const bad = (m) => { fails++; console.log('❌ ' + m); };

async function run(browser, lang, viewport, label) {
  const ctx = await browser.newContext({ viewport, locale: lang === 'he' ? 'he-IL' : lang });
  await ctx.addInitScript((l) => { try { localStorage.setItem('wl_lang', l); } catch (e) {} }, lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);

    // 1. Decision module heading in the right language
    const body = await page.locator('body').innerText();
    if (body.includes(H2[lang])) ok(`${label} [${lang}] — decision module renders in ${lang}`);
    else bad(`${label} [${lang}] — module heading "${H2[lang]}" NOT found (deploy lag or lang bug)`);

    // 2. Break-even input present + computes
    const beInput = page.locator('input[type=number]').nth(1); // 0=gross, 1=exitGains
    if (await beInput.count()) {
      await beInput.fill('2000000');
      await page.waitForTimeout(600);
      const after = await page.locator('body').innerText();
      // exit-tax line shows ₪500,000 (25% of 2M) regardless of language
      if (after.includes('500,000') || /₪50?0,?000/.test(after)) ok(`${label} [${lang}] — break-even computes exit tax`);
      else bad(`${label} [${lang}] — break-even did not show exit tax after input`);
    } else bad(`${label} [${lang}] — break-even input not found`);

    // 3. No uncaught JS errors
    if (errors.length === 0) ok(`${label} [${lang}] — no uncaught JS errors`);
    else bad(`${label} [${lang}] — JS errors: ${errors.slice(0, 2).join(' | ')}`);

    // 4. No horizontal overflow (mobile only)
    if (viewport.width <= 420) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow <= 3) ok(`${label} [${lang}] — no horizontal overflow (${overflow}px)`);
      else bad(`${label} [${lang}] — horizontal overflow ${overflow}px`);
    }
  } catch (e) {
    bad(`${label} [${lang}] — load/test error: ${e.message}`);
  } finally {
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  // All 4 languages on desktop
  for (const lang of ['he', 'en', 'pt', 'es']) await run(browser, lang, { width: 1280, height: 900 }, 'desktop');
  // Mobile (short) — Hebrew + English
  for (const lang of ['he', 'en']) await run(browser, lang, { width: 390, height: 740 }, 'mobile');
  await browser.close();
  console.log(fails === 0 ? '\n✅ relocation-decision QA: PASS' : `\n❌ relocation-decision QA: ${fails} failure(s)`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(2); });
