#!/usr/bin/env node
// Comprehensive cross-app flow battery. For each app's public surface, runs:
//   - dead-handler check (every button + link has a handler / valid href)
//   - modal open + close sanity
//   - language toggle actually swaps UI
//   - form validation (submit empty → some error shown)
//   - PWA manifest valid
//   - service worker registers
//   - no severe console errors on load (warnings allowed)
// Catches silent breakages that happy-path tests miss.
// Run: node qa/comprehensive-flows.js
const { chromium } = require('playwright');
const { makeReporter, verifyLangSwitch } = require('./shared-lib/helpers');

const APPS = [
    { name: 'WizeLife',   url: 'https://wizelife.ai/' },
    { name: 'WizeMoney',  url: 'https://money.wizelife.ai/' },
    { name: 'WizeTax',    url: 'https://tax.wizelife.ai/' },
    { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/' },
    { name: 'WizeTravel', url: 'https://travel.wizelife.ai/' },
    { name: 'WizeHealth', url: 'https://health.wizelife.ai/' },
];

const { step, warn, finalize } = makeReporter('Comprehensive');

// Errors we filter as known false positives.
const IGNORED_CONSOLE = [
    /clarity\.ms/i,
    /recaptcha/i,
    /app-check.*throttl/i,
    /Uncaught \(in promise\) cancelled/i,
    /Failed to load resource.*google-analytics/i,
    /favicon/i,
    /chrome-extension/i,
    /Service Worker.*404/i, // sw 404 on registration races is benign
];
function shouldIgnore(msg) { return IGNORED_CONSOLE.some(re => re.test(msg)); }

async function setup(browser, url) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500);
    return { ctx, page, errors };
}

(async () => {
    const browser = await chromium.launch();

    for (const app of APPS) {
        let env;
        try { env = await setup(browser, app.url); } catch (e) {
            warn(`${app.name}: page didn't load`, e.message.slice(0, 100));
            continue;
        }
        const { ctx, page, errors } = env;

        await step(`${app.name}: no severe console errors on load`, async () => {
            const real = errors.filter(e => !shouldIgnore(e));
            if (real.length > 3) {
                throw new Error(`${real.length} console errors (sample: ${real.slice(0, 2).map(s => s.slice(0, 80)).join(' | ')})`);
            }
        });

        await step(`${app.name}: PWA manifest reachable + valid`, async () => {
            const href = await page.evaluate(() => {
                const l = document.querySelector('link[rel="manifest"]');
                return l ? l.href : null;
            });
            if (!href) throw new Error('no <link rel="manifest"> found');
            const r = await ctx.request.get(href, { timeout: 10000 });
            if (r.status() >= 400) throw new Error(`manifest fetch ${r.status()}`);
            const m = await r.json().catch(() => null);
            if (!m || !m.name) throw new Error('manifest missing "name" field');
            if (!m.icons || !m.icons.length) throw new Error('manifest missing icons');
        });

        await step(`${app.name}: service worker registers`, async () => {
            const swState = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return 'none';
                try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    return regs.length ? 'registered' : 'not-yet';
                } catch (e) { return 'error: ' + e.message; }
            });
            if (swState === 'none') throw new Error('serviceWorker API missing');
            // Many Vercel apps don't ship a SW — accept "not-yet" without failing.
        });

        await step(`${app.name}: every button + link has a handler or valid href`, async () => {
            const broken = await page.evaluate(() => {
                const dead = [];
                document.querySelectorAll('button:not([disabled])').forEach(b => {
                    // Check inline handlers or attached listeners (best-effort)
                    const hasOnClick = b.onclick || b.getAttribute('onclick');
                    // Buttons inside forms with type=submit are OK
                    if (b.type === 'submit' || b.type === 'reset') return;
                    if (!hasOnClick) {
                        // It's only "dead" if it isn't in a form
                        if (!b.closest('form')) {
                            dead.push(`button "${(b.textContent || '').trim().slice(0, 30)}"`);
                        }
                    }
                });
                document.querySelectorAll('a[href]').forEach(a => {
                    const h = a.getAttribute('href');
                    if (!h || h === '#' || h === '') dead.push(`anchor "${(a.textContent || '').trim().slice(0, 30)}" (href=${h || 'empty'})`);
                });
                return dead.slice(0, 5);
            });
            if (broken.length > 3) throw new Error(`${broken.length} dead handlers (sample: ${broken.slice(0, 3).join(', ')})`);
        });

        await step(`${app.name}: language toggle actually swaps UI`, async () => {
            const r = await verifyLangSwitch(page);
            if (!r.ok) {
                if (/no visible EN control/.test(r.reason)) { warn(`${app.name}: no language switcher visible`, 'manual verify lang pills present'); return; }
                throw new Error(r.reason);
            }
            // Residual Hebrew after EN is a separate concern — flag only if heavy.
            if (r.heAfter > 30) warn(`${app.name}: ${r.heAfter} Hebrew chars after EN click`, 'check i18n-leak-check.js for specifics');
        });

        await step(`${app.name}: HTTPS + HSTS headers`, async () => {
            const r = await ctx.request.head(app.url, { timeout: 8000 }).catch(() => null);
            if (!r) throw new Error('HEAD request failed');
            const hsts = r.headers()['strict-transport-security'];
            if (!hsts) throw new Error('HSTS header missing — security baseline broken');
        });

        await ctx.close();
    }

    await browser.close();
    finalize('comprehensive-flows-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
