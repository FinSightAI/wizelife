// One-off CI diagnostic: what does the headless browser actually get for
// wizelife.ai/auth.html? Tells us if it's a Cloudflare interstitial, a blank
// page, or the form-is-there-but-the-selector-is-wrong.
const { chromium } = require('playwright');
const { patchBrowser } = require('./waf-bypass');

(async () => {
    const b = await chromium.launch();
    patchBrowser(b);
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });

    let status = 0;
    try {
        const r = await p.goto('https://wizelife.ai/auth.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
        status = r ? r.status() : 0;
    } catch (e) { console.log('GOTO_THREW:', e.message); }
    await p.waitForTimeout(4000);

    const info = await p.evaluate(() => ({
        title: document.title,
        url: location.href,
        hasEmail: !!document.querySelector('input[type=email], #email'),
        bodyLen: document.body ? document.body.innerText.length : 0,
        body: (document.body ? document.body.innerText : '').slice(0, 280).replace(/\s+/g, ' '),
        html: document.documentElement.outerHTML.slice(0, 500).replace(/\s+/g, ' '),
    })).catch(e => ({ err: String(e) }));

    console.log('========== DIAG ==========');
    console.log('WAF_HEADER_SET:', !!process.env.QA_WAF_BYPASS);
    console.log('HTTP_STATUS:', status);
    console.log('TITLE:', info.title);
    console.log('URL:', info.url);
    console.log('HAS_EMAIL_INPUT:', info.hasEmail);
    console.log('BODY_LEN:', info.bodyLen);
    console.log('BODY_SNIPPET:', info.body);
    console.log('HTML_SNIPPET:', info.html);
    console.log('CONSOLE_ERRS:', errs.join(' || ') || '(none)');
    console.log('==========================');
    await b.close();
})();
