#!/usr/bin/env node
// Sign up a test account with deep debug logging
const { chromium } = require('playwright');

const email    = process.argv[2];
const password = process.argv[3];
const nick     = (process.argv[4] || 'QATester').slice(0, 40);

if (!email || !password) {
    console.error('Usage: node signup-test-account.js <email> <password> [nickname]');
    process.exit(1);
}

(async () => {
    const browser = await chromium.launch({ headless: false });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    // Capture console + page errors
    const errors = [];
    page.on('console', m => {
        if (m.type() === 'error' || m.type() === 'warning') {
            errors.push(`[${m.type()}] ${m.text()}`);
        }
    });
    page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));

    console.log(`Opening wizelife.ai/auth.html…`);
    await page.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('Clicking #tabSignup…');
    await page.click('#tabSignup');
    await page.waitForTimeout(1000);

    console.log(`Filling form…`);
    await page.fill('#signupName',     nick);
    await page.fill('#signupEmail',    email);
    await page.fill('#signupPassword', password);
    await page.waitForTimeout(500);

    // Check fields are filled
    const filled = await page.evaluate(() => ({
        name:  document.getElementById('signupName').value,
        email: document.getElementById('signupEmail').value,
        pwd:   document.getElementById('signupPassword').value,
    }));
    console.log('Filled values:', JSON.stringify(filled));

    console.log('Clicking #signupBtn…');
    await page.click('#signupBtn');

    // Wait longer + check both URL change AND error message
    for (let i = 0; i < 40; i++) {  // 40 × 1s = 40s
        await page.waitForTimeout(1000);
        const url = page.url();
        const err = await page.locator('#signupError').textContent().catch(() => '');
        if (url.includes('dashboard.html')) {
            console.log(`\n✅ SUCCESS — dashboard reached after ${i+1}s`);
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${password}`);
            break;
        }
        if (err && err.trim().length > 5) {
            console.log(`\n❌ Error visible after ${i+1}s: "${err.trim()}"`);
            break;
        }
        if (i === 39) {
            console.log(`\n❌ Timeout after 40s — no dashboard + no error.`);
            console.log(`   Final URL: ${url}`);
        }
    }

    console.log('\n=== CONSOLE LOGS ===');
    errors.forEach(e => console.log('  ' + e.substring(0, 250)));

    console.log('\nBrowser stays 30s — inspect manually');
    await new Promise(r => setTimeout(r, 30000));
    await browser.close();
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
