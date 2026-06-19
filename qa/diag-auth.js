// CI diagnostic for the E2E login blocker.
const { chromium } = require('playwright');
const { patchBrowser } = require('./waf-bypass');

(async () => {
    const b = await chromium.launch();
    patchBrowser(b);
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    const errs = [];
    const failed = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
    p.on('requestfailed', r => failed.push(`${r.url().slice(0, 90)} :: ${r.failure() && r.failure().errorText}`));

    let status = 0;
    try {
        const r = await p.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
        status = r ? r.status() : 0;
    } catch (e) { console.log('GOTO_THREW:', e.message); }
    await p.waitForTimeout(5000);

    const fb = await p.evaluate(() => ({
        hasEmail: !!document.querySelector('input[type=email], #email'),
        firebase: typeof window.firebase,
        firebaseAuth: !!(window.firebase && window.firebase.auth),
        apps: (window.firebase && window.firebase.apps) ? window.firebase.apps.length : 'n/a',
    })).catch(e => ({ err: String(e) }));

    // try the actual form login, then let redirects fully settle and report ground truth
    let loginResult = 'not-attempted';
    try {
        await p.fill('input[type=email], #email', process.env.QA_EMAIL || '');
        await p.fill('input[type=password], #password', process.env.QA_PASSWORD || '');
        await p.locator('button:has-text("Sign In"), button#loginBtn, button[type=submit]').first().click({ timeout: 5000 });
        await p.waitForURL(/dashboard\.html/, { timeout: 22000 });
        loginResult = 'waitForURL SUCCESS';
    } catch (e) {
        loginResult = 'waitForURL FAILED: ' + e.message.slice(0, 70);
    }
    // settle, then report ground truth: where did we end up + is the user actually signed in?
    await p.waitForTimeout(8000);
    const after = await p.evaluate(() => ({
        url: location.href,
        uid: (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) ? window.firebase.auth().currentUser.uid : null,
    })).catch(e => ({ url: 'eval-failed', uid: 'err' }));
    console.log('FINAL_URL:', after.url);
    console.log('CURRENT_USER_UID:', after.uid || '(null — not signed in)');
    // any auth error shown on the page?
    const authErr = await p.evaluate(() => {
        const e = document.querySelector('.error, .alert, [role=alert], #authError, .auth-error');
        return e && e.offsetParent !== null ? e.textContent.trim().slice(0, 120) : '';
    }).catch(() => '');

    console.log('========== DIAG ==========');
    console.log('HTTP_STATUS:', status);
    console.log('HAS_EMAIL_INPUT:', fb.hasEmail);
    console.log('FIREBASE_TYPE:', fb.firebase, '| auth:', fb.firebaseAuth, '| apps:', fb.apps);
    console.log('LOGIN_RESULT:', loginResult);
    console.log('PAGE_AUTH_ERROR:', authErr || '(none)');
    console.log('FAILED_REQUESTS:');
    failed.slice(0, 12).forEach(f => console.log('   ✗', f));
    console.log('CONSOLE_ERRS:', errs.slice(0, 6).join(' || ') || '(none)');
    console.log('==========================');
    await b.close();
})();
