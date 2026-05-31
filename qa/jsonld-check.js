#!/usr/bin/env node
/**
 * JSON-LD structured-data validity check (no creds).
 * Each app embeds schema.org JSON-LD for rich results. A stripped/missing const
 * (e.g. BREADCRUMB_PROFILE went undefined → build break) or malformed JSON
 * silently kills rich results. This asserts every <script type=application/ld+json>
 * parses AND has @context + @type.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const PAGES = [
  'https://wizelife.ai/',
  'https://money.wizelife.ai/',
  'https://tax.wizelife.ai/advisor',
  'https://tax.wizelife.ai/relocation-analyzer',
  'https://tax.wizelife.ai/social-compare',
  'https://deal.wizelife.ai/',
  'https://travel.wizelife.ai/',
];

const out = ['# JSON-LD validity\n', `_run ${new Date().toISOString()}_\n`];
const fails = [];

(async () => {
  const browser = await chromium.launch();
  for (const url of PAGES) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await p.waitForTimeout(1500);
      const r = await p.evaluate(() => {
        const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
        const res = { count: blocks.length, bad: [] };
        blocks.forEach((b, i) => {
          try {
            const j = JSON.parse(b.textContent || '');
            const items = Array.isArray(j) ? j : [j];
            for (const it of items) {
              if (!it['@context'] || !it['@type']) res.bad.push(`#${i} missing @context/@type`);
            }
          } catch (e) { res.bad.push(`#${i} invalid JSON: ${String(e.message).slice(0,40)}`); }
        });
        return res;
      });
      if (r.count === 0) { out.push(`- ⚠️ ${url}: no JSON-LD`); }
      else if (r.bad.length) { fails.push(`${url}: ${r.bad.join('; ')}`); out.push(`- ❌ ${url}: ${r.bad.join('; ')}`); }
      else { out.push(`- ✅ ${url}: ${r.count} valid JSON-LD block(s)`); }
    } catch (e) { out.push(`- ⚠️ ${url}: ${e.message.slice(0,50)}`); }
    finally { await ctx.close(); }
  }
  await browser.close();
  out.push(`\n## Result`);
  out.push(fails.length ? fails.map(f => `- 🚨 ${f}`).join('\n') : '- ✅ All JSON-LD valid (parses + @context/@type).');
  fs.writeFileSync('jsonld-report.md', out.join('\n'));
  console.log(out.join('\n'));
  process.exit(fails.length ? 1 : 0);
})();
