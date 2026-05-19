#!/usr/bin/env node
/**
 * tax-data-watcher.js — Weekly watcher for PwC personal-income-tax summaries.
 *
 * For each of the 13 main destination countries (IL, PT, CY, IT, ES, AE, US,
 * DE, GB, GR, MT, GE, BR) we:
 *   1. Fetch the PwC "Taxes on personal income" page.
 *   2. Extract the "Last reviewed" date (PwC stamps every page).
 *   3. Extract bracket-like rows from any HTML <table> on the page —
 *      a rough heuristic: cells that look like a threshold + a % rate.
 *   4. Compare against our local `js/tax-data.js`:
 *       - flag countries where PwC's last-reviewed > our lastVerified
 *       - flag obvious bracket deltas (top-rate or threshold-of-top-band)
 *
 * Writes /tmp/tax-data-watcher-report.md.  Reports only — never mutates files.
 * Cron-friendly: prints a short summary to stdout and exits 0 on success.
 *
 * No external deps (Node built-ins only).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const REPORT_PATH = '/tmp/tax-data-watcher-report.md';
const TAX_DATA_PATH = path.resolve(__dirname, '..', 'js', 'tax-data.js');

// 13 main destination countries → PwC slug.
const COUNTRIES = [
  { code: 'IL', slug: 'israel' },
  { code: 'PT', slug: 'portugal' },
  { code: 'CY', slug: 'cyprus' },
  { code: 'IT', slug: 'italy' },
  { code: 'ES', slug: 'spain' },
  { code: 'AE', slug: 'united-arab-emirates' },
  { code: 'US', slug: 'united-states' },
  { code: 'DE', slug: 'germany' },
  { code: 'GB', slug: 'united-kingdom' },
  { code: 'GR', slug: 'greece' },
  { code: 'MT', slug: 'malta' },
  { code: 'GE', slug: 'georgia' },
  { code: 'BR', slug: 'brazil' },
];

const HTTP_TIMEOUT_MS = 20_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; WizeLifeTaxWatcher/1.0)';

/* ──────────────────────────── helpers ─────────────────────────────────── */

function httpGet(url) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // follow one redirect
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          httpGet(next).then(resolve);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          resolve({ ok: false, status: res.statusCode, body: '' });
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ ok: true, status: 200, body: data }));
      },
    );
    req.setTimeout(HTTP_TIMEOUT_MS, () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', (err) => resolve({ ok: false, status: 0, body: '', error: err.message }));
  });
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// Parse PwC "Last reviewed - DD Month YYYY" — pattern is consistent across pages.
function extractLastReviewed(html) {
  const re = /Last\s+reviewed\s*[-–:]?\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i;
  const m = html.match(re);
  if (!m) return null;
  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };
  const day = parseInt(m[1], 10);
  const mon = months[m[2].toLowerCase()];
  const year = parseInt(m[3], 10);
  if (!mon) return null;
  return {
    raw: `${m[1]} ${m[2]} ${m[3]}`,
    year,
    month: mon,
    day,
    iso: `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

// Pull <table>...</table> blocks; then extract rows of (label, %).
function extractBracketRows(html) {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  const rows = [];
  for (const t of tables) {
    const trs = t.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    for (const tr of trs) {
      const cells = (tr.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []).map(stripTags);
      if (cells.length < 2) continue;
      // Find first cell that looks like a numeric threshold and one with a percent.
      const pctIdx = cells.findIndex((c) => /(\d{1,2}(?:\.\d+)?)\s*%/.test(c));
      if (pctIdx === -1) continue;
      const pctMatch = cells[pctIdx].match(/(\d{1,2}(?:\.\d+)?)\s*%/);
      const rate = parseFloat(pctMatch[1]);
      // threshold = any other cell with a number > 100
      let threshold = null;
      for (let i = 0; i < cells.length; i++) {
        if (i === pctIdx) continue;
        const numMatch = cells[i].match(/([\d.,]{3,})/);
        if (!numMatch) continue;
        const n = parseFloat(numMatch[1].replace(/[, ]/g, ''));
        if (!Number.isFinite(n) || n < 100) continue;
        threshold = n;
        break;
      }
      rows.push({ threshold, rate, raw: cells.join(' | ') });
    }
  }
  // de-dupe by (threshold,rate)
  const seen = new Set();
  return rows.filter((r) => {
    const k = `${r.threshold}|${r.rate}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function loadLocalTaxData() {
  try {
    const mod = require(TAX_DATA_PATH);
    return mod.TAX_DATA || {};
  } catch (e) {
    console.error('Failed to require tax-data.js:', e.message);
    return {};
  }
}

// Parse a YYYY-MM-DD or YYYY-MM string into a Date (start of month/day).
function parseDateLoose(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +(m[3] || 1)));
}

function topBandFromBrackets(brackets) {
  if (!Array.isArray(brackets) || brackets.length === 0) return null;
  // last finite-threshold band, plus top open-ended band
  const top = brackets[brackets.length - 1];
  const prev = brackets[brackets.length - 2] || null;
  return {
    topRate: top && top.rate,
    topThreshold: prev && prev.upTo, // the threshold above which the top rate kicks in
  };
}

/* ──────────────────────────── main ────────────────────────────────────── */

