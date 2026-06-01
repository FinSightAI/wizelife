#!/usr/bin/env node
// qa/per-app/_lib-flow.js
// Shared helpers for the per-app deep-flow test suite (added 2026-05-26).
// Keeps individual test files tight — just require this lib.

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// ── Simple assertion ──────────────────────────────────────────────────────────
function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ── HTTP(S) fetch helper ──────────────────────────────────────────────────────
// Returns { status, headers, body } — no external deps.
function fetchOk(urlStr, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: Object.assign({ 'User-Agent': 'WizeQA/1.0' }, opts.headers || {}),
      timeout: opts.timeout || 15000,
    };
    const req = lib.request(reqOpts, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out: ' + urlStr)); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ── HTML grep ────────────────────────────────────────────────────────────────
// Returns true if the html string contains the given substring (case-insensitive by default).
function findInHtml(html, needle, caseSensitive = false) {
  if (caseSensitive) return html.includes(needle);
  return html.toLowerCase().includes(needle.toLowerCase());
}

// ── Run test suite ────────────────────────────────────────────────────────────
// steps: array of { name, fn } — runs each in sequence, collects errors.
async function runSuite(suiteName, steps) {
  const errors = [];
  let passed = 0;
  for (const { name, fn } of steps) {
    try {
      await fn();
      passed++;
    } catch (e) {
      errors.push(`[${name}] ${e.message}`);
    }
  }
  const total = steps.length;
  const allPass = errors.length === 0;
  console.log(`\n${allPass ? '✅' : '❌'} ${suiteName} — ${passed}/${total} passed`);
  if (!allPass) {
    errors.forEach((e) => console.log('  - ' + e));
    process.exit(1);
  }
}

// ── Playwright browser factory (optional — only when playwright is available) ──
async function launchBrowser(opts = {}) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  return browser;
}

async function newPage(browser, url, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  // NOTE: do NOT use waitUntil:'networkidle' — apps hold persistent Firebase
  // websocket/long-poll connections so the network never goes idle and goto()
  // times out before any assertion runs (mass false-positives). Wait for the
  // DOM, then give JS an explicit window to hydrate.
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  return { page, ctx };
}

module.exports = { assert, fetchOk, findInHtml, runSuite, launchBrowser, newPage };
