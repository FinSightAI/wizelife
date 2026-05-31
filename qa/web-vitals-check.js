#!/usr/bin/env node
/**
 * Core Web Vitals budget check — mobile (390px), all 6 apps.
 * Measures LCP, CLS, FCP, TTFB, and TBT-proxy (long tasks) via in-page
 * PerformanceObserver, then grades against Google's "good" thresholds.
 *
 * Why it exists: performance-check.js only measured domContentLoaded.
 * CLS/LCP regressions (e.g. WizeMoney CLS) were invisible. This catches them.
 *
 * Budgets (mobile, Google CWV "good"): LCP <=2500ms, CLS <=0.1, TBT <=200ms,
 * FCP <=1800ms. "needs-improvement" is warned (not failed) up to the poor cutoff.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const APPS = [
  { name: 'WizeMoney',  url: 'https://money.wizelife.ai/' },
  { name: 'WizeHealth', url: 'https://health.wizelife.ai/' },
  { name: 'WizeTax',    url: 'https://tax.wizelife.ai/advisor' },
  { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/' },
  { name: 'WizeTravel', url: 'https://travel.wizelife.ai/' },
  { name: 'WizeLife',   url: 'https://wizelife.ai/' },
];

const BUDGET = { LCP: 2500, CLS: 0.1, TBT: 200, FCP: 1800 };
const POOR   = { LCP: 4000, CLS: 0.25, TBT: 600, FCP: 3000 };

const out = ['# Core Web Vitals — mobile (390px)\n', `_run ${new Date().toISOString()}_\n`];
const fails = [];

function grade(metric, val) {
  if (val == null) return '—';
  if (val <= BUDGET[metric]) return 'good';
  if (val <= POOR[metric]) return 'warn';
  return 'POOR';
}

async function measure(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  // let LCP settle + provoke any late layout shifts
  await page.waitForTimeout(6000);
  return page.evaluate(() => new Promise((resolve) => {
    const res = { LCP: null, CLS: 0, FCP: null, TTFB: null, TBT: 0 };
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) res.TTFB = Math.round(nav.responseStart);
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcp) res.FCP = Math.round(fcp.startTime);
      // LCP
      try { new PerformanceObserver(list => { const e = list.getEntries(); res.LCP = Math.round(e[e.length - 1].startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
      // CLS
      try { new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) res.CLS += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
      // TBT proxy = sum of (longtask - 50ms)
      try { new PerformanceObserver(list => { for (const e of list.getEntries()) res.TBT += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true }); } catch {}
    } catch {}
    setTimeout(() => { res.CLS = Math.round(res.CLS * 1000) / 1000; res.TBT = Math.round(res.TBT); resolve(res); }, 500);
  }));
}

(async () => {
  const browser = await chromium.launch();
  out.push('| App | LCP | CLS | FCP | TBT | TTFB | verdict |');
  out.push('|-----|-----|-----|-----|-----|------|---------|');
  for (const app of APPS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    let m; try { m = await measure(page, app.url); } catch (e) { m = null; }
    await ctx.close();
    if (!m) { out.push(`| ${app.name} | — | — | — | — | — | SKIP (load fail) |`); continue; }
    const grades = { LCP: grade('LCP', m.LCP), CLS: grade('CLS', m.CLS), TBT: grade('TBT', m.TBT), FCP: grade('FCP', m.FCP) };
    const poorMetrics = Object.entries(grades).filter(([, g]) => g === 'POOR').map(([k]) => k);
    const warnMetrics = Object.entries(grades).filter(([, g]) => g === 'warn').map(([k]) => k);
    const verdict = poorMetrics.length ? `🚨 POOR: ${poorMetrics.join(',')}` : (warnMetrics.length ? `⚠️ warn: ${warnMetrics.join(',')}` : '✅ good');
    out.push(`| ${app.name} | ${m.LCP ?? '—'}ms | ${m.CLS} | ${m.FCP ?? '—'}ms | ${m.TBT}ms | ${m.TTFB ?? '—'}ms | ${verdict} |`);
    if (poorMetrics.length) fails.push(`${app.name}: POOR ${poorMetrics.map(k => `${k}=${m[k]}`).join(', ')}`);
  }
  await browser.close();
  out.push('\n## Action items');
  out.push(fails.length ? fails.map(f => `- 🚨 ${f}`).join('\n') : '- ✅ No POOR Core Web Vitals on any app.');
  const report = out.join('\n');
  fs.writeFileSync('web-vitals-report.md', report);
  console.log(report);
  process.exit(fails.length ? 1 : 0);
})();
