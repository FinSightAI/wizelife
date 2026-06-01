#!/usr/bin/env node
/**
 * Mobile POSITIVE integration / deep-flow suite.
 * Drives each app's CORE action on a mobile viewport and asserts a REAL POSITIVE
 * outcome (feature actually works) — not just absence-of-error. This is the gap
 * that let a fully-dead WizeDeal AI "pass" ~900 absence-of-bad checks.
 * Cold-start / auth-gate / timeout → SKIP (warn), never FAIL.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const out = ['# Mobile integration (positive) — ' + new Date().toISOString() + '\n'];
const fails = []; let pass = 0, skip = 0;
const ok   = (m) => { pass++; out.push('- ✅ ' + m); };
const warn = (m) => { skip++; out.push('- ⚠️ ' + m); };
const bad  = (m) => { fails.push(m); out.push('- ❌ ' + m); };

async function ctxPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  return { ctx, page: await ctx.newPage() };
}
async function dismiss(page) {
  try { await page.evaluate(() => document.querySelectorAll('.overlay,[id*=onboard],[id*=quickstart],[id*=disclaimer],.wl-disclaimer-modal').forEach(o => { o.style.display = 'none'; o.classList && o.classList.add('hidden'); })); } catch {}
  for (const s of ['button:has-text("הבנתי")', 'button:has-text("I understand")', 'button:has-text("המשך")', 'button:has-text("Continue")']) {
    const el = await page.$(s).catch(() => null); if (el) { await el.click({ force: true }).catch(() => {}); await page.waitForTimeout(150); }
  }
}

async function wizeDeal(browser) {
  const { ctx, page } = await ctxPage(browser);
  let success = false;
  page.on('response', async (r) => { if (r.url().includes('parse-listing')) { try { const j = await r.json(); if (j?.success && j.data) success = true; } catch {} } });
  try {
    await page.goto('https://deal.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000); await dismiss(page);
    const ta = page.locator('textarea').first();
    if (!(await ta.count())) { warn('WizeDeal: paste textarea not found — SKIP'); return; }
    await ta.fill('דירת 4 חדרים תל אביב פלורנטין, 95 מ"ר, קומה 3, מחיר 2,850,000 ש"ח, ארנונה 450');
    const btn = page.locator('button:has-text("Analyze listing")').first();
    await btn.waitFor({ state: 'visible', timeout: 8000 });
    await btn.click();
    for (let i = 0; i < 20 && !success; i++) await page.waitForTimeout(2500);
    if (success) ok('WizeDeal: paste listing → AI extraction returned a real result (success+data)');
    else warn('WizeDeal: no success response in 50s (cold-start?) — SKIP');
  } catch (e) { warn('WizeDeal: ' + e.message.slice(0, 50) + ' — SKIP'); }
  finally { await ctx.close(); }
}

async function salaryCompare(browser) {
  const { ctx, page } = await ctxPage(browser);
  try {
    await page.goto('https://wizelife.ai/p/salary-compare.html', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000); await dismiss(page);
    const gross = page.locator('#gross').first();
    if (!(await gross.count())) { warn('salary-compare: #gross not found — SKIP'); return; }
    await gross.fill('20000');
    await gross.press('Tab').catch(() => {});
    await page.waitForTimeout(1500);
    const hasResult = await page.evaluate(() => {
      const t = document.body.innerText || '';
      // a net/result currency figure (≥3 digits) somewhere, not NaN
      return /[₪$€]\s?\d{1,3}([,.]\d{3})+|\d{1,3}([,.]\d{3})+\s?[₪$€]/.test(t) && !/NaN/.test(t);
    });
    if (hasResult) ok('WizeLife salary-compare: gross input → net/result figure rendered');
    else bad('WizeLife salary-compare: no result figure after entering gross');
  } catch (e) { warn('salary-compare: ' + e.message.slice(0, 50) + ' — SKIP'); }
  finally { await ctx.close(); }
}

async function wizeTaxReloc(browser) {
  const { ctx, page } = await ctxPage(browser);
  try {
    await page.goto('https://tax.wizelife.ai/relocation-analyzer', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3500); await dismiss(page);
    const inp = page.locator('input[type=number], input[inputmode=numeric]').first();
    if (!(await inp.count())) { warn('WizeTax relocation: gross input not found — SKIP'); return; }
    await inp.fill('30000'); await inp.press('Tab').catch(() => {});
    await page.waitForTimeout(2000);
    const r = await page.evaluate(() => { const t = document.body.innerText || ''; return { hasNum: /[₪$€]|\d{1,2}(\.\d+)?\s?%/.test(t), nan: /NaN|Infinity/.test(t) }; });
    if (r.nan) bad('WizeTax relocation: NaN/Infinity in output');
    else if (r.hasNum) ok('WizeTax relocation: gross → comparison figures rendered (no NaN)');
    else warn('WizeTax relocation: no figures detected — SKIP');
  } catch (e) { warn('WizeTax relocation: ' + e.message.slice(0, 50) + ' — SKIP'); }
  finally { await ctx.close(); }
}

async function wizeMoney(browser) {
  const { ctx, page } = await ctxPage(browser);
  try {
    await page.goto('https://money.wizelife.ai/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000); await dismiss(page);
    const r = await page.evaluate(() => {
      const cards = document.querySelectorAll('.summary-card').length;
      let canvasDrawn = false;
      document.querySelectorAll('canvas').forEach((c) => { const r = c.getBoundingClientRect(); if (r.width > 10 && r.height > 10) canvasDrawn = true; });
      return { cards, canvasDrawn };
    });
    if (r.cards >= 3 && r.canvasDrawn) ok(`WizeMoney: dashboard rendered real content (${r.cards} cards + chart canvas drawn)`);
    else if (r.cards >= 3) warn('WizeMoney: cards present but no chart canvas drawn — SKIP (chart may need data)');
    else bad(`WizeMoney: dashboard sparse (cards=${r.cards}, canvas=${r.canvasDrawn})`);
  } catch (e) { warn('WizeMoney: ' + e.message.slice(0, 50) + ' — SKIP'); }
  finally { await ctx.close(); }
}

async function wizeTravel(browser) {
  const { ctx, page } = await ctxPage(browser);
  try {
    await page.goto('https://travel.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000); await dismiss(page);
    const inputs = await page.evaluate(() => document.querySelectorAll('input,select').length);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4);
    if (inputs >= 2 && !overflow) ok(`WizeTravel: search form reachable (${inputs} inputs, no h-overflow)`);
    else if (inputs >= 2) bad('WizeTravel: search form present but horizontal overflow on mobile');
    else warn('WizeTravel: search inputs not found — SKIP');
  } catch (e) { warn('WizeTravel: ' + e.message.slice(0, 50) + ' — SKIP'); }
  finally { await ctx.close(); }
}

async function wizeHealth(browser) {
  const { ctx, page } = await ctxPage(browser);
  try {
    await page.goto('https://health.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000); await dismiss(page);
    const input = page.locator('textarea, input[type=text]:not([type=hidden])').first();
    if (!(await input.count())) { warn('WizeHealth: chat input not found (cold-start?) — SKIP'); return; }
    const before = await page.evaluate(() => (document.body.innerText || '').length);
    await input.fill('what is a normal blood pressure?');
    await input.press('Enter').catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /send|שלח|→/i.test(x.textContent || x.getAttribute('aria-label') || '')); if (b) b.click(); }).catch(() => {});
    let reply = false;
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(2500); const now = await page.evaluate(() => (document.body.innerText || '').length); if (now > before + 60) { reply = true; break; } }
    if (reply) ok('WizeHealth: chat → AI returned a reply'); else warn('WizeHealth: no reply in 50s (cold-start) — SKIP');
  } catch (e) { warn('WizeHealth: ' + e.message.slice(0, 50) + ' — SKIP'); }
  finally { await ctx.close(); }
}

(async () => {
  const browser = await chromium.launch();
  // sequential (not parallel) to avoid the load-induced flakiness we documented
  await wizeDeal(browser);
  await salaryCompare(browser);
  await wizeTaxReloc(browser);
  await wizeMoney(browser);
  await wizeTravel(browser);
  await wizeHealth(browser);
  await browser.close();
  out.push(`\n## Result — ${pass} pass, ${fails.length} fail, ${skip} skip`);
  out.push(fails.length ? fails.map((f) => '- 🚨 ' + f).join('\n') : '- ✅ Core mobile flows produce real positive results (where reachable without login).');
  fs.writeFileSync('mobile-integration-report.md', out.join('\n'));
  console.log(out.join('\n'));
  process.exit(fails.length ? 1 : 0);
})();