(async function main() {
  const localData = loadLocalTaxData();
  const findings = [];
  const fetchErrors = [];

  for (const c of COUNTRIES) {
    const url = `https://taxsummaries.pwc.com/${c.slug}/individual/taxes-on-personal-income`;
    process.stdout.write(`  fetching ${c.code} ... `);
    const res = await httpGet(url);
    if (!res.ok) {
      console.log(`fail (status=${res.status})`);
      fetchErrors.push({ code: c.code, url, status: res.status, error: res.error || '' });
      continue;
    }
    const pwcDate = extractLastReviewed(res.body);
    const pwcRows = extractBracketRows(res.body);
    const local = localData[c.code];
    const localDate = local ? parseDateLoose(local.lastVerified) : null;
    const pwcDateObj = pwcDate ? parseDateLoose(pwcDate.iso) : null;

    const newer = pwcDateObj && localDate && pwcDateObj > localDate;
    const localTop = local ? topBandFromBrackets(local.brackets) : null;

    // PwC top rate: use the max rate seen in extracted rows.
    let pwcTopRate = null;
    let pwcTopThreshold = null;
    if (pwcRows.length) {
      pwcTopRate = Math.max(...pwcRows.map((r) => r.rate));
      const topRow = pwcRows.filter((r) => r.rate === pwcTopRate)[0];
      pwcTopThreshold = topRow ? topRow.threshold : null;
    }

    const rateDelta =
      pwcTopRate != null && localTop && localTop.topRate != null
        ? +(pwcTopRate - localTop.topRate).toFixed(2)
        : null;

    findings.push({
      code: c.code,
      url,
      pwcDate: pwcDate ? pwcDate.iso : null,
      pwcDateRaw: pwcDate ? pwcDate.raw : null,
      localVerified: local ? local.lastVerified : null,
      newerOnPwc: !!newer,
      pwcTopRate,
      pwcTopThreshold,
      localTopRate: localTop && localTop.topRate,
      localTopThreshold: localTop && localTop.topThreshold,
      rateDelta,
      bracketCount: pwcRows.length,
      hasLocal: !!local,
    });
    console.log(`ok (PwC reviewed ${pwcDate ? pwcDate.iso : '?'}, ${pwcRows.length} rows)`);
  }

  /* ────────────────────────── write report ──────────────────────────── */

  const today = new Date().toISOString().slice(0, 10);
  const newer = findings.filter((f) => f.newerOnPwc);
  const rateMismatch = findings.filter(
    (f) => f.rateDelta != null && Math.abs(f.rateDelta) >= 0.5,
  );
  const missingLocal = findings.filter((f) => !f.hasLocal);

  let md = `# Tax-Data Watcher Report — ${today}\n\n`;
  md += `Source: PwC Worldwide Tax Summaries (taxsummaries.pwc.com)\n\n`;
  md += `Compared against: \`js/tax-data.js\` (\`lastVerified\` field per country)\n\n`;
  md += `## Summary\n\n`;
  md += `- Countries checked: ${COUNTRIES.length}\n`;
  md += `- Fetch errors: ${fetchErrors.length}\n`;
  md += `- PwC last-reviewed newer than our lastVerified: **${newer.length}**\n`;
  md += `- Top-rate mismatches (Δ ≥ 0.5pp): **${rateMismatch.length}**\n`;
  md += `- Countries we don't track locally yet: **${missingLocal.length}**\n\n`;

  md += `## PwC newer than local\n\n`;
  if (newer.length === 0) {
    md += `_None — local data is at least as fresh as PwC for every tracked country._\n\n`;
  } else {
    md += `| Country | PwC reviewed | Our lastVerified | URL |\n|---|---|---|---|\n`;
    for (const f of newer) {
      md += `| ${f.code} | ${f.pwcDate} | ${f.localVerified || '—'} | ${f.url} |\n`;
    }
    md += `\n`;
  }

  md += `## Top-rate / threshold deltas\n\n`;
  md += `| Country | Local top rate | PwC top rate | Δpp | Local threshold | PwC threshold | Flag |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  for (const f of findings) {
    const flag = f.rateDelta != null && Math.abs(f.rateDelta) >= 0.5 ? 'CHECK' : '';
    md += `| ${f.code} | ${fmt(f.localTopRate)}% | ${fmt(f.pwcTopRate)}% | ${fmt(f.rateDelta)} | ${fmt(f.localTopThreshold)} | ${fmt(f.pwcTopThreshold)} | ${flag} |\n`;
  }
  md += `\n`;

  if (missingLocal.length) {
    md += `## Not in local data\n\n`;
    for (const f of missingLocal) md += `- ${f.code} — ${f.url}\n`;
    md += `\n`;
  }

  if (fetchErrors.length) {
    md += `## Fetch errors\n\n`;
    for (const e of fetchErrors) {
      md += `- ${e.code} (status=${e.status}) ${e.error ? '— ' + e.error : ''} — ${e.url}\n`;
    }
    md += `\n`;
  }

  md += `## All countries — raw\n\n`;
  md += `| Country | PwC reviewed | Local lastVerified | PwC rows |\n|---|---|---|---|\n`;
  for (const f of findings) {
    md += `| ${f.code} | ${f.pwcDateRaw || '—'} | ${f.localVerified || '—'} | ${f.bracketCount} |\n`;
  }
  md += `\n`;

  md += `---\n_Report generated ${new Date().toISOString()}_\n`;

  fs.writeFileSync(REPORT_PATH, md, 'utf8');

  console.log('');
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Newer on PwC: ${newer.length} | Rate-deltas: ${rateMismatch.length} | Errors: ${fetchErrors.length}`);
  process.exit(0);

  function fmt(v) {
    if (v == null || Number.isNaN(v)) return '—';
    if (typeof v === 'number' && Math.abs(v) >= 1000) return v.toLocaleString();
    return String(v);
  }
})().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
