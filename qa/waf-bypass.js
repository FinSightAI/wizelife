// Cloudflare WAF-skip header for QA browsers.
//
// When QA_WAF_BYPASS is set (CI secret), every Playwright context this helper
// patches sends `X-QA-Bypass: <token>` on all requests. Pair it with a
// Cloudflare WAF custom rule on wizelife.ai (and sub-app zones) that SKIPS
// Bot Fight Mode / JS Detections when http.request.headers["x-qa-bypass"]
// equals that same secret token — so the CI runner gets the real login form
// instead of a bot-challenge interstitial, while every real visitor stays
// fully protected (the token is secret, never shipped to the browser app).
//
// No-op when QA_WAF_BYPASS is unset (local runs, or before the WAF rule
// exists) — so this is safe to land now and "activates" the moment you add
// the matching Cloudflare rule + the QA_WAF_BYPASS secret.
const WAF_BYPASS_HEADER = 'X-QA-Bypass';

function patchBrowser(browser) {
    const token = process.env.QA_WAF_BYPASS;
    if (!browser || !token) return browser;
    const orig = browser.newContext.bind(browser);
    browser.newContext = (opts = {}) => orig({
        ...opts,
        extraHTTPHeaders: { ...(opts.extraHTTPHeaders || {}), [WAF_BYPASS_HEADER]: token },
    });
    return browser;
}

module.exports = { patchBrowser, WAF_BYPASS_HEADER };
