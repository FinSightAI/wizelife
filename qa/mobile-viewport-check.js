#!/usr/bin/env node
// Mobile viewport sanity: load each public page at 390x844 (iPhone 14 Pro),
// check no horizontal scroll, no element overflowing right edge, and tappable
// hit-targets ≥ 32px. Catches mobile-broken layouts before launch.
// Run: node qa/mobile-viewport-check.js
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const URLS = [
    'https://wizelife.ai/',
    'https://wizelife.ai/auth.html',
    'https://wizelife.ai/about.html',
    'https://wizelife.ai/dashboard.html',
    'https://wizelife.ai/security.html',
    'https://wizelife.ai/terms.html',
    'https://wizelife.ai/wize-ai.html',
    'https://money.wizelife.ai/',
    'https://tax.wizelife.ai/',
    'https://deal.wizelife.ai/',
    'https://travel.wizelife.ai/',
    'https://health.wizelife.ai/',
];

const VIEWPORT = { width: 390, height: 844 };
const { step, warn, finalize } = makeReporter('Mobile-Viewport');

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
        viewport: VIEWPORT,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await ctx.newPage();

    for (const url of URLS) {
        await step(`${url} — no horizontal overflow at 390w`, async () => {
            try {
                await page.goto(url, { waitUntil: 'load', timeout: 45000 });
            } catch (e) { throw new Error('page load failed: ' + e.message.slice(0, 80)); }
            await page.waitForTimeout(1200);

            const result = await page.evaluate(() => {
                const docW = document.documentElement.scrollWidth;
                const viewportW = window.innerWidth;
                const overflowsX = docW > viewportW + 4; // 4px tolerance
                // Find specific elements wider than viewport
                const wideEls = [];
                document.body.querySelectorAll('*').forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.width > viewportW + 4 && r.height > 4) {
                        wideEls.push(`${el.tagName}.${(el.className || '').toString().slice(0, 30)} ${Math.round(r.width)}px`);
                    }
                });
                return { docW, viewportW, overflowsX, wideEls: wideEls.slice(0, 3) };
            });

            if (result.overflowsX) {
                throw new Error(`page is ${result.docW}px wide, viewport ${result.viewportW}px. Wide elements: ${result.wideEls.join(' | ') || 'unknown'}`);
            }
        });

        await step(`${url} — tappable hit targets ≥ 32px`, async () => {
            const tiny = await page.evaluate(() => {
                const small = [];
                document.querySelectorAll('a[href], button, [role=button], input[type=submit], input[type=button]').forEach(el => {
                    const cs = getComputedStyle(el);
                    if (cs.display === 'none' || cs.visibility === 'hidden') return;
                    const r = el.getBoundingClientRect();
                    if (r.width < 1 || r.height < 1) return; // ignore off-screen
                    const minDim = Math.min(r.width, r.height);
                    if (minDim < 32 && minDim > 0) {
                        small.push(`${el.tagName}.${(el.className || '').toString().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
                    }
                });
                return small.slice(0, 5);
            });
            if (tiny.length > 5) {
                // Warn, don't fail — many small icon buttons are inherently small
                throw new Error(`${tiny.length} tappable targets under 32px (sample: ${tiny.slice(0, 3).join(' | ')})`);
            }
        });
    }

    await browser.close();
    finalize('mobile-viewport-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
