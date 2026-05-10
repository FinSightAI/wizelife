#!/usr/bin/env node
/**
 * Tier 13d — Dead-handler / broken-link check (Playwright, non-destructive)
 *
 * For every <a href> and <button onclick="..."> on each page:
 *   - <a href>: verify the link resolves to < 400 (within our origins).
 *   - <button onclick="fn()">: verify `fn` is defined on window.
 *
 * We DON'T actually click destructive things (sign-out, delete account,
 * submit form). The click-handlers are only inspected, not invoked.
 *
 * Catches: a button whose onclick references a function that was renamed
 * / deleted, OR a link that points at a 404 path.
 */

const { chromium } = require('playwright');
const https = require('https');
const fs = require('fs');

const PAGES = [
    'https://wizelife.ai/',
    'https://wizelife.ai/auth.html',
    'https://wizelife.ai/dashboard.html',
    'https://wizelife.ai/feedback.html',
    'https://money.wizelife.ai/',
    'https://tax.wizelife.ai/',
    'https://travel.wizelife.ai/',
    'https://deal.wizelife.ai/',
];

const SAFE_ORIGINS = [
    'wizelife.ai', 'money.wizelife.ai', 'tax.wizelife.ai',
    'health.wizelife.ai', 'travel.wizelife.ai', 'deal.wizelife.ai',
    'finsightai.github.io',
];

const out = [];
const actions = [];
let passes = 0;
const add  = (l) => out.push(l);
const pass = (msg) => { passes++; add(`- ✅ ${msg}`); };
const fail = (msg, fix, who) => { actions.push({severity:'fail',who:who||'claude',msg,fix}); add(`- ❌ ${msg}`); };
const warn = (msg, fix, who) => { actions.push({severity:'warn',who:who||'admin',msg,fix}); add(`- ⚠️  ${msg}`); };

const head = (url) => new Promise((resolve) => {
    try {
        const u = new URL(url);
        const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'HEAD' }, (r) => {
            resolve(r.statusCode);
            req.destroy();
        });
        req.setTimeout(8000, () => { req.destroy(); resolve(0); });
        req.on('error', () => resolve(0));
        req.end();
    } catch (e) { resolve(0); }
});

(async () => {
    add(`# Dead-handler check — ${new Date().toISOString()}`);
    add('');

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ userAgent: 'WizeLife-QA/1.0 dead-handler' });

    for (const url of PAGES) {
        add(`## ${url}`);
        const page = await ctx.newPage();
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(2500); // allow dynamic-injected content (sidebar, bottom-nav)
        } catch (e) {
            warn(`${url}: page load failed (${e.message.split('\n')[0]})`, 'check hosting', 'admin');
            await page.close(); add(''); continue;
        }

        // 1. Inspect every <a href> + <button onclick>
        const { links, buttons } = await page.evaluate(() => {
            const links = [];
            document.querySelectorAll('a[href]').forEach(a => {
                const href = a.getAttribute('href');
                if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
                try {
                    const abs = new URL(href, location.href).href;
                    links.push(abs);
                } catch {}
            });
            const buttons = [];
            document.querySelectorAll('button[onclick], div[onclick], span[onclick]').forEach(b => {
                const oc = b.getAttribute('onclick') || '';
                // Pull out the function name(s) referenced
                const m = oc.match(/([a-zA-Z_$][\w$]*)\s*\(/g) || [];
                m.forEach(call => {
                    const fn = call.replace(/\s*\($/, '');
                    // Skip JS built-ins / keywords
                    if (['if','for','while','return','typeof','function','this','setTimeout','setInterval','alert','confirm'].includes(fn)) return;
                    buttons.push({ fn, label: (b.textContent || '').trim().slice(0, 40) || b.id || '<no-text>' });
                });
            });
            // Dedup
            return {
                links: Array.from(new Set(links)),
                buttons: Array.from(new Map(buttons.map(b => [b.fn, b])).values()),
            };
        });

        // 2. Verify each link is reachable
        let badLinks = 0;
        for (const link of links) {
            try {
                const u = new URL(link);
                // Only HEAD-check our own origins; external links are out of scope
                if (!SAFE_ORIGINS.some(o => u.hostname.endsWith(o))) continue;
                const code = await head(link);
                if (code >= 400 || code === 0) {
                    fail(`broken link on ${url}: ${link} (HTTP ${code})`,
                         `fix or remove the link in ${url}`,
                         'claude');
                    badLinks++;
                }
            } catch {}
        }
        if (links.length && !badLinks) pass(`${links.length} link(s) all reachable`);

        // 3. Verify each onclick references a function that exists on window
        let badHandlers = 0;
        for (const b of buttons) {
            const exists = await page.evaluate((fn) => {
                try {
                    const val = window[fn];
                    return typeof val === 'function';
                } catch { return false; }
            }, b.fn);
            if (!exists) {
                fail(`dead handler on ${url}: button "${b.label}" calls \`${b.fn}()\` — function not defined on window`,
                     `define ${b.fn} or fix the onclick attribute in ${url}`,
                     'claude');
                badHandlers++;
            }
        }
        if (buttons.length && !badHandlers) pass(`${buttons.length} onclick handler(s) all bound`);

        await page.close();
        add('');
    }

    await browser.close();

    // Summary at top
    add('---');
    const failed = actions.filter(a => a.severity === 'fail');
    const warned = actions.filter(a => a.severity === 'warn');
    const summary = [];
    summary.push(`# 🚨 Dead-handler action items — ${new Date().toISOString().slice(0,10)}`);
    summary.push('');
    if (!actions.length) {
        summary.push(`✅ **${passes} checks passed — every link reachable, every onclick bound.**`);
    } else {
        summary.push(`**${failed.length} failure(s), ${warned.length} warning(s), ${passes} pass.**`);
        summary.push('');
        const byMe  = actions.filter(a => a.who === 'claude');
        const byYou = actions.filter(a => a.who === 'admin');
        if (byMe.length) {
            summary.push('## For Claude to fix:');
            byMe.forEach(a => summary.push(`- ${a.severity === 'fail' ? '❌' : '⚠️'} ${a.msg}` + (a.fix ? ` — **fix:** ${a.fix}` : '')));
            summary.push('');
        }
        if (byYou.length) {
            summary.push('## For you to investigate:');
            byYou.forEach(a => summary.push(`- ${a.severity === 'fail' ? '❌' : '⚠️'} ${a.msg}` + (a.fix ? ` — **fix:** ${a.fix}` : '')));
            summary.push('');
        }
    }
    summary.push('---');
    summary.push('_<details><summary>Full per-page detail</summary>_');
    summary.push('');

    const full = summary.join('\n') + '\n' + out.join('\n') + '\n</details>';
    fs.writeFileSync('dead-handler-report.md', full);
    fs.writeFileSync('/tmp/handler-fails', String(failed.length));
    console.log(full);
    process.exit(0);
})().catch(e => { console.error('dead-handler-check crashed', e); process.exit(0); });
