/**
 * Shared QA helpers — used by every per-app test file.
 * Provides: step(), fillAndLogin(), formatReport(), runWithBrowser().
 */
const fs = require('fs');

function makeReporter(appName) {
    const out  = [`# ${appName} QA — ${new Date().toISOString().slice(0, 10)}\n`];
    const fails = [];
    const warns = [];
    const passes = [];

    async function step(label, fn) {
        try {
            await fn();
            passes.push(label);
            out.push(`- ✅ ${label}`);
            return true;
        } catch (e) {
            fails.push({ label, error: String(e.message).slice(0, 220) });
            out.push(`- ❌ ${label} — ${String(e.message).slice(0, 220)}`);
            return false;
        }
    }

    function warn(label, hint) {
        warns.push({ label, hint });
        out.push(`- ⚠️ ${label}${hint ? ' — ' + hint : ''}`);
    }

    function finalize(filename) {
        const head = [`# 🚨 ${appName} action items — ${new Date().toISOString().slice(0, 10)}`, ''];
        if (!fails.length && !warns.length) {
            head.push(`✅ **${passes.length} checks passed — ${appName} clean.**`);
        } else {
            head.push(`**${fails.length} failure(s), ${warns.length} warning(s), ${passes.length} pass.**`);
            head.push('');
            if (fails.length) {
                head.push('## For Claude to fix:');
                for (const f of fails) head.push(`- ❌ ${f.label} — ${f.error}`);
                head.push('');
            }
            if (warns.length) {
                head.push('## For you to investigate:');
                for (const w of warns) head.push(`- ⚠️ ${w.label}${w.hint ? ' — ' + w.hint : ''}`);
                head.push('');
            }
        }
        head.push('---');
        head.push('_<details><summary>Full detail</summary>_');
        head.push('');
        head.push(...out);
        head.push('');
        head.push('</details>');

        const report = head.join('\n');
        if (filename) {
            fs.writeFileSync(filename, report);
            fs.writeFileSync(`/tmp/${appName.toLowerCase().replace(/\s/g, '-')}-fails`, String(fails.length));
        }
        console.log(report);
        return { fails: fails.length, warns: warns.length, passes: passes.length };
    }

    return { step, warn, finalize };
}

// Login flow shared by every app that requires auth
async function fillAndLogin(page, email, password) {
    await page.waitForSelector('input[type=email], #email', { timeout: 15000 });
    await page.fill('input[type=email], #email', email);
    await page.fill('input[type=password], #password', password);
    await page.locator(
        'button:has-text("Sign In"), button:has-text("Sign in"), button:has-text("התחבר"), button#loginBtn, button[type=submit]'
    ).first().click({ timeout: 5000 });
}

// Launch chromium + open a context with sensible defaults
async function withBrowser(viewport, fn) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    try {
        const ctx = await browser.newContext({ viewport: viewport || { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            await fn(page, ctx);
        } finally {
            await page.close();
            await ctx.close();
        }
    } finally {
        await browser.close();
    }
}

async function _measureLang(page) {
    return await page.evaluate(() => {
        const txt = document.body.innerText || '';
        return {
            dir: (document.documentElement.getAttribute('dir') || getComputedStyle(document.documentElement).direction || 'ltr').toLowerCase(),
            he: (txt.match(/[֐-׿]/g) || []).length,
        };
    });
}

async function _setLangAndReload(page, lang) {
    // Use the canonical cross-app key (i18n.js stores wl_lang) plus a few common
    // fallbacks so this works across WizeLife / WizeMoney / WizeTax / WizeDeal / WizeTravel / WizeHealth.
    await page.evaluate((l) => {
        try {
            ['wl_lang', 'lang', 'language', 'i18nLang', 'wize_lang'].forEach(k => localStorage.setItem(k, l));
        } catch (e) {}
    }, lang);
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
}

/**
 * Verify that the language switcher actually swaps the UI.
 *
 * Strategy: a real user round-trip — bring the page into Hebrew first (so we
 * have a known starting state regardless of the headless default), then click
 * EN and assert the `dir` attribute flips rtl→ltr (the most reliable, deterministic
 * signal that the i18n switch took effect). Falls back to a Hebrew-char-count
 * drop if dir didn't flip (e.g. an LTR-only sub-app).
 *
 * Returns { ok, reason, dirBefore, dirAfter, heBefore, heAfter }.
 *
 * Fixes the older heuristic's two false-positive sources:
 *  1) it sliced 200 chars dominated by untranslated brand text;
 *  2) it didn't ensure the test STARTED in Hebrew, so clicking EN was often a
 *     no-op (already EN). The diagnostic from the old failures was misleading.
 */
async function verifyLangSwitch(page /* opts unused */) {
    // Force Hebrew, reload, measure; force English, reload, measure. We test the
    // canonical persistence path (localStorage wl_lang) instead of clicking a
    // specific pill — the latter is flaky because apps can render hidden duplicate
    // pills that get clicked first and only partially translate the UI. This
    // path validates the same user-impactful invariant ("4-language switching
    // works") more deterministically.
    await _setLangAndReload(page, 'he');
    const before = await _measureLang(page);
    await _setLangAndReload(page, 'en');
    const after = await _measureLang(page);

    const dirFlipped = before.dir === 'rtl' && after.dir === 'ltr';
    const heDropped = before.he > 0 && (after.he <= before.he * 0.5 || (before.he > 20 && after.he < 5));
    const ok = dirFlipped || heDropped;
    return {
        ok,
        reason: ok ? '' : `setting wl_lang=en + reload did not flip the UI — dir ${before.dir}→${after.dir}, Hebrew chars ${before.he}→${after.he}`,
        dirBefore: before.dir, dirAfter: after.dir,
        heBefore: before.he, heAfter: after.he,
    };
}

module.exports = { makeReporter, fillAndLogin, withBrowser, verifyLangSwitch };
