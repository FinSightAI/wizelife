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

module.exports = { makeReporter, fillAndLogin, withBrowser };
