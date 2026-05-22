#!/usr/bin/env node
/* page-error-check.js — catches JS SyntaxError / ReferenceError / TypeError and
   blank-page regressions across all WizeLife apps.

   Two checks per app:
     1. JS ERRORS — any uncaught pageerror or console error that originates from
        the app's own scripts (SyntaxError / ReferenceError / TypeError).
        Known-benign noise is filtered (CSP meta frame-ancestors, reCAPTCHA,
        favicon, net::ERR beacons, SW first-load race on WebKit).
     2. RENDER SANITY — body text > 500 chars AND at least one expected structural
        element is present.  A blank page (caused e.g. by ",," in an i18n object
        that triggers a SyntaxError) is a failure even without a captured error.

   Read-only.  Exits non-zero if ANY app fails.
   Run: node qa/page-error-check.js
*/
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'node_modules', 'playwright'));

const APPS = [
  { name: 'WizeMoney',  url: 'https://money.wizelife.ai/',      elementSel: 'nav,header,.sidebar,#app,[class*="dash"]' },
  { name: 'WizeTax',    url: 'https://tax.wizelife.ai/advisor',  elementSel: 'nav,header,.advisor,[class*="chat"],[class*="form"]' },
  { name: 'WizeHealth', url: 'https://health.wizelife.ai/',       elementSel: 'nav,header,main,[class*="chat"],[class*="health"]' },
  { name: 'WizeTravel', url: 'https://travel.wizelife.ai/',       elementSel: 'nav,header,main,[class*="travel"],[class*="calc"]' },
  { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/',         elementSel: 'nav,header,main,[class*="deal"],[class*="compare"]' },
  { name: 'WizeLife',   url: 'https://wizelife.ai/',             elementSel: 'nav,header,main,.hero,[class*="landing"]' },
];

// Messages that are known-benign and must NEVER cause a FAIL.
const BENIGN_PATTERNS = [
  /frame-ancestors.*ignored when delivered via a <meta>/i,
  /recaptcha/i,
  /favicon/i,
  /net::ERR.*beacon/i,
  /sw\.js.*load failed/i,
  /Unhandled Promise Rejection.*sw\.js/i,
  /clarity/i,
  /Content Security Policy.*google/i,
  /Content Security Policy.*clarity/i,
];

// Patterns that indicate a real bug in the app's own scripts.
const CODE_ERROR_RE = /SyntaxError|ReferenceError|TypeError|is not defined|is not a function|Cannot read prop|Unexpected token|Unexpected identifier/i;

function isBenign(msg) {
  return BENIGN_PATTERNS.some(re => re.test(msg));
}

(async () => {
  const browser = await chromium.launch();
  let failures = 0;
  const lines = [];

  for (const app of APPS) {
    const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', err => {
      const msg = String(err);
      if (!isBenign(msg)) pageErrors.push(msg.slice(0, 200));
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const t = msg.text();
        if (!isBenign(t)) consoleErrors.push(t.slice(0, 200));
      }
    });

    let loadErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
        loadErr = null;
        break;
      } catch (e) {
        loadErr = String(e).slice(0, 100);
      }
    }

    // Wait for deferred scripts + hydration.
    await page.waitForTimeout(4000);

    // --- Render sanity check ---
    let renderFail = null;
    try {
      renderFail = await page.evaluate((sel) => {
        const bodyText = (document.body && document.body.innerText) || '';
        if (bodyText.trim().length < 500) {
          return 'body too short (' + bodyText.trim().length + ' chars) — page may be blank';
        }
        const found = document.querySelector(sel);
        if (!found) {
          return 'no structural element matched "' + sel + '" — page may not have rendered';
        }
        return null;
      }, app.elementSel);
    } catch (e) {
      renderFail = 'evaluate error: ' + String(e).slice(0, 80);
    }

    // --- Screenshot (best-effort) ---
    try { await page.screenshot({ path: '/tmp/pec-' + app.name + '.png' }); } catch (_) {}

    // --- Classify ---
    const probs = [];
    if (loadErr) probs.push('LOAD FAILED: ' + loadErr);

    const realPageErrors = pageErrors.filter(e => CODE_ERROR_RE.test(e));
    if (realPageErrors.length) {
      probs.push('JS CODE ERROR (pageerror): ' + JSON.stringify(realPageErrors.slice(0, 3)));
    }

    const realConsoleErrors = consoleErrors.filter(e => CODE_ERROR_RE.test(e));
    if (realConsoleErrors.length) {
      probs.push('JS CODE ERROR (console): ' + JSON.stringify(realConsoleErrors.slice(0, 3)));
    }

    if (renderFail) probs.push('RENDER BLANK: ' + renderFail);

    if (probs.length) {
      failures++;
      lines.push('FAIL  ' + app.name + '\n      ' + probs.join('\n      '));
    } else {
      lines.push('PASS  ' + app.name);
    }

    // Non-code console errors: informational only.
    const infoErrs = consoleErrors.filter(e => !CODE_ERROR_RE.test(e));
    if (infoErrs.length) {
      lines.push('      INFO (non-fatal console errors): ' + JSON.stringify(infoErrs.slice(0, 2)));
    }

    await ctx.close();
  }

  await browser.close();

  console.log('\n=== Page Error + Render Sanity Check (Chromium desktop) ===\n');
  console.log(lines.join('\n'));
  console.log('');
  if (failures) {
    console.log('FAIL  ' + failures + ' app(s) have JS errors or blank-page regressions');
  } else {
    console.log('PASS  all apps rendered with no uncaught JS errors');
  }
  console.log('');
  process.exit(failures ? 1 : 0);
})();
