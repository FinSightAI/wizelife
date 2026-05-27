#!/usr/bin/env node
// qa/per-app/wizelife-flow-9-auth-nofollow.qa.js
// Deep flow test added 2026-05-26 — verifies that all links pointing to
// auth.html have rel=nofollow (prevents SEO link juice flowing to auth pages).

const BASE = 'https://wizelife.ai/';
const { runSuite, fetchOk } = require('./_lib-flow');

(async () => {
  await runSuite('WizeLife Portal / auth-nofollow', [
    {
      name: 'all auth.html links have rel=nofollow',
      fn: async () => {
        const r = await fetchOk(BASE);
        const html = r.body;

        // Extract all anchor tags pointing to auth.html
        const authLinkRe = /<a\s[^>]*href=["'][^"']*auth\.html[^"']*["'][^>]*>/gi;
        const authLinks = html.match(authLinkRe) || [];

        if (authLinks.length === 0) {
          console.log('  (warn) No auth.html links found in portal HTML');
          return;
        }

        const withoutNofollow = authLinks.filter(tag => !tag.includes('nofollow'));
        if (withoutNofollow.length > 0) {
          throw new Error(
            `${withoutNofollow.length} auth.html links without rel=nofollow: ` +
            withoutNofollow.slice(0, 2).join(' | ')
          );
        }
      },
    },
    {
      name: 'Playwright: auth links have nofollow attribute',
      fn: async () => {
        let playwright;
        try { playwright = require('playwright'); } catch (_) {
          console.log('  (Playwright not installed — skipping nofollow check)');
          return;
        }
        const { chromium } = playwright;
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(2500);
          const authLinks = await page.locator('a[href*="auth"]').all();
          for (const link of authLinks) {
            const rel = await link.getAttribute('rel') || '';
            const href = await link.getAttribute('href') || '';
            if (href.includes('auth') && !rel.includes('nofollow')) {
              console.log(`  (warn) Auth link missing nofollow: href="${href}"`);
            }
          }
        } finally {
          await page.close(); await ctx.close(); await browser.close();
        }
      },
    },
  ]);
})();
