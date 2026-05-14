#!/usr/bin/env node
// Deep-debug signup: runs the full flow + captures screenshot + error text at every step.
// Usage: node qa/signup-debug-deep.js <email> <password> [nickname]
const { chromium } = require('playwright');
const fs = require('fs');

const email    = process.argv[2];
const password = process.argv[3];
const nick     = (process.argv[4] || 'QATester').slice(0, 40);
if (!email || !password) { console.error('Usage: node qa/signup-debug-deep.js <email> <password> [nickname]'); process.exit(1); }

const screenshot = async (page, name) => {
    const p = `/tmp/signup-${name}.png`;
    await page.screenshot({ path: p, fullPage: false }).catch(()=>{});
    console.log(`  📸 ${p}`);
};

(async () => {
    const browser = await chromium.launch({ headless: false });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => {
        if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
    });
    page.on('pageerror', e => errors.push(`[pageerror] ${e.message}\n   stack: ${(e.stack||'').split('\n').slice(0,4).join(' | ')}`));
    page.on('requestfailed', r => errors.push(`[requestfailed] ${r.url()} -- ${r.failure()?.errorText}`));

    console.log('1. goto auth.html');
    await page.goto('https://wizelife.ai/auth.html?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);
    await screenshot(page, '1-loaded');

    console.log('2. click signup tab');
    await page.click('#tabSignup');
    await page.waitForTimeout(500);
    await screenshot(page, '2-signup-tab');

    console.log('3. fill form');
    await page.fill('#signupName', nick);
    await page.fill('#signupEmail', email);
    await page.fill('#signupPassword', password);
    await screenshot(page, '3-filled');

    // Read form values from DOM to confirm they were set
    const formState = await page.evaluate(() => ({
        name: document.getElementById('signupName')?.value || '',
        email: document.getElementById('signupEmail')?.value || '',
        password: document.getElementById('signupPassword')?.value || '',
        btnExists: !!document.getElementById('signupBtn'),
        btnDisabled: document.getElementById('signupBtn')?.disabled || false,
        firebaseAuth: typeof firebase !== 'undefined' && typeof firebase.auth === 'function',
        wlAuth: typeof wlAuth !== 'undefined',
        appCheckActive: window.__wlAppCheckActive || false,
    }));
    console.log('   form state:', JSON.stringify(formState));

    console.log('4. click submit');
    await page.click('#signupBtn');
    await page.waitForTimeout(8000);
    await screenshot(page, '4-after-submit');

    // Grab error text from #signupError + visible error on page
    const errText = await page.evaluate(() => {
        const e1 = document.getElementById('signupError');
        const e2 = document.getElementById('errorMessage');
        return {
            signupError: e1 ? e1.textContent.trim() : null,
            signupErrorVisible: e1 ? (getComputedStyle(e1).display !== 'none') : false,
            errorMessage:  e2 ? e2.textContent.trim() : null,
            url: location.href,
        };
    });
    console.log('   page state:', JSON.stringify(errText));

    console.log('5. wait 20s for redirect…');
    let redirected = false;
    try {
        await page.waitForURL(/dashboard\.html/, { timeout: 20000 });
        redirected = true;
    } catch (e) {}
    await screenshot(page, '5-final');

    console.log('\n========= CONSOLE LOGS =========');
    errors.forEach(e => console.log('   ' + e));
    console.log('========= END LOGS =========\n');

    if (redirected) {
        console.log('✅ SUCCESS — redirected to dashboard');
    } else {
        console.log('❌ FAILED — final URL: ' + page.url());
    }

    console.log('\nBrowser stays open 15s for you to inspect…');
    await new Promise(r => setTimeout(r, 15000));
    await browser.close();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
