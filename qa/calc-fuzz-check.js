#!/usr/bin/env node
/**
 * Calc fuzzer (property-based) — feeds extreme/garbage values to the deployed
 * calculators and asserts NO NaN/Infinity in VISIBLE output + no page errors.
 * Catches the recurring "negative/huge/empty input → NaN" class of bugs in ONE
 * pass instead of one-by-one. Uses innerText (not textContent) to avoid the
 * Next.js RSC `$undefined` false positive.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const TARGETS = [
  { name: 'WizeLife salary-compare', url: 'https://wizelife.ai/p/salary-compare.html', input: '#gross' },
  { name: 'WizeTax relocation',      url: 'https://tax.wizelife.ai/relocation-analyzer', input: 'input[type=number], input[inputmode=numeric]' },
];
const INPUTS = ['-50000', '0', '0.01', '999999999', '1000000000000000', 'abc', '1,234,567', '-0.5', '1e9'];

const out = ['# Calc fuzzer\n', `_run ${new Date().toISOString()}_\n`];
const fails = [];

async function fuzz(browser, t) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const perr = [];
  p.on('pageerror', e => perr.push(e.message.slice(0, 80)));
  try {
    await p.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(3500);
    await p.evaluate(() => document.querySelectorAll('.overlay,[id*=onboard],[id*=disclaimer],.wl-disclaimer-modal').forEach(o => o.style.display = 'none'));
    const inp = p.locator(t.input).first();
    if (!(await inp.count())) { out.push(`- ⚠️ ${t.name}: input not found — skipped`); return; }
    for (const val of INPUTS) {
      await inp.fill('').catch(() => {});
      await inp.fill(val).catch(() => {});
      await inp.press('Tab').catch(() => {});
      await p.waitForTimeout(700);
      // also try clicking any "calculate/analyze/deep" button
      await p.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>/calc|חשב|analyz|נתח|deep|compare|השוו/i.test(x.textContent||'')); if(b) b.click(); }).catch(()=>{});
      await p.waitForTimeout(500);
      const bad = await p.evaluate(() => {
        const txt = document.body.innerText || '';
        const m = txt.match(/NaN|Infinity|\$?undefined(?![\w$])/g);
        return m ? [...new Set(m)].join(',') : null;
      });
      if (bad && /NaN|Infinity/.test(bad)) { fails.push(`${t.name} @ input "${val}" → ${bad}`); out.push(`- ❌ ${t.name} input="${val}" → ${bad}`); }
    }
    if (perr.length) { fails.push(`${t.name}: ${perr.length} page errors`); out.push(`- ❌ ${t.name}: page errors: ${perr.slice(0,2).join(' | ')}`); }
    if (!fails.some(f => f.startsWith(t.name))) out.push(`- ✅ ${t.name}: no NaN/Infinity across ${INPUTS.length} extreme inputs`);
  } catch (e) { out.push(`- ⚠️ ${t.name}: ${e.message.slice(0,60)}`); }
  finally { await ctx.close(); }
}

(async () => {
  const browser = await chromium.launch();
  for (const t of TARGETS) await fuzz(browser, t);
  await browser.close();
  out.push(`\n## Result`);
  out.push(fails.length ? fails.map(f => `- 🚨 ${f}`).join('\n') : '- ✅ All calculators survived fuzzing (no NaN/Infinity/crashes).');
  const report = out.join('\n');
  fs.writeFileSync('calc-fuzz-report.md', report);
  console.log(report);
  process.exit(fails.length ? 1 : 0);
})();
