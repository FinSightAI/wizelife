#!/usr/bin/env node
// Crawl every visible nav/sidebar/footer link on each app's landing page
// and verify it returns 200 (or a known-OK redirect). Catches broken links
// that QA's happy-path tests miss.
// Run: node qa/nav-link-check.js
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const APPS = [
    { name: 'WizeLife',   url: 'https://wizelife.ai/' },
    { name: 'WizeMoney',  url: 'https://money.wizelife.ai/' },
    { name: 'WizeTax',    url: 'https://tax.wizelife.ai/' },
    { name: 'WizeDeal',   url: 'https://deal.wizelife.ai/' },
    { name: 'WizeTravel', url: 'https://travel.wizelife.ai/' },
    { name: 'WizeHealth', url: 'https://health.wizelife.ai/' },
];

// Hosts we trust to return 200 even if curl shows weird (HEAD-blocked).
const KNOWN_OK_HOSTS = ['render.com', 'huggingface.co', 'github.com', 'github.io'];

const { step, warn, finalize } = makeReporter('Nav-Links');

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    for (const app of APPS) {
        await step(`${app.name}: enumerate nav links`, async () => {
            await page.goto(app.url, { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(2000);

            const links = await page.evaluate(() => {
                const allowedRoots = ['wizelife.ai', 'money.wizelife.ai', 'tax.wizelife.ai',
                    'deal.wizelife.ai', 'travel.wizelife.ai', 'health.wizelife.ai',
                    'finsightai.github.io', 'mastermove.vercel.app', 'check-deal.vercel.app'];
                const out = new Set();
                document.querySelectorAll('nav a[href], aside a[href], footer a[href], header a[href], .sidebar a[href]').forEach(a => {
                    const href = a.href;
                    if (!href) return;
                    if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
                    try {
                        const u = new URL(href);
                        if (allowedRoots.some(r => u.hostname.endsWith(r))) {
                            out.add(u.toString());
                        }
                    } catch (e) {}
                });
                return Array.from(out);
            });

            // No links in nav/header/footer/sidebar containers → nothing to verify
            // (e.g. WizeTax is an advisor SPA whose chat UI has no nav-bar links).
            // The per-app + mobile tiers still assert nav/UI rendering separately.
            if (!links.length) return;

            const broken = [];
            for (const link of links) {
                try {
                    const r = await page.context().request.head(link, { timeout: 12000 });
                    let status = r.status();
                    // Some servers reject HEAD — fall back to GET
                    if (status === 405 || status === 501) {
                        const g = await page.context().request.get(link, { timeout: 15000 });
                        status = g.status();
                    }
                    if (status >= 400 && status !== 403 /* trust 403 = auth gate */) {
                        broken.push(`${link} → ${status}`);
                    }
                } catch (e) {
                    if (!KNOWN_OK_HOSTS.some(h => link.includes(h))) {
                        broken.push(`${link} → fetch error: ${e.message.slice(0, 60)}`);
                    }
                }
            }
            if (broken.length) throw new Error(`${broken.length}/${links.length} broken: ${broken.slice(0, 3).join(' | ')}`);
        });
    }

    await browser.close();
    finalize('nav-link-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
