// Cloudflare WAF-skip header for QA browsers.
//
// When QA_WAF_BYPASS is set, every Playwright context this helper patches sends
// `X-QA-Bypass: <token>` — but ONLY on requests to the app's own *.wizelife.ai
// hosts. It must NOT be attached to third-party subresources (gstatic Firebase
// SDK, Google Fonts, Cloud Functions, etc.): a custom header on a cross-origin
// request turns it into a non-simple CORS request, the third party doesn't list
// the header in Access-Control-Allow-Headers, and the browser hard-fails it
// (net::ERR_FAILED) — which silently breaks Firebase auth in headless CI.
//
// Pair it with a Cloudflare rule on the wizelife.ai zone that skips the bot
// challenge when this header+token is present. No-op when QA_WAF_BYPASS is unset.
const WAF_BYPASS_HEADER = 'x-qa-bypass';
const APP_HOST_RE = /(^|\.)wizelife\.ai$/i; // app's own zone only

function patchBrowser(browser) {
    const token = process.env.QA_WAF_BYPASS;
    if (!browser || !token) return browser;
    const orig = browser.newContext.bind(browser);
    browser.newContext = async (opts = {}) => {
        const ctx = await orig(opts);
        await ctx.route('**/*', async (route) => {
            const req = route.request();
            let sameZone = false;
            try { sameZone = APP_HOST_RE.test(new URL(req.url()).hostname); } catch { /* ignore */ }
            if (sameZone) {
                await route.continue({ headers: { ...req.headers(), [WAF_BYPASS_HEADER]: token } });
            } else {
                await route.continue();
            }
        });
        return ctx;
    };
    return browser;
}

module.exports = { patchBrowser, WAF_BYPASS_HEADER };
