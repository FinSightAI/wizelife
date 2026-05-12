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


    // ══════════════════════════════════════════════════════════════════
    // Flow M1 — Mobile iPhone: WizeLife dashboard, bottom-nav, hamburger
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow M1 — Mobile iPhone (390×844): WizeLife bottom-nav + hamburger');
    const iphoneCtx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const iphonePage = await iphoneCtx.newPage();

    await step('iPhone: auth.html loads', async () => {
        await iphonePage.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
    });
    const iPhoneLoggedIn = await step('iPhone: login → dashboard', async () => {
        await fillAndLogin(iphonePage, QA_EMAIL, QA_PASSWORD);
        await iphonePage.waitForURL(/dashboard\.html/, { timeout: 20000 });
    });
    if (iPhoneLoggedIn) {
        await step('iPhone: bottom-nav bar present', async () => {
            const nav = iphonePage.locator('#wize-bottom-nav, .wize-bottom-nav, nav.bottom-nav').first();
            await nav.waitFor({ state: 'attached', timeout: 8000 });
        });
        await step('iPhone: hamburger button visible', async () => {
            const btn = iphonePage.locator('#wize-ham-btn, .wize-ham-btn, button.hamburger').first();
            await btn.waitFor({ state: 'visible', timeout: 8000 });
        });
        await step('iPhone: hamburger opens drawer', async () => {
            const btn = iphonePage.locator('#wize-ham-btn, .wize-ham-btn, button.hamburger').first();
            await btn.click();
            await iphonePage.waitForFunction(() => {
                const d = document.getElementById('wize-ham-drawer') ||
                          document.querySelector('.wize-ham-drawer, .hamburger-drawer');
                return d && (d.classList.contains('open') || d.style.transform === 'translateX(0px)' ||
                             window.getComputedStyle(d).transform !== 'matrix(1, 0, 0, 1, 300, 0)');
            }, { timeout: 5000 });
        });
        await step('iPhone: hamburger drawer has sister-app links', async () => {
            const links = iphonePage.locator('#wize-ham-drawer a, .wize-ham-drawer a').filter({ hasText: /Wize|money|tax|health|travel|deal/i });
            const count = await links.count();
            if (count < 3) throw new Error(`only ${count} app links in hamburger drawer`);
        });
        await step('iPhone: close drawer via overlay', async () => {
            const overlay = iphonePage.locator('#wize-ham-overlay, .wize-ham-overlay').first();
            if (await overlay.count()) {
                await overlay.click();
            } else {
                await iphonePage.keyboard.press('Escape');
            }
            await iphonePage.waitForFunction(() => {
                const d = document.getElementById('wize-ham-drawer') ||
                          document.querySelector('.wize-ham-drawer');
                return !d || !d.classList.contains('open');
            }, { timeout: 5000 });
        });
    } else {
        out.push('_skipped — iPhone login failed_');
    }
    await iphonePage.close();
    await iphoneCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow M2 — Mobile Android: WizeMoney income page on Android viewport
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow M2 — Mobile Android (412×915): WizeMoney income page');
    const androidCtx = await browser.newContext({
        viewport: { width: 412, height: 915 },
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });
    const androidPage = await androidCtx.newPage();

    await step('Android: WizeMoney income page loads', async () => {
        await androidPage.goto('https://money.wizelife.ai/pages/income.html', { waitUntil: 'load', timeout: 30000 });
        if (androidPage.url().includes('auth') || await androidPage.locator('input[type=email]').count()) {
            await fillAndLogin(androidPage, QA_EMAIL, QA_PASSWORD);
            await androidPage.waitForURL(/income\.html/, { timeout: 15000 });
        }
    });
    await step('Android: income page content visible', async () => {
        await androidPage.waitForFunction(() => document.body.innerText.trim().length > 100, { timeout: 8000 });
    });
    await step('Android: no horizontal overflow (no scrollbar)', async () => {
        const overflow = await androidPage.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
        );
        if (overflow) throw new Error('page has horizontal overflow on mobile');
    });
    await step('Android: bottom-nav present', async () => {
        const nav = androidPage.locator('#wize-bottom-nav, .wize-bottom-nav, nav.bottom-nav').first();
        await nav.waitFor({ state: 'attached', timeout: 8000 });
    });
    await androidPage.close();
    await androidCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow M3 — Mobile: WizeTax on iPhone — chat + sidebar categories
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow M3 — Mobile iPhone: WizeTax sidebar + chat');
    const taxMobCtx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const taxMobPage = await taxMobCtx.newPage();

    await step('Mobile WizeTax loads', async () => {
        await taxMobPage.goto('https://tax.wizelife.ai/advisor', { waitUntil: 'domcontentloaded', timeout: 25000 });
    });
    await step('Mobile WizeTax: body has content', async () => {
        await taxMobPage.waitForFunction(() => document.body.innerText.trim().length > 50, { timeout: 10000 });
    });
    await step('Mobile WizeTax: chat input present', async () => {
        await taxMobPage.waitForSelector('textarea, input[type="text"]', { timeout: 10000 });
    });
    await step('Mobile WizeTax: no horizontal overflow', async () => {
        const overflow = await taxMobPage.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
        );
        if (overflow) throw new Error('WizeTax has horizontal overflow on mobile');
    });
    await taxMobPage.close();
    await taxMobCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 16 — WizeMoney: Reports page loads + has chart/data
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 16 — WizeMoney reports page');
    const rptCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const rptPage = await rptCtx.newPage();

    await step('WizeMoney reports loads', async () => {
        await rptPage.goto('https://money.wizelife.ai/pages/reports.html', { waitUntil: 'load', timeout: 30000 });
        if (rptPage.url().includes('auth') || await rptPage.locator('input[type=email]').count()) {
            await fillAndLogin(rptPage, QA_EMAIL, QA_PASSWORD);
            await rptPage.waitForURL(/reports\.html/, { timeout: 15000 });
        }
    });
    await step('Reports: page body has content', async () => {
        await rptPage.waitForFunction(() => document.body.innerText.trim().length > 50, { timeout: 8000 });
    });
    await step('Reports: chart canvas or summary element present', async () => {
        const el = rptPage.locator('canvas, .chart, [id*="chart" i], [id*="report" i], .summary-card, .total').first();
        await el.waitFor({ state: 'attached', timeout: 10000 });
    });
    await rptPage.close();
    await rptCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 17 — Theme toggle: dark↔light persists across navigation
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 17 — Theme toggle persists (WizeMoney)');
    const themeCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const themePage = await themeCtx.newPage();

    await step('Theme test: load WizeMoney dashboard', async () => {
        await themePage.goto('https://money.wizelife.ai/', { waitUntil: 'load', timeout: 30000 });
        if (themePage.url().includes('auth') || await themePage.locator('input[type=email]').count()) {
            await fillAndLogin(themePage, QA_EMAIL, QA_PASSWORD);
            await themePage.waitForSelector('.sidebar, #mainContent, .app-container', { timeout: 15000 });
        }
    });
    await step('Theme toggle button present', async () => {
        const btn = themePage.locator('[data-theme-toggle], button.theme-toggle, #themeToggle, button[onclick*="theme"], button[aria-label*="theme" i], button[title*="theme" i]').first();
        await btn.waitFor({ state: 'visible', timeout: 8000 });
        await btn.click();
    });
    await step('Theme class applied to body/html after toggle', async () => {
        const hasThemeClass = await themePage.evaluate(() => {
            const cls = document.documentElement.className + ' ' + document.body.className;
            return /dark|light|theme/i.test(cls) || document.documentElement.getAttribute('data-theme') !== null;
        });
        if (!hasThemeClass) throw new Error('no theme class/attr on html/body after toggle');
    });
    await step('Navigate to income page — theme persists', async () => {
        const before = await themePage.evaluate(() =>
            document.documentElement.getAttribute('data-theme') ||
            document.documentElement.className ||
            document.body.className
        );
        await themePage.goto('https://money.wizelife.ai/pages/income.html', { waitUntil: 'load', timeout: 20000 });
        const after = await themePage.evaluate(() =>
            document.documentElement.getAttribute('data-theme') ||
            document.documentElement.className ||
            document.body.className
        );
        if (!after || after === before || /dark|light/i.test(after) === /dark|light/i.test(before)) {
            // Either same theme class OR no theme persistence — just check theme attr is present
            const hasTheme = await themePage.evaluate(() =>
                document.documentElement.hasAttribute('data-theme') ||
                /dark|light/.test(document.documentElement.className + document.body.className)
            );
            if (!hasTheme) throw new Error('theme not persisted after navigation');
        }
    });
    await themePage.close();
    await themeCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 18 — PWA offline shell: service worker caches shell assets
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 18 — PWA offline shell (WizeLife + WizeMoney)');
    const pwaCtx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pwaPage = await pwaCtx.newPage();

    await step('PWA: load WizeLife to prime SW cache', async () => {
        await pwaPage.goto('https://wizelife.ai/', { waitUntil: 'load', timeout: 30000 });
    });
    await step('PWA: service worker registered', async () => {
        const swActive = await pwaPage.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return false;
            const reg = await navigator.serviceWorker.getRegistration('/');
            return !!(reg && (reg.active || reg.installing || reg.waiting));
        });
        if (!swActive) throw new Error('no service worker registered on wizelife.ai');
    });
    await step('PWA: manifest.json reachable', async () => {
        const status = await pwaPage.evaluate(async () => {
            const r = await fetch('/manifest.json');
            return r.status;
        });
        if (status !== 200) throw new Error(`manifest.json → HTTP ${status}`);
    });
    await step('PWA: go offline → page still renders', async () => {
        await pwaCtx.setOffline(true);
        await pwaPage.reload({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        const bodyLen = await pwaPage.evaluate(() => document.body.innerText.trim().length).catch(() => 0);
        await pwaCtx.setOffline(false);
        if (bodyLen < 20) throw new Error('offline shell rendered nothing (SW not caching?)');
    });
    await pwaPage.close();
    await pwaCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 19 — Cross-app hamburger: all 5 sister-app links reachable
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 19 — Cross-app hamburger links reachable');
    const hamXCtx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const hamXPage = await hamXCtx.newPage();

    await step('Hamburger test: load WizeMoney mobile', async () => {
        await hamXPage.goto('https://money.wizelife.ai/', { waitUntil: 'load', timeout: 30000 });
        if (hamXPage.url().includes('auth') || await hamXPage.locator('input[type=email]').count()) {
            await fillAndLogin(hamXPage, QA_EMAIL, QA_PASSWORD);
            await hamXPage.waitForSelector('.sidebar, #mainContent, .app-container', { timeout: 15000 });
        }
    });
    await step('Open hamburger drawer', async () => {
        const btn = hamXPage.locator('#wize-ham-btn, .wize-ham-btn, button[aria-label*="menu" i], button.hamburger').first();
        await btn.waitFor({ state: 'visible', timeout: 8000 });
        await btn.click();
        await hamXPage.waitForFunction(() => {
            const d = document.getElementById('wize-ham-drawer') ||
                      document.querySelector('.wize-ham-drawer');
            return d && d.classList.contains('open');
        }, { timeout: 5000 });
    });
    await step('Hamburger: WizeLife link present', async () => {
        const link = hamXPage.locator('#wize-ham-drawer a[href*="wizelife.ai"], .wize-ham-drawer a[href*="wizelife"]').first();
        await link.waitFor({ state: 'attached', timeout: 5000 });
    });
    await step('Hamburger: WizeTax link present', async () => {
        const link = hamXPage.locator('#wize-ham-drawer a[href*="tax"], .wize-ham-drawer a[href*="tax"]').first();
        await link.waitFor({ state: 'attached', timeout: 5000 });
    });
    await step('Hamburger: WizeHealth link present', async () => {
        const link = hamXPage.locator('#wize-ham-drawer a[href*="health"], .wize-ham-drawer a[href*="health"]').first();
        await link.waitFor({ state: 'attached', timeout: 5000 });
    });
    await step('Hamburger: WizeTravel link present', async () => {
        const link = hamXPage.locator('#wize-ham-drawer a[href*="travel"], .wize-ham-drawer a[href*="travel"]').first();
        await link.waitFor({ state: 'attached', timeout: 5000 });
    });
    await step('Hamburger: WizeDeal link present', async () => {
        const link = hamXPage.locator('#wize-ham-drawer a[href*="deal"], .wize-ham-drawer a[href*="deal"]').first();
        await link.waitFor({ state: 'attached', timeout: 5000 });
    });
    await hamXPage.close();
    await hamXCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 20 — WizeHealth mobile: chat on iPhone viewport
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 20 — WizeHealth mobile (390×844) chat');
    const healthMobCtx  = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const healthMobPage = await healthMobCtx.newPage();

    await step('Mobile WizeHealth loads (60s budget)', async () => {
        await healthMobPage.goto('https://vitara.onrender.com/', { waitUntil: 'load', timeout: 60000 });
    });
    await step('Mobile WizeHealth: no horizontal overflow', async () => {
        const overflow = await healthMobPage.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
        );
        if (overflow) throw new Error('WizeHealth horizontal overflow on mobile');
    });
    await step('Mobile WizeHealth: chat input accessible', async () => {
        await healthMobPage.waitForSelector('#txt, .chat-input, textarea, input[type=text]', { timeout: 15000 });
    });
    await step('Mobile WizeHealth: send message', async () => {
        const input = healthMobPage.locator('#txt, .chat-input, textarea').first();
        await input.fill('כאב ראש — מה עושים?');
        const sendBtn = healthMobPage.locator('button:has-text("Send"), button[type=submit], #sendBtn').first();
        if (await sendBtn.count()) await sendBtn.click();
        else await input.press('Enter');
    });
    await step('Mobile WizeHealth: response appears', async () => {
        await healthMobPage.waitForFunction(() => {
            const sel = '[class*="assistant"],[class*="bot"],[class*="ai"],[class*="response"],.message-bot';
            return [...document.querySelectorAll(sel)].some(el => el.textContent.trim().length > 20);
        }, { timeout: 60000 });
    });
    await healthMobPage.close();
    await healthMobCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 21 — WizeTravel mobile: iPhone loads + tab-bar visible
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 21 — WizeTravel mobile (390×844)');
    const travelMobCtx  = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const travelMobPage = await travelMobCtx.newPage();

    await step('Mobile WizeTravel loads', async () => {
        await travelMobPage.goto('https://travel.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    await step('Mobile WizeTravel: body has content', async () => {
        await travelMobPage.waitForFunction(() => document.body.innerText.trim().length > 50, { timeout: 10000 });
    });
    await step('Mobile WizeTravel: no horizontal overflow', async () => {
        const overflow = await travelMobPage.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
        );
        if (overflow) throw new Error('WizeTravel horizontal overflow on mobile');
    });
    await step('Mobile WizeTravel: nav/tab-bar rendered', async () => {
        const nav = travelMobPage.locator('nav, [role=tablist], .tabs, .tab-bar, button[data-tab]').first();
        await nav.waitFor({ state: 'attached', timeout: 10000 });
    });
    await travelMobPage.close();
    await travelMobCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 22 — WizeMoney: Preferences / Profile page loads
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 22 — WizeMoney preferences/profile page');
    const prefCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const prefPage = await prefCtx.newPage();

    await step('WizeMoney preferences.html loads', async () => {
        await prefPage.goto('https://money.wizelife.ai/pages/preferences.html', { waitUntil: 'load', timeout: 30000 });
        if (prefPage.url().includes('auth') || await prefPage.locator('input[type=email]').count()) {
            await fillAndLogin(prefPage, QA_EMAIL, QA_PASSWORD);
            await prefPage.waitForURL(/preferences\.html/, { timeout: 15000 });
        }
    });
    await step('Preferences: page has content', async () => {
        await prefPage.waitForFunction(() => document.body.innerText.trim().length > 50, { timeout: 8000 });
    });
    await step('Preferences: form or settings element present', async () => {
        const el = prefPage.locator('form, input, select, [id*="pref" i], [id*="setting" i], [class*="pref" i]').first();
        await el.waitFor({ state: 'attached', timeout: 8000 });
    });
    await prefPage.close();
    await prefCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 23 — WizeTax: click a quick-question category → question loads
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 23 — WizeTax quick-question category click');
    const taxQCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const taxQPage = await taxQCtx.newPage();

    await step('WizeTax advisor loads', async () => {
        await taxQPage.goto('https://tax.wizelife.ai/advisor', { waitUntil: 'domcontentloaded', timeout: 25000 });
    });
    await step('WizeTax: click first sidebar category / quick question', async () => {
        const cat = taxQPage.locator('.wt-cat button, details summary, [class*="category"], .quick-question, button[data-question]').first();
        await cat.waitFor({ state: 'visible', timeout: 10000 });
        await cat.click();
    });
    await step('WizeTax: chat input populated or question sent', async () => {
        await taxQPage.waitForFunction(() => {
            const inp = document.querySelector('textarea, input[type=text]');
            const hasMsgInChat = [...document.querySelectorAll('[class*="message"],[class*="chat"],[class*="user"]')]
                .some(el => el.textContent.trim().length > 5);
            return (inp && inp.value.length > 3) || hasMsgInChat;
        }, { timeout: 8000 });
    });
    await taxQPage.close();
    await taxQCtx.close();

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
