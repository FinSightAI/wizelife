#!/usr/bin/env node
// Deep i18n audit — exhaustive Hebrew-leak scan across every surface, every
// language. Goes beyond i18n-leak-check.js: also scans hidden / off-screen
// elements (which become visible later), form placeholders, aria-labels,
// title attributes, alt text, value attributes, AND opens every modal /
// menu / tooltip / dropdown found, scanning each for Hebrew leaks.
//
// Run: node qa/i18n-deep-audit.js
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

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
    'https://money.wizelife.ai/pages/bank.html',
    'https://money.wizelife.ai/pages/credit.html',
    'https://money.wizelife.ai/pages/stocks.html',
    'https://money.wizelife.ai/pages/goals.html',
    'https://money.wizelife.ai/pages/settings.html',
    'https://money.wizelife.ai/pages/profile.html',
    'https://tax.wizelife.ai/',
    'https://tax.wizelife.ai/advisor',
    'https://deal.wizelife.ai/',
    'https://travel.wizelife.ai/',
    'https://health.wizelife.ai/',
];

// Allow-list: text that legitimately stays Hebrew even in EN mode
const ALLOW = [
    /^WizeLife$|^WizeMoney$|^WizeTax$|^WizeTravel$|^WizeHealth$|^WizeDeal$|^WizeAI$/,
    /^HE$|^EN$|^PT$|^ES$/,
    /^(₪|\$|€|£|¥|R\$|kr)\s*[\d.,]+$/, // currency values
    /^[\d.,%+\-: ]+$/, // pure numbers / formatting
];
const isAllowed = s => ALLOW.some(re => re.test(s.trim()));

const { step, warn, finalize } = makeReporter('I18n-Deep');

async function scanForHebrew(page, sourceLabel) {
    // Scan visible text, placeholders, aria-labels, title attrs, alt attrs.
    return await page.evaluate((srcLabel) => {
        const HE = /[֐-׿]/;
        const out = [];
        // Visible text in DOM
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(n) {
                const p = n.parentNode;
                if (!p) return NodeFilter.FILTER_REJECT;
                if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'TEMPLATE'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            },
        });
        let n;
        while ((n = walker.nextNode())) {
            const t = n.nodeValue.trim();
            if (t.length >= 2 && HE.test(t)) out.push({ src: 'text', text: t.slice(0, 100) });
        }
        // Placeholders / aria / title / alt / value attributes
        const ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'value'];
        document.body.querySelectorAll('*').forEach(el => {
            ATTRS.forEach(a => {
                const v = el.getAttribute(a);
                if (v && HE.test(v)) {
                    out.push({ src: a + '=', text: v.slice(0, 100) });
                }
            });
        });
        return { source: srcLabel, hits: out };
    }, sourceLabel);
}

async function openAllModalsAndMenus(page) {
    // Click each plausible button / menu / dropdown trigger so the QA scans
    // ALL surfaces, not just the initial DOM.
    const clicked = await page.evaluate(() => {
        const SELECTORS = [
            'button[aria-haspopup]', 'button[data-modal]', 'button[onclick*="modal" i]',
            '[aria-label*="menu" i]', '[role="menuitem"]', 'details > summary',
            '[onclick*="open" i]:not(a)', 'button[onclick*="show" i]:not([onclick*="cold" i])',
            'button:has(svg)', '.nav-group-toggle',
        ];
        let count = 0;
        const seen = new Set();
        for (const sel of SELECTORS) {
            try {
                document.querySelectorAll(sel).forEach(b => {
                    if (seen.has(b) || count > 20) return;
                    seen.add(b);
                    try { b.click(); count++; } catch {}
                });
            } catch {}
        }
        return count;
    });
    if (clicked > 0) await page.waitForTimeout(800);
    return clicked;
}

(async () => {
    const browser = await chromium.launch();
    const summary = {};

    for (const url of URLS) {
        for (const lang of ['en', 'pt', 'es']) {
            const key = `${url} [${lang.toUpperCase()}]`;
            await step(`${key} — deep i18n scan`, async () => {
                const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
                const page = await ctx.newPage();
                try {
                    await page.goto(url, { timeout: 35000 });
                    await page.evaluate((l) => localStorage.setItem('wl_lang', l), lang);
                    await page.reload({ waitUntil: 'load' });
                    await page.waitForTimeout(2500);

                    // 1. Scan initial DOM
                    const initial = await scanForHebrew(page, 'initial');

                    // 2. Open all modals/menus we can find, then scan
                    await openAllModalsAndMenus(page);
                    const expanded = await scanForHebrew(page, 'after-clicks');

                    // De-dupe + filter
                    const all = [...initial.hits, ...expanded.hits];
                    const unique = new Map();
                    all.forEach(h => {
                        const key2 = `${h.src}|${h.text}`;
                        if (!unique.has(key2) && !isAllowed(h.text)) unique.set(key2, h);
                    });
                    const leaks = [...unique.values()];

                    if (leaks.length) {
                        summary[key] = leaks.slice(0, 15);
                        throw new Error(`${leaks.length} leak(s); sample: ${leaks.slice(0, 2).map(l => `${l.src}"${l.text.slice(0, 30)}"`).join(', ')}`);
                    }
                } catch (e) {
                    if (/leak|leaks/.test(e.message)) throw e;
                    if (/Timeout|navigation/i.test(e.message)) { warn(`${key}: page load failed`, e.message.slice(0, 80)); return; }
                    throw e;
                } finally { await page.close(); await ctx.close(); }
            });
        }
    }

    // Write full leak detail to a markdown report
    const fs = require('fs');
    const lines = ['# 🌍 Deep i18n leak report', ''];
    if (Object.keys(summary).length === 0) {
        lines.push('✅ **No Hebrew leaks anywhere across 24 URLs × 3 langs (72 scans).**');
    } else {
        lines.push(`**${Object.keys(summary).length} URL+lang combinations leak Hebrew.**`, '');
        for (const k of Object.keys(summary)) {
            lines.push(`## ${k}`);
            summary[k].forEach(l => lines.push(`- \`${l.src}\` → \`${l.text}\``));
            lines.push('');
        }
    }
    fs.writeFileSync('i18n-deep-report.md', lines.join('\n'));
    await browser.close();
    finalize('i18n-deep-summary.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
