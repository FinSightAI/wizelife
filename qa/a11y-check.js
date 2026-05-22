#!/usr/bin/env node
// Accessibility audit — heuristic without axe-core dependency.
// Checks: image alt text, button aria-label, form input labels,
// heading hierarchy (no skipped levels), lang attr set, sufficient
// color contrast (computed) for body text.
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const URLS = [
    'https://wizelife.ai/', 'https://wizelife.ai/auth.html', 'https://wizelife.ai/about.html',
    'https://wizelife.ai/dashboard.html', 'https://wizelife.ai/feedback.html',
    'https://money.wizelife.ai/', 'https://tax.wizelife.ai/', 'https://deal.wizelife.ai/',
    'https://travel.wizelife.ai/', 'https://health.wizelife.ai/',
];

const { step, warn, finalize } = makeReporter('A11y');

async function audit(page) {
    return await page.evaluate(() => {
        const issues = [];
        // 1. Images need alt
        const imgsNoAlt = Array.from(document.querySelectorAll('img:not([alt])'));
        if (imgsNoAlt.length) issues.push(`${imgsNoAlt.length} images missing alt`);
        // 2. Buttons without text or aria-label
        const blindBtns = Array.from(document.querySelectorAll('button, [role=button]')).filter(b => {
            const txt = (b.textContent || '').trim();
            const al = (b.getAttribute('aria-label') || '').trim();
            return !txt && !al;
        });
        if (blindBtns.length) issues.push(`${blindBtns.length} buttons without text or aria-label`);
        // 3. Form inputs without labels
        const orphan = Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button])')).filter(i => {
            if (i.getAttribute('aria-label')) return false;
            const id = i.id;
            if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return false;
            if (i.closest('label')) return false;
            return true;
        });
        if (orphan.length) issues.push(`${orphan.length} inputs without label/aria-label`);
        // 4. lang attribute
        if (!document.documentElement.lang) issues.push('html missing lang attribute');
        // 5. Heading hierarchy
        const hs = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => parseInt(h.tagName.slice(1)));
        let skips = 0;
        for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i-1] > 1) skips++;
        if (skips) issues.push(`${skips} heading-level skip(s) (e.g. h1 → h3)`);
        // 6. Color contrast: sample 5 visible text elements
        const sample = Array.from(document.querySelectorAll('p, span, div, a')).slice(0, 50)
            .filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 4 && r.height > 4 && (el.textContent || '').trim().length > 5;
            }).slice(0, 5);
        function rgbLum(rgb) {
            const m = (rgb || '').match(/(\d+)/g) || [0, 0, 0];
            const [r, g, b] = m.map(v => {
                const c = parseInt(v) / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
        let lowContrast = 0;
        sample.forEach(el => {
            const cs = getComputedStyle(el);
            const fg = rgbLum(cs.color);
            // Walk up to find non-transparent bg
            let bg = 'rgb(255,255,255)';
            let cur = el;
            while (cur && cur !== document.body) {
                const b = getComputedStyle(cur).backgroundColor;
                if (b && !/rgba\(0,\s*0,\s*0,\s*0\)|transparent/.test(b)) { bg = b; break; }
                cur = cur.parentElement;
            }
            const bgL = rgbLum(bg);
            const ratio = (Math.max(fg, bgL) + 0.05) / (Math.min(fg, bgL) + 0.05);
            if (ratio < 4.5) lowContrast++;
        });
        if (lowContrast > 2) issues.push(`${lowContrast}/${sample.length} sampled elements low contrast (<4.5:1)`);
        return issues;
    });
}

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    for (const url of URLS) {
        await step(`${url} — a11y heuristic`, async () => {
            try { await page.goto(url, { timeout: 45000 }); } catch (e) { throw new Error('page load failed: ' + e.message.slice(0, 80)); }
            await page.waitForTimeout(2000);
            const issues = await audit(page);
            if (issues.length > 2) throw new Error(`${issues.length} a11y issues: ${issues.slice(0, 4).join(' | ')}`);
            if (issues.length === 1 || issues.length === 2) warn(`${issues.length} a11y nits`, issues.join('; '));
        });
    }
    await browser.close();
    finalize('a11y-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
