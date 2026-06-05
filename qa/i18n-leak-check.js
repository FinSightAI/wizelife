#!/usr/bin/env node
// Hebrew-leak detector across all WizeLife + sub-app public pages.
// For each URL, switches to EN / PT / ES and asserts the visible body
// contains no Hebrew characters. Logs every leaking string so we can
// add translations.
// Run: node qa/i18n-leak-check.js
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');
const fs = require('fs');

const URLS = [
    'https://wizelife.ai/',
    'https://wizelife.ai/auth.html',
    'https://wizelife.ai/about.html',
    'https://wizelife.ai/dashboard.html',
    'https://wizelife.ai/security.html',
    'https://wizelife.ai/terms.html',
    'https://wizelife.ai/privacy.html',
    'https://wizelife.ai/feedback.html',
    'https://wizelife.ai/wize-ai.html',
    'https://wizelife.ai/travel.html',
    'https://wizelife.ai/tax-compare.html',
    'https://wizelife.ai/health.html',
    'https://money.wizelife.ai/',
    'https://tax.wizelife.ai/',
    'https://deal.wizelife.ai/',
    'https://travel.wizelife.ai/',
    'https://health.wizelife.ai/',
];

const { step, warn, finalize } = makeReporter('I18n-Leak');

const HEBREW_CHAR = /[֐-׿]/;
// Strings allowed to remain Hebrew even in EN mode (intentional bilingual
// citations — Hebrew law names, brand names that include Hebrew chars, etc.)
const ALLOW = [
    /חוק הגנת הפרטיות/,         // Israeli privacy law citation
    /רשות ני"ע/,                 // Securities Authority abbr
    /יועץ השקעות מורשה/,        // License title cited in English
    /התשמ"א-1981/,              // Year citation
    /WizeLife|WizeMoney|WizeTax|WizeHealth|WizeTravel|WizeDeal|WizeAI/, // Brand
];
function isAllowed(s) { return ALLOW.some(re => re.test(s)); }

async function scanPage(page, url, lang) {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    // Set localStorage + reload so the page picks up the lang on init
    await page.evaluate((l) => localStorage.setItem('wl_lang', l), lang);
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500); // allow applyLang + wl-text-i18n to run

    const leaks = await page.evaluate(() => {
        const HE = /[֐-׿]/;
        const found = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(n) {
                const p = n.parentNode;
                if (!p) return NodeFilter.FILTER_REJECT;
                const tn = p.tagName;
                if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD'].includes(tn)) return NodeFilter.FILTER_REJECT;
                // Skip hidden elements (immediate style…)
                const cs = getComputedStyle(p);
                if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return NodeFilter.FILTER_REJECT;
                // …and skip text whose ANCESTOR is hidden (a display:none ancestor
                // leaves the child with display:block but no rendered box). Without
                // this, hidden/dead DOM (e.g. a disabled onboarding overlay) leaks
                // as a false positive even though users never see it.
                if (typeof p.getClientRects === 'function' && p.getClientRects().length === 0) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            },
        });
        let n;
        while ((n = walker.nextNode())) {
            const t = n.nodeValue.trim();
            if (t.length < 2) continue;
            if (HE.test(t)) found.push(t.slice(0, 120));
        }
        // De-dup
        return [...new Set(found)];
    });
    return leaks.filter(s => !isAllowed(s));
}

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const allLeaks = {};

    for (const url of URLS) {
        for (const lang of ['en', 'pt', 'es']) {
            await step(`${url} [${lang.toUpperCase()}] — no Hebrew leaks`, async () => {
                let leaks;
                try { leaks = await scanPage(page, url, lang); } catch (e) {
                    throw new Error(`page load failed: ${e.message.slice(0, 100)}`);
                }
                if (leaks.length) {
                    allLeaks[`${url} [${lang}]`] = leaks;
                    throw new Error(`${leaks.length} Hebrew strings leaked (first 3: ${leaks.slice(0, 3).map(s => `"${s.slice(0, 40)}"`).join(', ')})`);
                }
            });
        }
    }

    await browser.close();

    // Write detailed leak report
    const lines = ['# 🌍 Hebrew leak report', ''];
    if (Object.keys(allLeaks).length) {
        lines.push(`**${Object.keys(allLeaks).length} URL+lang combinations have leaks.**`);
        lines.push('');
        for (const k of Object.keys(allLeaks)) {
            lines.push(`## ${k}`);
            allLeaks[k].slice(0, 20).forEach(s => lines.push(`- \`${s}\``));
            if (allLeaks[k].length > 20) lines.push(`- _... + ${allLeaks[k].length - 20} more_`);
            lines.push('');
        }
    } else {
        lines.push('✅ **No Hebrew leaks anywhere.**');
    }
    fs.writeFileSync('i18n-leak-report.md', lines.join('\n'));
    finalize('i18n-leak-summary.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
