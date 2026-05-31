#!/usr/bin/env node
/**
 * AI-health (POSITIVE) check — asserts the AI actually RETURNS A CORRECT RESULT.
 *
 * Why this exists: ~900 existing checks missed that ALL WizeDeal AI was dead
 * (500 "API key not valid", env var name mismatch). They missed it because:
 *   (a) AI routes are auth-gated → logged-out bots got 401, never reached Gemini;
 *   (b) the few AI assertions checked ABSENCE-of-bad ("no invented price", "no NaN")
 *       which a dead/error response trivially passes.
 * This check asserts PRESENCE-of-good: a known listing → success + correct fields.
 */
const https = require('https');

function postJSON(url, body, headers = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request({ hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'Origin': 'https://' + u.hostname, ...headers } },
      (res) => { let b = ''; res.on('data', (c) => b += c); res.on('end', () => resolve({ status: res.statusCode, body: b })); });
    req.on('error', () => resolve({ status: 0, body: '' }));
    req.setTimeout(60000, () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
    req.write(data); req.end();
  });
}

const out = ['# AI-health (positive) — ' + new Date().toISOString() + '\n'];
const fails = [];
const pass = (m) => out.push('- ✅ ' + m);
const fail = (m) => { fails.push(m); out.push('- ❌ ' + m); };

(async () => {
  // WizeDeal parse-listing — anonymous, known IL listing → must extract real fields.
  const listing = 'דירת 4 חדרים למכירה בתל אביב, שכונת פלורנטין, 95 מ"ר, קומה 3, מחיר 2,850,000 ש"ח, ארנונה 450 ש"ח לחודש, חניה ומחסן';
  const r = await postJSON('https://deal.wizelife.ai/api/ai/parse-listing', { text: listing });
  if (r.status !== 200) { fail(`WizeDeal parse-listing returned HTTP ${r.status} (expected 200) — body: ${r.body.slice(0,120)}`); }
  else {
    let j; try { j = JSON.parse(r.body); } catch { j = null; }
    if (!j || !j.success || !j.data) fail(`WizeDeal parse-listing: no success/data — ${r.body.slice(0,150)}`);
    else {
      const d = j.data;
      if (d.city && /tel.?aviv|תל.?אביב/i.test(d.city)) pass(`parse-listing extracted city=${d.city}`); else fail(`parse-listing city wrong/missing: ${JSON.stringify(d.city)}`);
      if (d.askingPrice && d.askingPrice >= 2_000_000 && d.askingPrice <= 4_000_000) pass(`parse-listing price=${d.askingPrice}`); else fail(`parse-listing price wrong/missing: ${JSON.stringify(d.askingPrice)} (expected ~2.85M)`);
      if (d.rooms === 4) pass(`parse-listing rooms=4`); else fail(`parse-listing rooms wrong: ${JSON.stringify(d.rooms)} (expected 4)`);
      if (d.country === 'IL') pass(`parse-listing country=IL`); else fail(`parse-listing country wrong: ${JSON.stringify(d.country)}`);
    }
  }
  out.push('\n## Result');
  out.push(fails.length ? fails.map(f => '- 🚨 ' + f).join('\n') : '- ✅ AI returns correct results (the engine is alive, not just "not erroring").');
  require('fs').writeFileSync('ai-health-report.md', out.join('\n'));
  console.log(out.join('\n'));
  process.exit(fails.length ? 1 : 0);
})();
