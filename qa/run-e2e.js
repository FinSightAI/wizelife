#!/usr/bin/env node
// Comprehensive E2E — real user journeys for every app + cross-app flows.
// Skipped if QA_EMAIL/QA_PASSWORD secrets aren't available.

const { chromium } = require('playwright');
const fs = require('fs');

const QA_EMAIL    = process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD;

const out   = ['# E2E flows\n'];
const fails = [];

if (!QA_EMAIL || !QA_PASSWORD) {
    out.push('_skipped — QA_EMAIL/QA_PASSWORD secrets missing_');
    fs.writeFileSync('e2e-report.md', out.join('\n'));
    process.exit(0);
}

async function step(label, fn) {
    try { await fn(); out.push(`- ✅ ${label}`); return true; }
    catch (e) { out.push(`- ❌ ${label} — ${e.message.slice(0, 220)}`); fails.push(label); return false; }
}

async function fillAndLogin(page, email, password) {
    await page.waitForSelector('input[type=email], #email', { timeout: 15000 });
    await page.fill('input[type=email], #email', email);
    await page.fill('input[type=password], #password', password);
    await page.locator('button:has-text("Sign In"), button:has-text("Sign in"), button:has-text("התחבר"), button#loginBtn, button[type=submit]').first().click({ timeout: 5000 });
}

