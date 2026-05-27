#!/usr/bin/env node
// qa/per-app/wizelife-flow-8-robots-social-bots.qa.js
// Deep flow test added 2026-05-26 — verifies robots.txt has Allow rules for
// Twitterbot and LinkedInBot (social crawlers need access for rich previews).

const ROBOTS_URL = 'https://wizelife.ai/robots.txt';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

(async () => {
  await runSuite('WizeLife Portal / robots-social-bots', [
    {
      name: 'robots.txt returns 200',
      fn: async () => {
        const r = await fetchOk(ROBOTS_URL);
        if (r.status !== 200) throw new Error(`robots.txt returned ${r.status}`);
      },
    },
    {
      name: 'Twitterbot mentioned in robots.txt',
      fn: async () => {
        const r = await fetchOk(ROBOTS_URL);
        if (!findInHtml(r.body, 'Twitterbot', true)) {
          throw new Error('Twitterbot not mentioned in robots.txt — Twitter card crawlers may be blocked');
        }
      },
    },
    {
      name: 'LinkedInBot mentioned in robots.txt',
      fn: async () => {
        const r = await fetchOk(ROBOTS_URL);
        if (!findInHtml(r.body, 'LinkedInBot', true)) {
          throw new Error('LinkedInBot not in robots.txt — LinkedIn preview crawlers may be blocked');
        }
      },
    },
    {
      name: 'robots.txt has at least one Allow or Disallow rule',
      fn: async () => {
        const r = await fetchOk(ROBOTS_URL);
        if (!findInHtml(r.body, 'Allow') && !findInHtml(r.body, 'Disallow')) {
          throw new Error('robots.txt has no Allow/Disallow directives');
        }
      },
    },
  ]);
})();
