#!/usr/bin/env node
/**
 * lighthouse-budget.js — Page-load budget enforcer using Playwright.
 *
 *  - Loads each target URL in a headless Chromium.
 *  - Captures LCP, CLS (PerformanceObserver), TBT (longtask sum > 50ms while loading),
 *    longest-task duration (INP-approx), DOMContentLoaded, total bytes transferred.
 *  - Compares against budgets, marks Green / Yellow / Red.
 *  - Writes /tmp/lighthouse-budget-report.md.
 */

const fs = require('fs');
const path = require('path');

const REPORT_PATH = '/tmp/lighthouse-budget-report.md';

const TARGETS = [
  'https://wizelife.ai/',
  'https://tax.wizelife.ai/relocation-analyzer',
  'https://money.wizelife.ai/',
  'https://deal.wizelife.ai/',
  'https://travel.wizelife.ai/',
];

const BUDGETS = {
  lcpMs:   { green: 2500, yellow: 4000 },
  cls:     { green: 0.1,  yellow: 0.25 },
  tbtMs:   { green: 200,  yellow: 600 },
  longestTaskMs: { green: 200, yellow: 500 },
  dclMs:   { green: 2000, yellow: 4000 },
  bytes:   { green: 1_500_000, yellow: 3_500_000 },
};

const NAV_TIMEOUT_MS = 30000;
const SETTLE_MS = 4000;

function marker(value, budget, lowerIsBetter = true) {
  if (value == null || Number.isNaN(value)) return ':grey_question:';
  const { green, yellow } = budget;
  if (lowerIsBetter) {
    if (value <= green) return ':green_circle:';
    if (value <= yellow) return ':yellow_circle:';
    return ':red_circle:';
  } else {
    if (value >= green) return ':green_circle:';
    if (value >= yellow) return ':yellow_circle:';
    return ':red_circle:';
  }
}

async function measure(browser, url) {
  const ctx = await browser.newContext({ userAgent: 'wizelife-budget/1.0 Mozilla/5.0' });
  const page = await ctx.newPage();
  let bytes = 0;
  page.on('response', async (resp) => {
    try {
      const lenHdr = resp.headers()['content-length'];
      if (lenHdr) {
        bytes += parseInt(lenHdr, 10) || 0;
      } else {
        const body = await resp.body().catch(() => null);
        if (body) bytes += body.length;
      }
    } catch (_) {}
  });

  // Inject PerformanceObservers BEFORE navigation
  await page.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, longestTask: 0, tbt: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__perf.lcp = Math.max(window.__perf.lcp, e.startTime + (e.duration || 0));
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!e.hadRecentInput) window.__perf.cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__perf.longestTask = Math.max(window.__perf.longestTask, e.duration);
          if (e.duration > 50) window.__perf.tbt += (e.duration - 50);
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch (_) {}
  });

  let err = null;
  let dclMs = null;
  const t0 = Date.now();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    dclMs = Date.now() - t0;
    if (!resp || !resp.ok()) err = `HTTP ${resp ? resp.status() : 'no-response'}`;
  } catch (e) {
    err = e.message.split('\n')[0];
  }

  // Wait for late metrics
  await page.waitForTimeout(SETTLE_MS).catch(() => {});

  let perf = { lcp: 0, cls: 0, longestTask: 0, tbt: 0 };
  try {
    perf = await page.evaluate(() => window.__perf || { lcp: 0, cls: 0, longestTask: 0, tbt: 0 });
  } catch (_) {}

  await ctx.close().catch(() => {});

  return {
    url,
    err,
    lcpMs: Math.round(perf.lcp),
    cls: Number(perf.cls.toFixed(3)),
    tbtMs: Math.round(perf.tbt),
    longestTaskMs: Math.round(perf.longestTask),
    dclMs,
    bytes,
  };
}

