#!/usr/bin/env node
// Log into an existing test account on wizelife.ai
// Usage: node qa/login-test-account.js <email> <password>
const { chromium } = require('playwright');

const email    = process.argv[2];
const password = process.argv[3];
if (!email || !password) { console.error('Usage: node qa/login-test-account.js <email> <password>'); process.exit(1); }

(async () => {
    const browser = await chromium.launch({ headless: false });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));

    console.log('1. goto auth.html');
    await page.goto('https://wizelife.ai/auth.html?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);

    console.log('2. fill login (Sign In is the default tab)');
    await page.fill('#loginEmail',    email);
    await page.fill('#loginPassword', password);
    await page.screenshot({ path: '/tmp/login-filled.png' });

    console.log('3. submit');
    await page.click('#loginBtn');
    await page.waitForTimeout(2000);

    let ok = false;
    try {
        await page.waitForURL(/dashboard\.html/, { timeout: 20000 });
        ok = true;
    } catch (e) {}
    await page.screenshot({ path: '/tmp/login-after.png' });

    const errText = await page.evaluate(() => {
        const e = document.getElementById('loginError');
        return { msg: e ? e.textContent.trim() : null, visible: e ? getComputedStyle(e).display !== 'none' : false, url: location.href };
    });

    if (ok) {
        console.log('✅ LOGIN SUCCESS — at dashboard');
        console.log('   email:    ' + email);
        console.log('   password: ' + '*'.repeat(Math.min(password.length, 12)) + ' (' + password.length + ' chars)');
    } else {
        console.log('❌ LOGIN FAILED');
        console.log('   error on page: ' + (errText.msg || '(none shown)'));
        console.log('   final URL: ' + errText.url);
    }
    if (errors.length) { console.log('---'); errors.forEach(e => console.log('   ' + e)); }

    await new Promise(r => setTimeout(r, 8000));
    await browser.close();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
