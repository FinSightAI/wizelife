#!/usr/bin/env node
/**
 * uptime-tripwire.js — Cron-every-5-min uptime probe for WizeLife sub-apps.
 *
 *  - Hits each URL.
 *  - Persists rolling last-100 samples per URL to /tmp/uptime-tripwire-state.json.
 *  - Two consecutive fails (non-200 or >10s) -> append alert to /tmp/uptime-tripwire-alerts.md.
 *  - Writes per-URL uptime% over last 24h (when enough data) to that same file.
 *  - Exits 1 if any current alert is active, else 0.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

const STATE_PATH = '/tmp/uptime-tripwire-state.json';
const ALERTS_PATH = '/tmp/uptime-tripwire-alerts.md';

const TARGETS = [
  'https://wizelife.ai/',
  'https://money.wizelife.ai/',
  'https://tax.wizelife.ai/',
  'https://health.wizelife.ai/',
  'https://travel.wizelife.ai/',
  'https://deal.wizelife.ai/',
];

const TIMEOUT_MS = 10000;
const MAX_SAMPLES = 100;
const FAIL_THRESHOLD_CONSECUTIVE = 2;

function probe(url) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'wizelife-uptime-tripwire/1.0' } }, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const ms = Date.now() - t0;
        const ok = res.statusCode === 200 && ms <= TIMEOUT_MS;
        resolve({ ts: Date.now(), ok, status: res.statusCode, ms });
      });
    });
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      resolve({ ts: Date.now(), ok: false, status: 0, ms: Date.now() - t0, error: 'timeout' });
    });
    req.on('error', (e) => {
      resolve({ ts: Date.now(), ok: false, status: 0, ms: Date.now() - t0, error: e.code || e.message });
    });
  });
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (_) {
    return {};
  }
}

function saveState(s) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

function appendAlert(line) {
  const exists = fs.existsSync(ALERTS_PATH);
  fs.appendFileSync(ALERTS_PATH, (exists ? '' : '# Uptime Tripwire Alerts\n\n') + line + '\n');
}

(async () => {
  const state = loadState();
  let anyActive = false;
  const summary = [];

  for (const url of TARGETS) {
    const result = await probe(url);
    if (!state[url]) state[url] = { samples: [] };
    state[url].samples.push(result);
    while (state[url].samples.length > MAX_SAMPLES) state[url].samples.shift();

    // Detect consecutive fails
    const tail = state[url].samples.slice(-FAIL_THRESHOLD_CONSECUTIVE);
    const consecutiveFail = tail.length === FAIL_THRESHOLD_CONSECUTIVE && tail.every((s) => !s.ok);

    if (consecutiveFail) {
      anyActive = true;
      const last = result;
      const detail = last.error ? last.error : `HTTP ${last.status}`;
      appendAlert(`- ${new Date().toISOString()} — **DOWN** ${url} (${detail}, ${last.ms}ms)`);
    }

    // 24h uptime %
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const last24 = state[url].samples.filter((s) => s.ts >= cutoff);
    const upPct = last24.length ? ((last24.filter((s) => s.ok).length / last24.length) * 100).toFixed(2) : null;
    summary.push({ url, ok: result.ok, ms: result.ms, status: result.status, samples24h: last24.length, uptime24h: upPct });
  }

  saveState(state);

  // Refresh the bottom "current status" of alerts file (rewrite header + tail)
  const header = [];
  header.push('# Uptime Tripwire — Current Status');
  header.push(`_Last run: ${new Date().toISOString()}_`);
  header.push('');
  header.push('| URL | This run | Status | Latency (ms) | 24h samples | 24h uptime % |');
  header.push('|-----|----------|--------|--------------|-------------|--------------|');
  for (const r of summary) {
    header.push(`| ${r.url} | ${r.ok ? 'OK' : 'FAIL'} | ${r.status || '-'} | ${r.ms} | ${r.samples24h} | ${r.uptime24h ?? '_n/a_'} |`);
  }
  header.push('');
  header.push('---');
  header.push('');

  // Preserve historical alert lines (lines starting with "- ")
  let priorAlerts = '';
  if (fs.existsSync(ALERTS_PATH)) {
    const existing = fs.readFileSync(ALERTS_PATH, 'utf8');
    priorAlerts = existing
      .split('\n')
      .filter((l) => l.startsWith('- '))
      .slice(-200)
      .join('\n');
  }

  const final = header.join('\n') + '## Alert history (last 200)\n\n' + (priorAlerts || '_No alerts recorded._') + '\n';
  fs.writeFileSync(ALERTS_PATH, final);

  console.log(`uptime-tripwire: ${anyActive ? 'ACTIVE ALERTS' : 'all green'} — report ${ALERTS_PATH}`);
  process.exit(anyActive ? 1 : 0);
})();
