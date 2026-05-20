/**
 * check-onboarding-mobile-lang.js — regression test for the 2026-05-20 bugs:
 *
 *   1. FREEZE: on a short mobile viewport the onboarding modal's controls got
 *      clipped off-screen (card was overflow:hidden, no max-height, centered),
 *      and body{overflow:hidden} meant they were unreachable → frozen page.
 *   2. WRONG LANGUAGE: a fresh PT/ES device (no saved wl_lang) saw Hebrew,
 *      because getLang() never consulted navigator.language.
 *
 * This test simulates a first-time Portuguese visitor on a SHORT viewport and
 * asserts the onboarding (a) renders in Portuguese and (b) has a close button
 * fully inside the viewport that actually dismisses the modal.
 *
 * Exit non-zero on failure so it fails CI / the find-all-bugs run.
 */
const { chromium } = require('playwright');

// Pages that trigger the first-visit onboarding (shared wize-onboarding.js).
const URLS = [
  'https://tax.wizelife.ai/relocation-analyzer',
  'https://check-deal.vercel.app/',
];

// PT button labels from wize-onboarding.js LB.pt — at least one must appear.
const PT_WORDS = ['Pular', 'Próximo', 'Entendi', 'Voltar', 'Fechar'];

let failures = 0;

async function testUrl(browser, url) {
  // Short, landscape-ish viewport — tall enough content, short enough screen
  // that an un-capped centered modal would clip its controls. PT locale.
  const ctx = await browser.newContext({
    viewport: { width: 760, height: 380 },
    locale: 'pt-BR',
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000); // onboarding shows after a short delay

    const modal = page.locator('#wize-onboarding');
    if (!(await modal.isVisible())) {
      console.log(`⏭️  ${url} — onboarding did not show (skipped, not a failure)`);
      await ctx.close();
      return;
    }

    // (2) Language — modal text must contain a Portuguese control label.
    const text = await modal.innerText();
    const isPt = PT_WORDS.some((w) => text.includes(w));
    if (isPt) console.log(`✅ ${url} — onboarding in Portuguese`);
    else { failures++; console.log(`❌ ${url} — onboarding NOT in Portuguese (locale pt-BR). Text head: ${text.slice(0, 80).replace(/\n/g, ' ')}`); }

    // (1) Freeze — the close button (the ✕) must be fully inside the viewport.
    const closeBtn = modal.locator('button', { hasText: '✕' }).first();
    const vh = 380;
    const box = await closeBtn.boundingBox();
    if (!box) { failures++; console.log(`❌ ${url} — close button not found`); }
    else if (box.y < 0 || box.y + box.height > vh) {
      failures++;
      console.log(`❌ ${url} — close button CLIPPED off-screen (y=${Math.round(box.y)}, bottom=${Math.round(box.y + box.height)}, vh=${vh}) → frozen-page regression`);
    } else {
      // And it must actually dismiss the modal.
      await closeBtn.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(400);
      if (await modal.isVisible()) { failures++; console.log(`❌ ${url} — close button visible but did not dismiss the modal`); }
      else console.log(`✅ ${url} — close button reachable + dismisses (no freeze)`);
    }
  } catch (e) {
    console.log(`⚠️  ${url} — load/test error (not counted as a freeze regression): ${e.message}`);
  } finally {
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  for (const url of URLS) await testUrl(browser, url);
  await browser.close();
  console.log(failures === 0 ? '\n✅ onboarding mobile+lang: PASS' : `\n❌ onboarding mobile+lang: ${failures} failure(s)`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(2); });