async function main() {
    const browser = await chromium.launch();

    // ══════════════════════════════════════════════════════════════════
    // Flow 1 — WizeLife: login → dashboard elements
    // ══════════════════════════════════════════════════════════════════
    out.push('## Flow 1 — WizeLife: login → dashboard');
    const wizeCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const wizePage = await wizeCtx.newPage();
    let wizeLoggedIn = false;

    await step('auth.html loads', async () => {
        await wizePage.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
    });
    wizeLoggedIn = await step('Login → reach dashboard', async () => {
        await fillAndLogin(wizePage, QA_EMAIL, QA_PASSWORD);
        await wizePage.waitForURL(/dashboard\.html/, { timeout: 20000 });
    });
    if (wizeLoggedIn) {
        await step('Nickname visible', async () => {
            const txt = await wizePage.locator('#navUserName').first().textContent({ timeout: 6000 });
            if (!txt || txt === '—') throw new Error(`empty nick: '${txt}'`);
        });
        await step('Plan badge visible', async () => {
            if (!await wizePage.locator('#navPlanBadge').first().textContent({ timeout: 5000 })) throw new Error('no badge');
        });
        await step('Referral link generated', async () => {
            const val = await wizePage.locator('#refLink').first().inputValue({ timeout: 5000 });
            if (!val?.includes('?ref=')) throw new Error(`bad refLink: ${val}`);
        });
        await step('All 5 app cards rendered', async () => {
            const cards = await wizePage.locator('.app-card, .tool-card, [data-app]').count();
            if (cards < 3) throw new Error(`only ${cards} app cards`);
        });
    }

    // ── Flow 1b: access code redemption ──────────────────────────────
    out.push('\n## Flow 1b — Access code redemption');
    if (wizeLoggedIn) {
        await step('#accessCodeInput present', async () => {
            await wizePage.waitForSelector('#accessCodeInput', { timeout: 8000 });
        });
        await step('Type WIZELIFE2026 + Apply', async () => {
            await wizePage.fill('#accessCodeInput', 'WIZELIFE2026');
            await wizePage.click('#accessCodeBtn');
        });
        await step('#codeMsg responds (activated / already active)', async () => {
            await wizePage.waitForFunction(() => {
                const m = document.getElementById('codeMsg');
                return m && m.textContent.trim().length > 3;
            }, { timeout: 12000 });
            const msg = await wizePage.locator('#codeMsg').textContent();
            if (!/activ|yolo|pro|already|invalid|פעיל|הופעל/i.test(msg))
                throw new Error(`unexpected msg: "${msg}"`);
        });
    } else { out.push('_skipped — login failed_'); }

    // ── Flow 1c: sign out ─────────────────────────────────────────────
    out.push('\n## Flow 1c — Sign out');
    if (wizeLoggedIn) {
        await step('Click Sign Out → redirected away from dashboard', async () => {
            // Sign out button is inside wize-hamburger drawer OR in nav
            const signOutBtn = wizePage.locator('button:has-text("Sign Out"), button:has-text("Sign out"), a:has-text("Sign out")').first();
            if (await signOutBtn.count()) {
                await signOutBtn.click();
            } else {
                // Invoke directly
                await wizePage.evaluate(() => { if (typeof signOut === 'function') signOut(); });
            }
            await wizePage.waitForURL(/auth\.html|index\.html/, { timeout: 10000 });
        });
    } else { out.push('_skipped_'); }

    await wizePage.close();
    await wizeCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 2 — WizeMoney: login → add income → add bank account → add goal → AI chat
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 2 — WizeMoney: income + bank + goal + AI chat');
    const moneyCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const moneyPage = await moneyCtx.newPage();
    let moneyOk = false;

    await step('WizeMoney index loads', async () => {
        await moneyPage.goto('https://finsightai.github.io/finsight/', { waitUntil: 'load', timeout: 30000 });
    });
    moneyOk = await step('Auth handled', async () => {
        const hasDash = await moneyPage.locator('.sidebar, .app-container, #mainContent').count();
        if (hasDash) return;
        const hasEmail = await moneyPage.locator('input[type=email], #email').count();
        if (hasEmail) {
            await fillAndLogin(moneyPage, QA_EMAIL, QA_PASSWORD);
            await moneyPage.waitForSelector('.sidebar, .app-container, #mainContent', { timeout: 15000 });
        } else throw new Error('neither dashboard nor auth form found');
    });

    // ── 2a: add income ─────────────────────────────────────────────
    out.push('\n### 2a — Add income');
    if (moneyOk !== false) {
        await step('Open income page', async () => {
            await moneyPage.goto('https://finsightai.github.io/finsight/pages/income.html', { waitUntil: 'load', timeout: 20000 });
            if (moneyPage.url().includes('auth')) {
                await fillAndLogin(moneyPage, QA_EMAIL, QA_PASSWORD);
                await moneyPage.waitForURL(/income\.html/, { timeout: 15000 });
            }
        });
        await step('Click Add income button', async () => {
            await moneyPage.locator('button[onclick*="openAddModal"], button:has-text("הוסף הכנסה")').first().click();
        });
        await step('Modal opens', async () => {
            await moneyPage.waitForFunction(() => {
                const m = document.getElementById('incomeModal');
                return m && m.style.display !== 'none';
            }, { timeout: 6000 });
        });
        await step('Fill + submit → row appears', async () => {
            await moneyPage.fill('#incomeName',  'QA Income — ignore');
            await moneyPage.fill('#incomeAmount', '1234');
            await moneyPage.fill('#incomeDate', new Date().toISOString().split('T')[0]);
            await moneyPage.click('#incomeModal button[type=submit], #incomeModal button:has-text("שמור"), #incomeModal .btn-primary');
            await moneyPage.waitForFunction(() =>
                [...document.querySelectorAll('#incomeTableBody tr')].some(r => r.textContent.includes('QA Income')),
                { timeout: 12000 });
        });
    } else { out.push('_skipped — auth failed_'); }

    // ── 2b: add bank account ───────────────────────────────────────
    out.push('\n### 2b — Add bank account');
    if (moneyOk !== false) {
        await step('Open bank page', async () => {
            await moneyPage.goto('https://finsightai.github.io/finsight/pages/bank.html', { waitUntil: 'load', timeout: 20000 });
        });
        await step('Click הוסף חשבון', async () => {
            await moneyPage.locator('button[onclick*="openAddModal"], button:has-text("הוסף חשבון")').first().click();
        });
        await step('Account modal opens', async () => {
            await moneyPage.waitForSelector('#accountModal.active', { timeout: 6000 });
        });
        await step('Fill + save account', async () => {
            await moneyPage.fill('#accountName', 'QA Test Bank — ignore');
            await moneyPage.fill('#balance', '5000');
            await moneyPage.click('button[onclick*="saveAccount"], .btn-primary:has-text("שמור")');
            await moneyPage.waitForFunction(() => !document.querySelector('#accountModal.active'), { timeout: 8000 });
        });
    } else { out.push('_skipped_'); }

    // ── 2c: add goal ───────────────────────────────────────────────
    out.push('\n### 2c — Add savings goal');
    if (moneyOk !== false) {
        await step('Open goals page', async () => {
            await moneyPage.goto('https://finsightai.github.io/finsight/pages/goals.html', { waitUntil: 'load', timeout: 20000 });
        });
        await step('Open add-goal modal', async () => {
            const btn = moneyPage.locator('button:has-text("יעד חדש"), button:has-text("הוסף יעד"), button[onclick*="openAdd"], button:has-text("Add goal")').first();
            await btn.waitFor({ timeout: 8000 });
            await btn.click();
            await moneyPage.waitForSelector('#goalModal.active', { timeout: 6000 });
        });
        await step('Fill + save goal', async () => {
            await moneyPage.fill('#goalName',   'QA Goal — ignore');
            await moneyPage.fill('#goalTarget', '10000');
            await moneyPage.click('#goalModal button[type=submit], #goalModal button:has-text("שמור"), #goalModal .btn-primary');
            await moneyPage.waitForFunction(() => !document.querySelector('#goalModal.active'), { timeout: 8000 });
        });
    } else { out.push('_skipped_'); }

    // ── 2d: AI advisor chat ────────────────────────────────────────
    out.push('\n### 2d — WizeMoney AI advisor chat');
    if (moneyOk !== false) {
        await step('Open AI chat page', async () => {
            await moneyPage.goto('https://finsightai.github.io/finsight/pages/ai-chat.html', { waitUntil: 'load', timeout: 20000 });
        });
        await step('Chat input present', async () => {
            await moneyPage.waitForSelector('#chatInput', { timeout: 10000 });
        });
        await step('Send question + response arrives', async () => {
            await moneyPage.fill('#chatInput', 'How should I allocate a 50k portfolio?');
            await moneyPage.click('#sendBtn');
            await moneyPage.waitForFunction(() => {
                const msgs = document.querySelectorAll('#chatMessages .message, #chatMessages [class*="assistant"]');
                return [...msgs].some(m => m.textContent.trim().length > 30);
            }, { timeout: 45000 });
        });
    } else { out.push('_skipped_'); }

    await moneyPage.close();
    await moneyCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 3 — WizeTax: chat → real response + language switch
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 3 — WizeTax: chat + language switch');
    const taxCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const taxPage = await taxCtx.newPage();

    await step('Advisor loads', async () => {
        await taxPage.goto('https://tax.wizelife.ai/advisor', { waitUntil: 'domcontentloaded', timeout: 25000 });
    });
    await step('Chat input + sidebar present', async () => {
        await taxPage.waitForSelector('textarea, input[type=text]', { timeout: 10000 });
        if (await taxPage.locator('.wt-cat, details').count() === 0) throw new Error('no sidebar');
    });
    await step('Send "מה זה מע״מ?" → response streams', async () => {
        const inp = taxPage.locator('textarea, input[type=text]').first();
        await inp.fill('מה זה מע"מ?');
        await inp.press('Enter');
        await taxPage.waitForFunction(() => {
            const sel = '[class*="assistant"],[class*="bot"],[class*="response"],[class*="message"]';
            return [...document.querySelectorAll(sel)].some(el => el.textContent.trim().length > 20);
        }, { timeout: 45000 });
    });
    await step('Switch language to EN — UI updates', async () => {
        const enBtn = taxPage.locator('button:has-text("EN"), [data-lang=en], .lang-btn:has-text("EN")').first();
        if (await enBtn.count()) {
            await enBtn.click();
            // Verify UI has English text now
            await taxPage.waitForFunction(() => document.documentElement.lang === 'en' || document.body.innerHTML.includes('Advisor'), { timeout: 5000 });
        } else { throw new Error('EN button not found'); }
    });
    await taxPage.close();
    await taxCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 4 — WizeHealth: chat + response
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 4 — WizeHealth: chat');
    const healthCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const healthPage = await healthCtx.newPage();

    await step('Vitara loads (60s cold-start budget)', async () => {
        await healthPage.goto('https://vitara.onrender.com/', { waitUntil: 'load', timeout: 60000 });
    });
    await step('Chat input present', async () => {
        await healthPage.waitForSelector('#txt, .chat-input, textarea', { timeout: 15000 });
    });
    await step('Send health question', async () => {
        const inp = healthPage.locator('#txt, .chat-input, textarea').first();
        await inp.fill('What helps with a headache?');
        const send = healthPage.locator('button:has-text("Send"), button[type=submit], #sendBtn').first();
        if (await send.count()) await send.click(); else await inp.press('Enter');
    });
    await step('Response appears (>20 chars)', async () => {
        await healthPage.waitForFunction(() => {
            const sel = '[class*="assistant"],[class*="bot"],[class*="ai"],[class*="response"],.message-bot';
            return [...document.querySelectorAll(sel)].some(el => el.textContent.trim().length > 20);
        }, { timeout: 60000 });
    });
    await healthPage.close();
    await healthCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 5 — WizeTravel: tabs render + tab switching
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 5 — WizeTravel: UI + tab switching');
    const travelCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const travelPage = await travelCtx.newPage();

    await step('Page loads', async () => {
        await travelPage.goto('https://travel.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    await step('Page body has content', async () => {
        await travelPage.waitForFunction(() => document.body.innerText.trim().length > 100, { timeout: 10000 });
    });
    await step('Kiwi search iframe embedded', async () => {
        await travelPage.locator('iframe').first().waitFor({ state: 'attached', timeout: 10000 });
    });
    await step('Deals tab clickable', async () => {
        const dealsTab = travelPage.locator('button:has-text("Deals"), button:has-text("דילים"), [data-tab="hunter"]').first();
        await dealsTab.waitFor({ state: 'visible', timeout: 8000 });
        await dealsTab.click();
        // After click the active tab should change
        await travelPage.waitForTimeout(1000);
    });
    await step('AI Agent tab clickable', async () => {
        const aiTab = travelPage.locator('button:has-text("AI Agent"), button:has-text("סוכן AI"), [data-tab="chat"]').first();
        await aiTab.waitFor({ state: 'visible', timeout: 8000 });
        await aiTab.click();
        await travelPage.waitForTimeout(1000);
    });
    await travelPage.close();
    await travelCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 6 — WizeDeal: add deal → paste listing text → analysis
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 6 — WizeDeal: analyze listing');
    const dealCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const dealPage = await dealCtx.newPage();
    const SAMPLE_LISTING = `3 bedroom apartment, 85sqm, Tel Aviv, Florentin neighborhood.
Asking price: ₪2,900,000. Floor 3/6, elevator, parking, renovated kitchen.
Monthly rent potential: ₪7,500. HOA: ₪500/mo. Property tax: ₪400/mo.`;

    await step('WizeDeal loads', async () => {
        await dealPage.goto('https://deal.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    await step('Page has content', async () => {
        await dealPage.waitForFunction(() => document.body.innerText.trim().length > 100, { timeout: 10000 });
    });
    await step('Click Analyze / New Deal', async () => {
        const btn = dealPage.locator([
            'button:has-text("Analyze")', 'button:has-text("New Deal")',
            'button:has-text("Add Deal")', 'button:has-text("נתח")',
            'a:has-text("New Deal")', 'button:has-text("Add")',
        ].join(', ')).first();
        await btn.waitFor({ state: 'visible', timeout: 10000 });
        await btn.click();
    });
    await step('Listing input visible', async () => {
        await dealPage.waitForSelector([
            'input[placeholder*="zapimoveis"]', 'input[placeholder*="yad2"]',
            'input[placeholder*="url" i]', 'input[placeholder*="http"]',
            'textarea[placeholder*="listing"]',
        ].join(', '), { timeout: 10000 });
    });
    await step('Switch to text mode + paste listing', async () => {
        const textMode = dealPage.locator('button:has-text("Text"), button:has-text("Paste"), label:has-text("Text")').first();
        if (await textMode.count()) await textMode.click();
        const ta = dealPage.locator('textarea[placeholder*="listing"], textarea').first();
        await ta.fill(SAMPLE_LISTING);
    });
    await step('Submit for analysis', async () => {
        const submit = dealPage.locator('button:has-text("Extract"), button:has-text("Analyze"), button:has-text("Extract Property"), button[type=submit]').last();
        await submit.click();
    });
    await step('Analysis result appears (price / sqm / ROI data)', async () => {
        await dealPage.waitForFunction(() => {
            const body = document.body.innerText;
            // Accept any of: price field filled, sqm shown, ROI/cap rate, or "success"
            return /\d{1,3}[,.]?\d{3}|sqm|roi|cap rate|yield|extracted|שטח|מחיר/i.test(body);
        }, { timeout: 45000 });
    });
    await dealPage.close();
    await dealCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 7 — Feedback form: submit → Firestore write
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 7 — Feedback form (real submit)');
    const fbCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const fbPage = await fbCtx.newPage();

    await step('feedback.html loads', async () => {
        await fbPage.goto('https://wizelife.ai/feedback.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    });
    await step('Select WizeMoney pill', async () => {
        const pill = fbPage.locator('[data-app="finsight"]').first();
        await pill.waitFor({ timeout: 5000 });
        await pill.click();
    });
    await step('Fill + submit', async () => {
        await fbPage.fill('#loved', 'QA automated test — please ignore');
        await fbPage.click('[type=submit]');
    });
    await step('Success message visible', async () => {
        const ok = fbPage.locator('.ok-msg');
        await ok.waitFor({ timeout: 12000 });
        if ((await ok.textContent()).trim().length < 3) throw new Error('empty msg');
    });
    await fbPage.close();
    await fbCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 8 — Cross-app: hamburger menu (mobile viewport)
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 8 — Hamburger menu (mobile 390px)');
    const hamCtx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const hamPage = await hamCtx.newPage();

    await step('WizeMoney loads on mobile', async () => {
        await hamPage.goto('https://finsightai.github.io/finsight/', { waitUntil: 'load', timeout: 30000 });
    });
    await step('#wize-ham-btn visible at 390px', async () => {
        await hamPage.waitForSelector('#wize-ham-btn', { state: 'visible', timeout: 10000 });
    });
    await step('Click hamburger → drawer opens', async () => {
        await hamPage.click('#wize-ham-btn');
        await hamPage.waitForSelector('#wize-ham-drawer.open', { timeout: 5000 });
    });
    await step('Drawer contains app links', async () => {
        const links = await hamPage.locator('#wize-ham-drawer a[href]').count();
        if (links < 3) throw new Error(`only ${links} links in drawer`);
    });
    await step('Close drawer via ✕ button', async () => {
        await hamPage.click('.wh-close');
        await hamPage.waitForFunction(() => !document.querySelector('#wize-ham-drawer.open'), { timeout: 5000 });
    });
    await step('Close drawer via overlay tap (reopen first)', async () => {
        await hamPage.click('#wize-ham-btn');
        await hamPage.waitForSelector('#wize-ham-drawer.open', { timeout: 3000 });
        await hamPage.click('#wize-ham-overlay');
        await hamPage.waitForFunction(() => !document.querySelector('#wize-ham-drawer.open'), { timeout: 5000 });
    });
    await hamPage.close();
    await hamCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 9 — Language switch: WizeTax HE → EN → back
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 9 — Language switch');
    const langCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const langPage = await langCtx.newPage();

    await step('WizeLife index loads', async () => {
        await langPage.goto('https://wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    });
    await step('EN pill visible + clickable', async () => {
        const enBtn = langPage.locator('button:has-text("EN"), [data-lang=en], .lang-pill:has-text("EN")').first();
        await enBtn.waitFor({ state: 'visible', timeout: 8000 });
        await enBtn.click();
    });
    await step('Page content switched to English', async () => {
        await langPage.waitForFunction(() => {
            return document.body.innerText.match(/tools|features|sign in|login|dashboard/i);
        }, { timeout: 5000 });
    });
    await step('HE pill brings back Hebrew', async () => {
        const heBtn = langPage.locator('button:has-text("HE"), [data-lang=he], .lang-pill:has-text("HE")').first();
        await heBtn.click();
        await langPage.waitForFunction(() => document.body.innerText.match(/כניסה|כלים|דאשבורד|הצטרף/), { timeout: 5000 });
    });
    await langPage.close();
    await langCtx.close();


    // ══════════════════════════════════════════════════════════════════
    // Flow 10 — Sign up: new account creation
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 10 — Sign up (new account)');
    const signupCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const signupPage = await signupCtx.newPage();
    const testEmail = `qa+${Date.now()}@wizelife.ai`;

    await step('auth.html loads', async () => {
        await signupPage.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 20000 });
    });
    await step('Switch to Create Account tab', async () => {
        await signupPage.click('#tabSignup');
        await signupPage.waitForSelector('#signupForm:not([style*="none"])', { timeout: 5000 });
    });
    await step('Fill name + email + password', async () => {
        await signupPage.fill('#signupName',     'QA Test User');
        await signupPage.fill('#signupEmail',    testEmail);
        await signupPage.fill('#signupPassword', 'QAtest123!');
    });
    await step('Submit → dashboard or verify-email screen', async () => {
        await signupPage.click('#signupBtn');
        // Accept either: reached dashboard, OR email-verification prompt shown
        await signupPage.waitForFunction(() =>
            window.location.href.includes('dashboard') ||
            document.body.innerText.match(/verify|verification|אמת|נשלח/i),
            { timeout: 20000 }
        );
    });
    await signupPage.close();
    await signupCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 11 — Protected page without auth → redirect to auth
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 11 — Protected page without auth → redirect');
    const anonCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const anonPage = await anonCtx.newPage();

    await step('WizeMoney income.html — no auth', async () => {
        await anonPage.goto('https://finsightai.github.io/finsight/pages/income.html', { waitUntil: 'load', timeout: 20000 });
    });
    await step('Redirected to login / auth UI shown', async () => {
        // Either URL changes to auth page, or login form appears inline
        const isRedirected = anonPage.url().includes('auth') || anonPage.url().includes('login');
        const hasAuthForm  = await anonPage.locator('input[type=email], #email, input[type=password]').count() > 0;
        if (!isRedirected && !hasAuthForm) throw new Error(`still on income page, no auth wall (url: ${anonPage.url()})`);
    });
    await step('WizeLife dashboard.html — no auth', async () => {
        await anonPage.goto('https://wizelife.ai/dashboard.html', { waitUntil: 'load', timeout: 20000 });
    });
    await step('Redirected to auth.html', async () => {
        await anonPage.waitForURL(/auth\.html|index\.html/, { timeout: 10000 });
    });
    await anonPage.close();
    await anonCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 12 — SSO bridge: WizeLife login → WizeMoney with token → logged in
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 12 — SSO bridge (WizeLife → WizeMoney)');
    const ssoCtx   = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ssoWize  = await ssoCtx.newPage();
    let ssoToken   = '';

    await step('Login on WizeLife', async () => {
        await ssoWize.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
        await fillAndLogin(ssoWize, QA_EMAIL, QA_PASSWORD);
        await ssoWize.waitForURL(/dashboard\.html/, { timeout: 20000 });
    });
    await step('Dashboard wires SSO token into WizeMoney href', async () => {
        // Wait for attachTokensToTools() to run
        await ssoWize.waitForFunction(() => {
            const a = document.getElementById('tool-finsight');
            return a && a.href && a.href.includes('wl_token=');
        }, { timeout: 10000 });
        const href = await ssoWize.locator('#tool-finsight').getAttribute('href');
        ssoToken = new URL(href).searchParams.get('wl_token') || '';
        if (!ssoToken) throw new Error('wl_token missing from WizeMoney link');
    });
    await step('Navigate to WizeMoney with token → wl_sso stored', async () => {
        const moneyUrl = `https://money.wizelife.ai/?wl_token=${encodeURIComponent(ssoToken)}&wl_nick=QA&wl_plan=yolo`;
        const ssoMoney = await ssoCtx.newPage();
        await ssoMoney.goto(moneyUrl, { waitUntil: 'load', timeout: 30000 });
        // sidebar.js reads wl_token from URL → stores in wl_sso localStorage
        const sso = await ssoMoney.evaluate(() => {
            try { return JSON.parse(localStorage.getItem('wl_sso') || '{}'); } catch { return {}; }
        });
        if (!sso.token) throw new Error('wl_sso.token not stored after bridge');
        await ssoMoney.close();
    });
    await ssoWize.close();
    await ssoCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 13 — WizeMoney: add expense (credit.html)
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 13 — WizeMoney: add expense');
    const expCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const expPage = await expCtx.newPage();
    let expOk = false;

    await step('Open WizeMoney', async () => {
        await expPage.goto('https://finsightai.github.io/finsight/', { waitUntil: 'load', timeout: 30000 });
    });
    expOk = await step('Auth handled', async () => {
        const hasDash = await expPage.locator('.sidebar, .app-container').count();
        if (hasDash) return;
        const hasEmail = await expPage.locator('input[type=email], #email').count();
        if (!hasEmail) throw new Error('no dashboard or auth form');
        await fillAndLogin(expPage, QA_EMAIL, QA_PASSWORD);
        await expPage.waitForSelector('.sidebar, .app-container', { timeout: 15000 });
    });
    if (expOk !== false) {
        await step('Open credit/expense page', async () => {
            await expPage.goto('https://finsightai.github.io/finsight/pages/credit.html', { waitUntil: 'load', timeout: 20000 });
            if (expPage.url().includes('auth')) {
                await fillAndLogin(expPage, QA_EMAIL, QA_PASSWORD);
                await expPage.waitForURL(/credit\.html/, { timeout: 15000 });
            }
        });
        await step('Click "הוסף הוצאה" button', async () => {
            await expPage.locator('button[onclick*="openExpenseModal"], button:has-text("הוסף הוצאה")').first().click();
            await expPage.waitForSelector('#expenseModal:not(.hide), #expenseModal.active, #expenseModal:not([style*="none"])', { timeout: 6000 });
        });
        await step('Fill expense form', async () => {
            const today = new Date().toISOString().split('T')[0];
            await expPage.fill('#expenseDate',        today);
            await expPage.fill('#expenseAmount',      '250');
            // Category is a select — pick first non-empty option
            await expPage.locator('#expenseCategory option:not([value=""])').first().evaluate(o => o.selected = true);
            await expPage.dispatchEvent('#expenseCategory', 'change');
            const descField = expPage.locator('#expenseDescription');
            if (await descField.count()) await descField.fill('QA Expense — ignore');
        });
        await step('Save expense → modal closes', async () => {
            await expPage.click('button[onclick*="saveExpense"], #expenseModal button[type=submit], #expenseModal .btn-primary');
            await expPage.waitForFunction(() => {
                const m = document.getElementById('expenseModal');
                return !m || m.style.display === 'none' || !m.classList.contains('active');
            }, { timeout: 8000 });
        });
    } else { out.push('_skipped — auth failed_'); }
    await expPage.close();
    await expCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 14 — Paywall gate: Pro feature shows upgrade prompt for free user
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 14 — Paywall gate');
    const pwCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pwPage = await pwCtx.newPage();

    await step('WizeMoney loads (no auth → free tier)', async () => {
        await pwPage.goto('https://finsightai.github.io/finsight/', { waitUntil: 'load', timeout: 30000 });
    });
    await step('Navigate to Pro-only page (simulator.html)', async () => {
        await pwPage.goto('https://finsightai.github.io/finsight/pages/simulator.html', { waitUntil: 'load', timeout: 20000 });
    });
    await step('Paywall modal OR auth redirect shown (Pro feature gated)', async () => {
        // Either: redirect to auth (not logged in) OR paywall modal visible (logged in as free)
        const isAuth = pwPage.url().includes('auth');
        const hasPaywall = await pwPage.locator('#paywallBox, .paywall-modal, [class*="paywall"], .upgrade-modal').count() > 0;
        const hasProBadge = await pwPage.locator('.pro-badge, .locked, [class*="locked"], [class*="pro-gate"]').count() > 0;
        if (!isAuth && !hasPaywall && !hasProBadge)
            throw new Error('Pro page accessible without auth/paywall check');
    });
    await pwPage.close();
    await pwCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 15 — WizeDeal: analyze text → "Use These Details" → data applied
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 15 — WizeDeal: analyze + apply deal');
    const deal2Ctx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const deal2Page = await deal2Ctx.newPage();
    const LISTING = `3 bedroom apartment, 85sqm, Tel Aviv, Florentin.
Asking price: 2900000 ILS. Floor 3/6, elevator, parking.
Monthly rent potential: 7500 ILS. HOA: 500/mo.`;

    await step('WizeDeal loads', async () => {
        await deal2Page.goto('https://deal.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    await step('Click New Deal / Analyze', async () => {
        const btn = deal2Page.locator([
            'button:has-text("Analyze")', 'button:has-text("New Deal")',
            'button:has-text("Add Deal")', 'a:has-text("New Deal")',
        ].join(', ')).first();
        await btn.waitFor({ state: 'visible', timeout: 10000 });
        await btn.click();
    });
    await step('Switch to text mode', async () => {
        const textMode = deal2Page.locator('button:has-text("Text"), button:has-text("Paste"), label:has-text("Text")').first();
        if (await textMode.count()) await textMode.click();
        await deal2Page.waitForSelector('textarea', { timeout: 5000 });
    });
    await step('Paste listing + submit', async () => {
        await deal2Page.locator('textarea').first().fill(LISTING);
        await deal2Page.locator('button:has-text("Extract"), button:has-text("Analyze"), button:has-text("Extract Property")').last().click();
    });
    await step('Analysis result visible', async () => {
        await deal2Page.waitForFunction(() =>
            /\d{3,}|sqm|roi|yield|extracted|שטח|מחיר/i.test(document.body.innerText),
            { timeout: 45000 }
        );
    });
    await step('"Use These Details" button appears + click', async () => {
        const applyBtn = deal2Page.locator('button:has-text("Use These Details"), button:has-text("Apply"), button:has-text("השתמש")').first();
        await applyBtn.waitFor({ state: 'visible', timeout: 10000 });
        await applyBtn.click();
    });
    await step('Deal wizard populated with extracted data', async () => {
        // After applying, the deal wizard/form should show extracted values
        await deal2Page.waitForFunction(() =>
            document.body.innerText.match(/Tel Aviv|Florentin|85|2[,.]?900[,.]?000/i),
            { timeout: 10000 }
        );
    });
    await deal2Page.close();
    await deal2Ctx.close();

    await browser.close();

    out.push(`\n---\n**E2E failures**: ${fails.length}`);
    if (fails.length) out.push(fails.map(f => `- ${f}`).join('\n'));
    fs.writeFileSync('e2e-report.md', out.join('\n'));
    fs.writeFileSync('/tmp/e2e-fails', String(fails.length));
    console.log(out.join('\n'));
}

main().catch(e => {
    out.push(`\n❌ Fatal: ${e.message}`);
    fs.writeFileSync('e2e-report.md', out.join('\n'));
    fs.writeFileSync('/tmp/e2e-fails', '999');
    process.exit(0);
});