(async () => {
  let playwright;
  try {
    playwright = require(path.join(process.cwd(), 'node_modules', 'playwright'));
  } catch (_) {
    try {
      playwright = require('playwright');
    } catch (e) {
      console.error('lighthouse-budget: playwright not installed:', e.message);
      fs.writeFileSync(REPORT_PATH, `# Lighthouse Budget Report\n\nERROR: playwright not installed — \`${e.message}\`\n`);
      process.exit(0);
    }
  }

  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch (e) {
    console.error('lighthouse-budget: failed to launch chromium:', e.message);
    fs.writeFileSync(REPORT_PATH, `# Lighthouse Budget Report\n\nERROR launching Chromium: \`${e.message}\`\n\nRun: \`npx playwright install chromium\`\n`);
    process.exit(0);
  }

  const rows = [];
  for (const url of TARGETS) {
    try {
      const r = await measure(browser, url);
      rows.push(r);
    } catch (e) {
      rows.push({ url, err: e.message, lcpMs: null, cls: null, tbtMs: null, longestTaskMs: null, dclMs: null, bytes: 0 });
    }
  }

  await browser.close().catch(() => {});

  const lines = [];
  lines.push(`# Lighthouse Budget Report — ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Budgets: LCP < 2.5s green / 4s yellow · CLS < 0.1 / 0.25 · TBT < 200ms / 600ms · Longest task < 200ms / 500ms · DCL < 2s / 4s · Bytes < 1.5MB / 3.5MB');
  lines.push('');
  lines.push('| URL | LCP | CLS | TBT | Longest task | DCL | Bytes | Error |');
  lines.push('|-----|-----|-----|-----|--------------|-----|-------|-------|');
  for (const r of rows) {
    const fmt = (v, unit = '') => (v == null ? '-' : `${v}${unit}`);
    lines.push(
      `| ${r.url} ` +
      `| ${marker(r.lcpMs, BUDGETS.lcpMs)} ${fmt(r.lcpMs, 'ms')} ` +
      `| ${marker(r.cls, BUDGETS.cls)} ${fmt(r.cls)} ` +
      `| ${marker(r.tbtMs, BUDGETS.tbtMs)} ${fmt(r.tbtMs, 'ms')} ` +
      `| ${marker(r.longestTaskMs, BUDGETS.longestTaskMs)} ${fmt(r.longestTaskMs, 'ms')} ` +
      `| ${marker(r.dclMs, BUDGETS.dclMs)} ${fmt(r.dclMs, 'ms')} ` +
      `| ${marker(r.bytes, BUDGETS.bytes)} ${fmt(r.bytes ? (r.bytes/1024).toFixed(0) : 0, ' KB')} ` +
      `| ${r.err || ''} |`
    );
  }
  lines.push('');
  lines.push('## Failures (red markers)');
  lines.push('');
  const failures = [];
  for (const r of rows) {
    const f = [];
    if (r.lcpMs > BUDGETS.lcpMs.yellow) f.push(`LCP ${r.lcpMs}ms`);
    if (r.cls > BUDGETS.cls.yellow) f.push(`CLS ${r.cls}`);
    if (r.tbtMs > BUDGETS.tbtMs.yellow) f.push(`TBT ${r.tbtMs}ms`);
    if (r.longestTaskMs > BUDGETS.longestTaskMs.yellow) f.push(`Longest task ${r.longestTaskMs}ms`);
    if (r.dclMs > BUDGETS.dclMs.yellow) f.push(`DCL ${r.dclMs}ms`);
    if (r.bytes > BUDGETS.bytes.yellow) f.push(`Bytes ${(r.bytes/1024).toFixed(0)}KB`);
    if (r.err) f.push(`Error: ${r.err}`);
    if (f.length) failures.push(`- **${r.url}** — ${f.join(', ')}`);
  }
  lines.push(failures.length ? failures.join('\n') : '_No red-marker failures._');
  lines.push('');

  fs.writeFileSync(REPORT_PATH, lines.join('\n'));
  console.log(`lighthouse-budget: wrote ${REPORT_PATH}`);
  process.exit(0);
})();
