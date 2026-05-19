#!/usr/bin/env node
/**
 * cost-monitor.js — Daily cost/usage signal monitor for WizeLife stack.
 *
 * TODO: Wire real API checks once env vars are configured.
 *
 *  ┌─────────────────────────┬────────────────────────────────┬──────────────────────────────────────────────────────────────┐
 *  │ Provider                │ Env Var(s)                     │ Expected API endpoint                                        │
 *  ├─────────────────────────┼────────────────────────────────┼──────────────────────────────────────────────────────────────┤
 *  │ Gemini (Google AI)      │ GEMINI_API_KEY,                │ https://generativelanguage.googleapis.com/v1beta/models      │
 *  │                         │ GEMINI_PROJECT_ID (GCP)        │ (quota via GCP: cloudresourcemanager + monitoring API)       │
 *  │ Firebase Functions      │ FIREBASE_PROJECT_ID,           │ https://cloudfunctions.googleapis.com/v1/projects/${PID}/    │
 *  │                         │ GOOGLE_APPLICATION_CREDENTIALS │   locations/-/functions  (invocations via Cloud Monitoring)  │
 *  │ Cloudflare Workers      │ CLOUDFLARE_API_TOKEN,          │ https://api.cloudflare.com/client/v4/accounts/${ACCT_ID}/    │
 *  │                         │ CLOUDFLARE_ACCOUNT_ID          │   workers/scripts  (analytics via GraphQL endpoint)          │
 *  │ Vercel                  │ VERCEL_TOKEN, VERCEL_TEAM_ID   │ https://api.vercel.com/v6/deployments,                       │
 *  │                         │                                │ https://api.vercel.com/v1/usage  (bandwidth/invocations)     │
 *  │ Render                  │ RENDER_API_KEY                 │ https://api.render.com/v1/services  (bandwidth via metrics)  │
 *  └─────────────────────────┴────────────────────────────────┴──────────────────────────────────────────────────────────────┘
 *
 * What this script does TODAY (no auth needed):
 *  - HTTPS GET each app's health URL, capture latency.
 *  - Persist per-day samples to /tmp/cost-monitor-history.json.
 *  - Flag latency spikes: today avg > 150% of 7-day rolling avg.
 *  - Flag sustained p95 > 3000ms across 3 consecutive days.
 *  - Emit /tmp/cost-monitor-report.md.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const { URL } = require('url');

const HISTORY_PATH = '/tmp/cost-monitor-history.json';
const REPORT_PATH = '/tmp/cost-monitor-report.md';

const TARGETS = [
  { name: 'WizeLife',   url: 'https://wizelife.ai/' },
  { name: 'WizeMoney',  url: 'https://money.wizelife.ai/' },
  { name: 'WizeTax',    url: 'https://tax.wizelife.ai/' },
  { name: 'WizeHealth', url: 'https://health.wizelife.ai/' },
  { name: 'WizeTravel', url: 'https://travel.wizelife.ai/' },
  { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/' },
];

const SPIKE_RATIO = 1.5;          // today vs 7-day rolling avg
const P95_SUSTAIN_MS = 3000;      // p95 threshold
const P95_SUSTAIN_DAYS = 3;       // consecutive days
const REQUEST_TIMEOUT_MS = 15000;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function probe(url) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'wizelife-cost-monitor/1.0' } }, (res) => {
      // drain
      res.on('data', () => {});
      res.on('end', () => {
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, latencyMs: Date.now() - t0 });
      });
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy();
      resolve({ ok: false, status: 0, latencyMs: Date.now() - t0, error: 'timeout' });
    });
    req.on('error', (e) => {
      resolve({ ok: false, status: 0, latencyMs: Date.now() - t0, error: e.code || e.message });
    });
  });
}

function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  } catch (_) {
    return { samples: {} }; // { [targetName]: { [YYYY-MM-DD]: [latencyMs, ...] } }
  }
}

function saveHistory(h) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(h, null, 2));
}

function pct(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

(async () => {
  const history = loadHistory();
  if (!history.samples) history.samples = {};
  const day = todayISO();

  const rows = [];
  const spikeAlerts = [];
  const sustainedAlerts = [];

  for (const t of TARGETS) {
    const r = await probe(t.url);
    if (!history.samples[t.name]) history.samples[t.name] = {};
    if (!history.samples[t.name][day]) history.samples[t.name][day] = [];
    history.samples[t.name][day].push(r.latencyMs);

    // Keep only last 30 days
    const keys = Object.keys(history.samples[t.name]).sort();
    while (keys.length > 30) {
      const k = keys.shift();
      delete history.samples[t.name][k];
    }

    // Stats
    const todaySamples = history.samples[t.name][day];
    const todayAvg = avg(todaySamples);

    // 7-day rolling (excluding today)
    const last7 = keys.filter((k) => k !== day).slice(-7);
    const rollingSamples = last7.flatMap((k) => history.samples[t.name][k] || []);
    const rollingAvg = avg(rollingSamples);

    // p95 sustained: last N days
    const lastN = keys.slice(-P95_SUSTAIN_DAYS);
    const sustainedHigh = lastN.length >= P95_SUSTAIN_DAYS && lastN.every((k) => pct(history.samples[t.name][k] || [], 95) > P95_SUSTAIN_MS);

    if (rollingAvg > 0 && todayAvg > rollingAvg * SPIKE_RATIO) {
      spikeAlerts.push(`- **${t.name}**: today ${todayAvg}ms vs 7d ${rollingAvg}ms (${((todayAvg / rollingAvg) * 100).toFixed(0)}%)`);
    }
    if (sustainedHigh) {
      sustainedAlerts.push(`- **${t.name}**: p95 > ${P95_SUSTAIN_MS}ms for ${P95_SUSTAIN_DAYS} consecutive days`);
    }

    rows.push({
      name: t.name,
      url: t.url,
      status: r.ok ? `OK (${r.status})` : `FAIL (${r.status || r.error || 'err'})`,
      latencyMs: r.latencyMs,
      todayAvg,
      rollingAvg,
      p95Today: pct(todaySamples, 95),
    });
  }

  saveHistory(history);

  const lines = [];
  lines.push(`# Cost Monitor Report — ${day}`);
  lines.push('');
  lines.push('## Latency snapshot');
  lines.push('');
  lines.push('| App | Status | This run (ms) | Today avg | 7d avg | p95 today |');
  lines.push('|-----|--------|---------------|-----------|--------|-----------|');
  for (const r of rows) {
    lines.push(`| ${r.name} | ${r.status} | ${r.latencyMs} | ${r.todayAvg} | ${r.rollingAvg || '-'} | ${r.p95Today || '-'} |`);
  }
  lines.push('');

  lines.push('## Spike alerts (today vs 7d > 150%)');
  lines.push('');
  lines.push(spikeAlerts.length ? spikeAlerts.join('\n') : '_No spikes detected._');
  lines.push('');

  lines.push('## Sustained-high p95 alerts (>3s for 3 days)');
  lines.push('');
  lines.push(sustainedAlerts.length ? sustainedAlerts.join('\n') : '_No sustained-high alerts._');
  lines.push('');

  lines.push('## MANUAL CHECKS NEEDED');
  lines.push('');
  lines.push('Until provider API tokens are wired, glance at each dashboard daily:');
  lines.push('');
  lines.push('- **Google AI Studio / Gemini** — quota & spend: https://aistudio.google.com/ (or GCP > APIs & Services > Quotas, filter `generativelanguage`)');
  lines.push('- **Firebase Functions** — invocations, GB-seconds, egress: https://console.firebase.google.com/project/finzilla-7f1f9/usage');
  lines.push('- **Cloudflare Workers** — requests, CPU time, errors: https://dash.cloudflare.com/ > Workers & Pages > Analytics');
  lines.push('- **Vercel** — bandwidth, function invocations, build minutes: https://vercel.com/dashboard/usage');
  lines.push('- **Render** — bandwidth, instance hours, build minutes: https://dashboard.render.com/billing');
  lines.push('- **Resend** — emails sent (free tier 3k/mo): https://resend.com/emails');
  lines.push('- **Firestore** — reads/writes/deletes vs free quota: https://console.firebase.google.com/project/finzilla-7f1f9/firestore/usage');
  lines.push('');
  lines.push(`_History persisted at ${HISTORY_PATH}._`);
  lines.push('');

  fs.writeFileSync(REPORT_PATH, lines.join('\n'));
  console.log(`cost-monitor: wrote ${REPORT_PATH}`);
  process.exit(0);
})();
