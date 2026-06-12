// WizeLife Portal audit — pass 1: every page, console errors, failed requests, text leaks
const { chromium, webkit } = require('playwright');

const BASE = 'https://wizelife.ai';
const PAGES = [
  '/', '/auth.html', '/dashboard.html', '/about.html', '/feedback.html',
  '/privacy.html', '/terms.html', '/security.html', '/account.html',
  '/apps.html', '/web-apps.html', '/wize-ai.html', '/tax-compare.html',
  '/status.html', '/health.html', '/travel.html', '/wizetravel.html',
  '/funnel.html', '/404.html',
  '/p/salary-compare.html', '/p/relocate-portugal.html', '/p/digital-nomad.html',
  '/p/relocate-spain.html', '/p/relocate-romania.html', '/p/relocate-bulgaria.html',
];

const IGNORE_REQ = [/cloudflareinsights/, /google-analytics/, /clarity/, /favicon/, /doubleclick/];

(async () => {
  for (const engineName of ['chromium']) {
    const browser = await (engineName === 'chromium' ? chromium : webkit).launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    for (const path of PAGES) {
      const page = await ctx.newPage();
      const consoleErrs = [];
      const failedReqs = [];
      page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 300)); });
      page.on('response', r => {
        const s = r.status();
        if (s >= 400 && !IGNORE_REQ.some(re => re.test(r.url()))) failedReqs.push(`${s} ${r.url().slice(0, 160)}`);
      });
      page.on('requestfailed', r => {
        if (!IGNORE_REQ.some(re => re.test(r.url()))) failedReqs.push(`FAIL ${r.failure()?.errorText} ${r.url().slice(0, 140)}`);
      });
      let finalUrl = '', leaks = [], title = '';
      try {
        await page.goto(BASE + path, { waitUntil: 'load', timeout: 45000 });
        await page.waitForTimeout(3500);
        finalUrl = page.url();
        title = await page.title();
        leaks = await page.evaluate(() => {
          const bad = [];
          const txt = document.body ? document.body.innerText : '';
          for (const pat of [/\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /\{\{[a-zA-Z_.]+\}\}/]) {
            const m = txt.match(pat);
            if (m) {
              const i = txt.indexOf(m[0]);
              bad.push(JSON.stringify(txt.slice(Math.max(0, i - 60), i + 60)));
            }
          }
          return bad;
        }).catch(e => [`EVAL_ERR ${e.message.slice(0,80)}`]);
      } catch (e) {
        console.log(`\n=== ${path} [${engineName}] NAVIGATION ERROR: ${e.message.slice(0, 200)}`);
        await page.close(); continue;
      }
      const redirected = finalUrl !== BASE + path && !(path === '/' && finalUrl === BASE + '/');
      console.log(`\n=== ${path} [${engineName}] title="${title}"${redirected ? ' -> ' + finalUrl : ''}`);
      consoleErrs.slice(0, 6).forEach(e => console.log('  CONSOLE_ERR:', e));
      failedReqs.slice(0, 6).forEach(e => console.log('  REQ_FAIL:', e));
      leaks.forEach(l => console.log('  TEXT_LEAK:', l));
      await page.close();
    }
    await browser.close();
  }
})();
