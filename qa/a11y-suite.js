#!/usr/bin/env node
// WizeLife — a11y-suite.js
// 20 accessibility checks complementing a11y-check.js & keyboard-nav-check.js:
// keyboard nav, ARIA labels, lang attr, color contrast, label/input pairing,
// skip link, reduced motion, heading hierarchy, touch targets, RTL/LTR mixing.
const { chromium } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');

const BASE = 'https://wizelife.ai';
const { step, warn, finalize } = makeReporter('A11y-Suite');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/p/salary-compare.html', extra = {}) {
    const ctx = await browser.newContext({ viewport, ...extra });
    const page = await ctx.newPage();
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        waitUntil: 'load', timeout: 30000,
    });
    await page.waitForTimeout(1500);
    return { ctx, page };
}

// Simple WCAG contrast ratio
function relLum(rgb) {
    const [r, g, b] = rgb.map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(c1, c2) {
    const l1 = relLum(c1), l2 = relLum(c2);
    const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}
function parseRgb(str) {
    const m = String(str || '').match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : null;
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. Keyboard nav — Tab cycles through chips ─────────────────────────
    await step('Tab navigation reaches country chips with visible focus', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#countriesChips .cchip', { timeout: 12000 });
            let reachedChip = false;
            for (let i = 0; i < 60; i++) {
                await page.keyboard.press('Tab');
                const onChip = await page.evaluate(() => {
                    const a = document.activeElement;
                    return a && a.classList && a.classList.contains('cchip');
                });
                if (onChip) { reachedChip = true; break; }
            }
            if (!reachedChip) warn('Tab did not reach a country chip in 60 presses', 'chips may not be focusable');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. Focus ring visible (outline OR box-shadow) on focused chip ─────
    await step('Focused element has visible outline/box-shadow (not none/0)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#countriesChips .cchip', { timeout: 12000 });
            const focusStyle = await page.evaluate(() => {
                const el = document.querySelector('#countriesChips .cchip');
                if (!el) return null;
                el.focus();
                const cs = getComputedStyle(el);
                return { outline: cs.outline, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow };
            });
            if (!focusStyle) throw new Error('No chip to focus');
            const hasOutline = focusStyle.outline && !/none/.test(focusStyle.outline) && focusStyle.outlineWidth !== '0px';
            const hasShadow = focusStyle.boxShadow && focusStyle.boxShadow !== 'none';
            if (!hasOutline && !hasShadow) warn('No visible focus indicator on chip', JSON.stringify(focusStyle));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. ARIA labels on icon-only buttons ────────────────────────────────
    await step('Icon-only buttons have aria-label OR aria-labelledby', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const bad = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                return btns
                    .filter(b => {
                        const text = (b.textContent || '').trim();
                        // "icon-only" = empty text OR single emoji/symbol
                        return text.length <= 2 && !b.getAttribute('aria-label') && !b.getAttribute('aria-labelledby');
                    })
                    .map(b => ({ text: (b.textContent || '').trim(), cls: b.className, id: b.id }))
                    .slice(0, 5);
            });
            if (bad.length) warn(`${bad.length} icon-only buttons lack aria-label`, JSON.stringify(bad[0]));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. <html lang> matches document content ────────────────────────────
    await step('<html lang> attribute is set to one of he/en/pt/es', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const lang = await page.evaluate(() => document.documentElement.lang || '');
            if (!lang) throw new Error('<html> has no lang attribute');
            if (!/^(he|en|pt|es)/i.test(lang)) warn(`Unexpected lang: ${lang}`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. Switching lang updates <html lang> ──────────────────────────────
    await step('Switching to EN updates <html lang>', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#langSwitch button', { timeout: 10000 });
            const before = await page.evaluate(() => document.documentElement.lang);
            const enBtn = page.locator('#langSwitch button[data-l="en"]').first();
            if (await enBtn.count() === 0) { warn('No EN pill', ''); return; }
            await enBtn.click();
            await page.waitForTimeout(800);
            const after = await page.evaluate(() => document.documentElement.lang);
            if (after === before) warn(`<html lang> did not change after EN click (${before} → ${after})`, '');
            if (after && !/en/i.test(after) && before !== 'en') warn(`<html lang>=${after} after EN click`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 6. Color contrast — 5 sample body text elements ────────────────────
    await step('Body text contrast ≥ 4.5:1 (WCAG AA) on 5 sampled elements', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const samples = await page.evaluate(() => {
                const out = [];
                // Walk visible text nodes
                const all = Array.from(document.querySelectorAll('p, span, li, label, .net, .name, h1, h2, h3, button'));
                for (const el of all) {
                    const txt = (el.textContent || '').trim();
                    if (!txt || txt.length < 3) continue;
                    const cs = getComputedStyle(el);
                    let bg = cs.backgroundColor;
                    let parent = el;
                    while (parent && (!bg || /^rgba?\(.*0\)$/.test(bg))) {
                        parent = parent.parentElement;
                        if (!parent) break;
                        bg = getComputedStyle(parent).backgroundColor;
                    }
                    out.push({ fg: cs.color, bg: bg || 'rgb(255,255,255)', size: parseFloat(cs.fontSize), text: txt.slice(0, 40) });
                    if (out.length >= 5) break;
                }
                return out;
            });
            const lows = [];
            for (const s of samples) {
                const fg = parseRgb(s.fg), bg = parseRgb(s.bg);
                if (!fg || !bg) continue;
                const ratio = contrast(fg, bg);
                // Threshold: 3:1 for 18px+ bold or 24px+, else 4.5:1
                const large = s.size >= 24;
                const need = large ? 3 : 4.5;
                if (ratio < need) lows.push({ ratio: ratio.toFixed(2), need, text: s.text });
            }
            if (lows.length) warn(`${lows.length}/${samples.length} elements below contrast`, JSON.stringify(lows[0]));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 7. Every <input> has a label or aria-label ─────────────────────────
    await step('All visible <input> elements have label/aria-label association', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const orphans = await page.evaluate(() => {
                const ins = Array.from(document.querySelectorAll('input:not([type=hidden])'));
                return ins
                    .filter(i => {
                        if (i.getAttribute('aria-label') || i.getAttribute('aria-labelledby')) return false;
                        if (i.id && document.querySelector(`label[for="${i.id}"]`)) return false;
                        if (i.closest('label')) return false;
                        if (i.getAttribute('placeholder') && i.type === 'search') return false; // search OK
                        const r = i.getBoundingClientRect();
                        return r.width > 0 && r.height > 0;
                    })
                    .map(i => ({ id: i.id, name: i.name, type: i.type, placeholder: i.placeholder }))
                    .slice(0, 5);
            });
            if (orphans.length) warn(`${orphans.length} <input>s without label`, JSON.stringify(orphans[0]));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 8. Skip-to-content link present ────────────────────────────────────
    await step('Skip-to-content link exists OR landmark <main> present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ok = await page.evaluate(() => {
                const skip = Array.from(document.querySelectorAll('a')).some(a =>
                    /skip|דלג|saltar|pular/i.test((a.textContent || '').trim()) && a.href.includes('#'));
                const main = document.querySelector('main, [role=main]');
                return { skip, main: !!main };
            });
            if (!ok.skip && !ok.main) {
                warn('No skip link and no <main> landmark', '');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 9. Reduced-motion respected ────────────────────────────────────────
    await step('prefers-reduced-motion: page has no long animations when set', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/p/salary-compare.html',
            { reducedMotion: 'reduce' });
        try {
            const longAnims = await page.evaluate(() => {
                // Check computed animation-duration on visible elements
                const els = Array.from(document.querySelectorAll('*')).slice(0, 800);
                let bad = 0;
                for (const el of els) {
                    const cs = getComputedStyle(el);
                    const dur = cs.animationDuration;
                    if (dur && dur !== '0s' && dur !== '0ms') {
                        // parse seconds
                        const m = dur.match(/([\d.]+)(ms|s)/);
                        if (m) {
                            const ms = m[2] === 's' ? +m[1] * 1000 : +m[1];
                            if (ms > 500) bad++;
                        }
                    }
                }
                return bad;
            });
            if (longAnims > 5) warn(`${longAnims} elements have >500ms animations under reduced-motion`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 10. Exactly one <h1> per page ──────────────────────────────────────
    await step('Page has exactly one <h1>', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const count = await page.evaluate(() => document.querySelectorAll('h1').length);
            if (count === 0) throw new Error('No <h1> on page');
            if (count > 1) warn(`${count} <h1> elements (should be 1)`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 11. Heading hierarchy is monotonic (no h1 → h3 skip) ───────────────
    await step('Heading levels do not skip (no h1→h3)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const skips = await page.evaluate(() => {
                const hs = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
                    .map(h => +h.tagName.slice(1));
                const bad = [];
                for (let i = 1; i < hs.length; i++) {
                    if (hs[i] - hs[i - 1] > 1) bad.push(`h${hs[i - 1]} → h${hs[i]}`);
                }
                return bad;
            });
            if (skips.length) warn(`${skips.length} heading-level skips`, skips.slice(0, 3).join('; '));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 12. Touch targets ≥ 44px on mobile (WCAG 2.5.5) ────────────────────
    await step('Buttons ≥ 44×44 on iPhone-sized viewport', async () => {
        const { ctx, page } = await fresh(browser, { width: 390, height: 844 });
        try {
            const small = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('button, a[role=button], .cchip'))
                    .filter(b => {
                        const r = b.getBoundingClientRect();
                        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
                    })
                    .map(b => ({ tag: b.tagName, cls: b.className.slice(0, 40), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) }))
                    .slice(0, 5);
            });
            if (small.length) warn(`${small.length} touch targets < 44px`, JSON.stringify(small[0]));
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 13. RTL on Hebrew page: <html dir=rtl> ─────────────────────────────
    await step('Hebrew language sets <html dir="rtl">', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#langSwitch button[data-l="he"]', { timeout: 8000 }).catch(() => {});
            const heBtn = page.locator('#langSwitch button[data-l="he"]').first();
            if (await heBtn.count() === 0) { warn('No HE pill', ''); return; }
            await heBtn.click();
            await page.waitForTimeout(800);
            const dir = await page.evaluate(() => document.documentElement.dir);
            if (dir !== 'rtl') throw new Error(`HE page has dir="${dir}" not "rtl"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 14. RTL/LTR mixing — English brand names don't overlap Hebrew text ─
    await step('Brand names in Hebrew page do not visually overlap', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#langSwitch button[data-l="he"]', { timeout: 8000 }).catch(() => {});
            const heBtn = page.locator('#langSwitch button[data-l="he"]').first();
            if (await heBtn.count()) { await heBtn.click(); await page.waitForTimeout(800); }
            // Look for siblings whose bounding rects overlap horizontally
            const overlaps = await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('button, span, a'))
                    .filter(e => /Wize|Wizelife|FinSight|Vitara/i.test((e.textContent || '').trim()));
                let found = 0;
                for (const e of els) {
                    const r = e.getBoundingClientRect();
                    if (r.width === 0) continue;
                    const sibs = e.parentElement ? Array.from(e.parentElement.children).filter(s => s !== e) : [];
                    for (const s of sibs) {
                        const sr = s.getBoundingClientRect();
                        if (sr.width === 0) continue;
                        // Overlap = X ranges intersect AND Y ranges intersect
                        const xo = !(r.right < sr.left || sr.right < r.left);
                        const yo = !(r.bottom < sr.top || sr.bottom < r.top);
                        if (xo && yo) found++;
                    }
                }
                return found;
            });
            if (overlaps > 20) warn(`${overlaps} potential sibling overlaps in HE mode`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 15. Form fields have valid input types ─────────────────────────────
    await step('Numeric inputs use type=number or inputmode=numeric', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const gross = await page.evaluate(() => {
                const i = document.getElementById('gross');
                if (!i) return null;
                return { type: i.type, inputmode: i.getAttribute('inputmode') };
            });
            if (!gross) { warn('No #gross input', ''); return; }
            if (gross.type !== 'number' && gross.inputmode !== 'numeric' && gross.inputmode !== 'decimal') {
                warn(`#gross type=${gross.type} inputmode=${gross.inputmode}`, 'mobile keypad may not be numeric');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 16. <img> elements have alt attribute ──────────────────────────────
    await step('All <img> elements have alt attribute (may be empty)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const missing = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('img'))
                    .filter(i => !i.hasAttribute('alt'))
                    .map(i => i.src.slice(-60))
                    .slice(0, 5);
            });
            if (missing.length) warn(`${missing.length} <img> without alt attribute`, missing[0]);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 17. Buttons not just <div onclick> ─────────────────────────────────
    await step('Clickable <div>s with no role=button are minimal', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const clickyDivs = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('div[onclick], span[onclick]'))
                    .filter(d => !d.getAttribute('role'))
                    .map(d => d.outerHTML.slice(0, 80))
                    .slice(0, 5);
            });
            if (clickyDivs.length > 3) warn(`${clickyDivs.length} clickable non-button divs without role`, clickyDivs[0]);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 18. Modal trap focus — deep modal cycles focus internally ──────────
    await step('Deep modal: Tab does not escape out of modal', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#openDeepBtn', { timeout: 12000 });
            await page.click('#openDeepBtn');
            await page.waitForTimeout(700);
            // Tab 15 times; assert active element stays inside #deepModal
            for (let i = 0; i < 15; i++) {
                await page.keyboard.press('Tab');
                const inside = await page.evaluate(() => {
                    const m = document.getElementById('deepModal');
                    return m && m.contains(document.activeElement);
                });
                if (!inside) {
                    warn(`Focus escaped modal at Tab #${i + 1}`, 'consider focus trap');
                    break;
                }
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 19. ESC closes modal (a11y expectation) ────────────────────────────
    await step('Deep modal: ESC key closes it', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.waitForSelector('#openDeepBtn', { timeout: 12000 });
            await page.click('#openDeepBtn');
            await page.waitForTimeout(700);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(600);
            const open = await page.evaluate(() =>
                document.getElementById('deepModal')?.classList.contains('on'));
            if (open) warn('ESC did not close deep modal', '');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 20. Page has descriptive <title> ───────────────────────────────────
    await step('Page <title> is descriptive (≥10 chars) and not default', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const t = await page.title();
            if (!t || t.length < 10) throw new Error(`Short title: "${t}"`);
            if (/^untitled|^document$|^index$/i.test(t.trim())) throw new Error(`Generic title: "${t}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    await finalize();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
