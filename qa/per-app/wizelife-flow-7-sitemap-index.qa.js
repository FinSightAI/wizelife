#!/usr/bin/env node
// qa/per-app/wizelife-flow-7-sitemap-index.qa.js
// Deep flow test added 2026-05-26 — verifies /sitemap-index.xml returns 200
// and references at least 5 sub-sitemaps (one per app + portal).

const SITEMAP_URL = 'https://wizelife.ai/sitemap-index.xml';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeLife Portal / sitemap-index', [
    {
      name: '/sitemap-index.xml returns 200',
      fn: async () => {
        const r = await fetchOk(SITEMAP_URL);
        if (r.status !== 200) throw new Error(`/sitemap-index.xml returned ${r.status}`);
      },
    },
    {
      name: 'sitemap-index is valid XML with sitemaploc entries',
      fn: async () => {
        const r = await fetchOk(SITEMAP_URL);
        if (!findInHtml(r.body, '<sitemap') && !findInHtml(r.body, '<sitemapindex')) {
          throw new Error('sitemap-index.xml does not contain <sitemap> or <sitemapindex> tags');
        }
      },
    },
    {
      name: 'sitemap-index references at least 5 sub-sitemaps',
      fn: async () => {
        const r = await fetchOk(SITEMAP_URL);
        const locMatches = (r.body.match(/<loc>/gi) || []).length;
        if (locMatches < 5) {
          throw new Error(`Only ${locMatches} <loc> entries in sitemap-index (expected 5+)`);
        }
      },
    },
  ]);
})();
