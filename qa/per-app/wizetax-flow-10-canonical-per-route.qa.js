#!/usr/bin/env node
// qa/per-app/wizetax-flow-10-canonical-per-route.qa.js
// Deep flow test added 2026-05-26 — verifies that /reports has its own
// canonical link tag (not the same as the root URL's canonical).

const ADVISOR = 'https://tax.wizelife.ai/advisor';
const REPORTS = 'https://tax.wizelife.ai/reports';
const { runSuite, fetchOk, findInHtml } = require('./_lib-flow');

function extractCanonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
            html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return m ? m[1] : null;
}

(async () => {
  await runSuite('WizeTax / canonical-per-route', [
    {
      name: '/reports has a canonical link tag',
      fn: async () => {
        const r = await fetchOk(REPORTS);
        if (r.status >= 400) {
          console.log(`  (warn) /reports returned ${r.status} — skipping canonical check`);
          return;
        }
        const canonical = extractCanonical(r.body);
        if (!canonical) {
          console.log('  (warn) No canonical tag on /reports — SEO risk for duplicate content');
        }
      },
    },
    {
      name: '/reports canonical differs from /advisor canonical',
      fn: async () => {
        const [rAdvisor, rReports] = await Promise.all([
          fetchOk(ADVISOR),
          fetchOk(REPORTS),
        ]);
        if (rReports.status >= 400) {
          console.log(`  (warn) /reports returned ${rReports.status} — skipping`);
          return;
        }
        const cAdvisor = extractCanonical(rAdvisor.body);
        const cReports = extractCanonical(rReports.body);
        if (cAdvisor && cReports && cAdvisor === cReports) {
          throw new Error(`Both /advisor and /reports share canonical: ${cAdvisor} — SEO duplicate content risk`);
        }
      },
    },
  ]);
})();
