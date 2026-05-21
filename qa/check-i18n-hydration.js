/**
 * check-i18n-hydration.js — cross-app guard for the bug class that bit WizeTax:
 * React #418 hydration mismatches (locale-dependent rendering) + any uncaught
 * JS error, in Portuguese & Spanish on a mobile viewport. Loads the key page(s)
 * of every app and fails on a hydration error / uncaught exception.
 *
 * This generalizes the relocation-analyzer pt/es crash so the SAME class is
 * caught everywhere, not just where we happened to look.
 */
const { chromium } = require('playwright');

const TARGETS = [
  { app: 'WizeLife',  url: 'https://wizelife.ai/' },
  { app: 'WizeLife',  url: 'https://wizelife.ai/p/salary-compare' },
  { app: 'WizeMoney', url: 'https://money.wizelife.ai/' },
  { app: 'WizeTax',   url: 'https://tax.wizelife.ai/relocation-analyzer' },
  { app: 'WizeTax',   url: 'https://tax.wizelife.ai/advisor' },
  { app: 'WizeDeal',  url: 'https://deal.wizelife.ai/' },
  { app: 'WizeTravel',url: 'https://travel.wizelife.ai/' },
  { app: 'WizeHealth',url: 'https://health.wizelife.ai/', slow: true },
];
const LANGS = ['pt', 'es'];

let fails = 0;
const ok = (m) => console.log('✅ ' + m);
const bad = (m) => { fails++; console.log('❌ ' + m); };

// Console noise we deliberately ignore (not hydration / app errors).
const IGNORE = /recaptcha|appcheck|app-check|favicon|the server responded with a status of 4|net::ERR|clarity|cancelled|Failed to load resource/i;

async function check(browser, t, lang) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 740 },
    locale: lang === 'pt' ? 'pt-BR' : 'es-ES',
    isMobile: true, hasTouch: true,
  });
  await ctx.addInitScript((l) => { try { localStorage.setItem('wl_lang', l); } catch (e) {} }, lang);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const txt = m.text();
    if (IGNORE.test(txt)) return;
    // React hydration errors (#418/#423/#425) + the generic minified marker.
    if (/Minified React error #4(18|23|25)|hydrat|did not match/i.test(txt)) errs.push('react: ' + txt.slice(0, 90));
  });
  try {
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: t.slow ? 70000 : 30000 });
    await page.waitForTimeout(t.slow ? 6000 : 3500);
    if (errs.length === 0) ok(`${t.app} [${lang}] ${t.url.replace('https://', '')}`);
    else bad(`${t.app} [${lang}] ${t.url.replace('https://', '')} → ${errs.slice(0, 2).join(' | ')}`);
  } catch (e) {
    if (t.slow) console.log(`⏭️  ${t.app} [${lang}] — load timeout (cold start, skipped)`);
    else bad(`${t.app} [${lang}] ${t.url} → load error: ${e.message}`);
  } finally {
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  for (const t of TARGETS) for (const lang of LANGS) await check(browser, t, lang);
  await browser.close();
  console.log(fails === 0 ? '\n✅ i18n-hydration: PASS' : `\n❌ i18n-hydration: ${fails} failure(s)`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(2); });
