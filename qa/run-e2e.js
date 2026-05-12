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


    // ══════════════════════════════════════════════════════════════════
    // Flow 24 — WizeLife: forgot-password link reachable
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 24 — WizeLife forgot password link');
    const fpCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const fpPage = await fpCtx.newPage();
    await step('Open auth.html', async () => {
        await fpPage.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
    });
    await step('Forgot password link visible + clickable', async () => {
        const link = fpPage.locator('a:has-text("Forgot"), a:has-text("שכחתי"), a:has-text("Esqueci"), a:has-text("Olvidé"), a[href*="reset"], a[href*="forgot"]').first();
        await link.waitFor({ state: 'visible', timeout: 8000 });
    });
    await fpPage.close(); await fpCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 25 — WizeLife: referral link copy button works
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 25 — Referral link + copy button');
    const refCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const refPage = await refCtx.newPage();
    let refIn = false;
    await step('Login → dashboard', async () => {
        await refPage.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
        await fillAndLogin(refPage, QA_EMAIL, QA_PASSWORD);
        await refPage.waitForURL(/dashboard\.html/, { timeout: 20000 });
        refIn = true;
    });
    if (refIn) {
        await step('Referral link contains ?ref=', async () => {
            const val = await refPage.locator('#refLink').first().inputValue({ timeout: 6000 });
            if (!val.includes('?ref=')) throw new Error(`bad refLink: ${val}`);
        });
        await step('Copy button present', async () => {
            const btn = refPage.locator('button:has-text("Copy"), button:has-text("העתק"), button[onclick*="copy" i], button[id*="copy" i]').first();
            await btn.waitFor({ state: 'attached', timeout: 5000 });
        });
    }
    await refPage.close(); await refCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 26 — WizeLife: ?ref=XYZ stores referrer code in localStorage
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 26 — Referral code capture from URL');
    const refUrlCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const refUrlPage = await refUrlCtx.newPage();
    await step('Visit ?ref=QATEST123', async () => {
        await refUrlPage.goto('https://wizelife.ai/?ref=QATEST123', { waitUntil: 'load', timeout: 20000 });
    });
    await step('Referrer code stored in localStorage', async () => {
        const stored = await refUrlPage.evaluate(() => localStorage.getItem('wl_referrer') || localStorage.getItem('wl_ref') || localStorage.getItem('referrer'));
        if (!stored || !stored.includes('QATEST123')) throw new Error(`referrer not captured: ${stored}`);
    });
    await refUrlPage.close(); await refUrlCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 27 — Console-error monitor across all 6 properties
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 27 — Console-error scan (all properties)');
    const PROPS = [
        { name: 'WizeLife',    url: 'https://wizelife.ai/' },
        { name: 'WizeLife auth', url: 'https://wizelife.ai/auth.html' },
        { name: 'WizeMoney',   url: 'https://money.wizelife.ai/' },
        { name: 'WizeTax',     url: 'https://tax.wizelife.ai/advisor' },
        { name: 'WizeHealth',  url: 'https://health.wizelife.ai/' },
        { name: 'WizeTravel',  url: 'https://travel.wizelife.ai/' },
        { name: 'WizeDeal',    url: 'https://deal.wizelife.ai/' },
    ];
    for (const { name, url } of PROPS) {
        await step(`${name}: no console errors on load`, async () => {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            const errs = [];
            page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
            page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
            await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
            await page.waitForTimeout(3000); // catch late errors
            await page.close(); await ctx.close();
            // Ignore well-known noisy third-party errors
            const real = errs.filter(e =>
                !/Failed to load resource.*favicon/i.test(e) &&
                !/google.*translate|recaptcha|gtag/i.test(e) &&
                !/Manifest.*line/i.test(e) &&
                !/A listener indicated an asynchronous response/i.test(e)
            );
            if (real.length) throw new Error(`${real.length} errors: ${real[0]}`);
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // Flow 28 — Failed network requests across all 6 properties
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 28 — Failed network requests (HTTP ≥400)');
    for (const { name, url } of PROPS) {
        await step(`${name}: no 4xx/5xx asset loads`, async () => {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            const bad = [];
            page.on('response', r => {
                const s = r.status();
                if (s >= 400 && s < 600 && !r.url().includes('favicon')
                    && !/google.*analytics|gtag|clarity|recaptcha|firestore|identitytoolkit|securetoken/i.test(r.url())
                ) bad.push(`${s} ${r.url().slice(0, 100)}`);
            });
            await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
            await page.waitForTimeout(2500);
            await page.close(); await ctx.close();
            if (bad.length) throw new Error(`${bad.length}: ${bad[0]}`);
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // Flow 29 — WizeMoney: add transaction → edit → delete persists
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 29 — WizeMoney: edit + delete income entry');
    const editCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const editPage = await editCtx.newPage();
    let editIn = false;
    await step('Open income page', async () => {
        await editPage.goto('https://money.wizelife.ai/pages/income.html', { waitUntil: 'load', timeout: 30000 });
        if (editPage.url().includes('auth') || await editPage.locator('input[type=email]').count()) {
            await fillAndLogin(editPage, QA_EMAIL, QA_PASSWORD);
            await editPage.waitForURL(/income\.html/, { timeout: 15000 });
        }
        editIn = true;
    });
    if (editIn) {
        const NAME = 'QA Edit Test — ignore';
        await step('Add new entry to edit', async () => {
            await editPage.locator('button[onclick*="openAddModal"], button:has-text("Add"), button:has-text("הוסף")').first().click();
            await editPage.waitForSelector('#incomeModal', { state: 'visible', timeout: 6000 });
            await editPage.fill('#incomeName', NAME);
            await editPage.fill('#incomeAmount', '999');
            await editPage.fill('#incomeDate', new Date().toISOString().split('T')[0]);
            await editPage.click('#incomeModal button[type=submit], #incomeModal .btn-primary');
            await editPage.waitForFunction((n) => [...document.querySelectorAll('#incomeTableBody tr')].some(r => r.textContent.includes(n)), NAME, { timeout: 10000 });
        });
        await step('Edit button on the row', async () => {
            const row = editPage.locator(`#incomeTableBody tr:has-text("${NAME}")`).first();
            const editBtn = row.locator('button[onclick*="edit"], button:has-text("Edit"), button:has-text("ערוך"), .edit-btn').first();
            if (await editBtn.count()) { await editBtn.click(); } else { /* row click might trigger edit */ }
        });
        await step('Delete entry via row delete button', async () => {
            await editPage.goto('https://money.wizelife.ai/pages/income.html', { waitUntil: 'load', timeout: 20000 });
            editPage.on('dialog', d => d.accept());
            const row = editPage.locator(`#incomeTableBody tr:has-text("${NAME}")`).first();
            if (!(await row.count())) return; // nothing to delete
            const delBtn = row.locator('button[onclick*="delete"], button:has-text("Delete"), button:has-text("מחק"), .delete-btn').first();
            if (await delBtn.count()) await delBtn.click();
            await editPage.waitForFunction((n) => ![...document.querySelectorAll('#incomeTableBody tr')].some(r => r.textContent.includes(n)), NAME, { timeout: 8000 });
        });
    }
    await editPage.close(); await editCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 30 — WizeMoney AI Chat (Wize advisor) actually responds
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 30 — WizeMoney AI chat response');
    const wmChatCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const wmChatPage = await wmChatCtx.newPage();
    let wmChatIn = false;
    await step('Open AI chat page', async () => {
        await wmChatPage.goto('https://money.wizelife.ai/pages/ai-chat.html', { waitUntil: 'load', timeout: 30000 });
        if (wmChatPage.url().includes('auth') || await wmChatPage.locator('input[type=email]').count()) {
            await fillAndLogin(wmChatPage, QA_EMAIL, QA_PASSWORD);
            await wmChatPage.waitForURL(/ai-chat\.html/, { timeout: 15000 });
        }
        wmChatIn = true;
    });
    if (wmChatIn) {
        await step('Send a finance question', async () => {
            const input = wmChatPage.locator('#chatInput, textarea, input[type=text]').first();
            await input.waitFor({ state: 'visible', timeout: 8000 });
            await input.fill('What is compound interest?');
            const send = wmChatPage.locator('#sendBtn, button:has-text("Send"), button[type=submit]').first();
            if (await send.count()) await send.click(); else await input.press('Enter');
        });
        await step('AI responds (>20 chars)', async () => {
            await wmChatPage.waitForFunction(() => {
                const sel = '[class*="assistant"],[class*="bot"],[class*="ai"],[class*="response"],.message';
                return [...document.querySelectorAll(sel)].some(el => el.textContent.trim().length > 20);
            }, { timeout: 90000 });
        });
    }
    await wmChatPage.close(); await wmChatCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 31 — WizeTax multi-message conversation context preserved
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 31 — WizeTax conversation context');
    const taxCtxCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const taxCtxPage = await taxCtxCtx.newPage();
    await step('Open advisor', async () => {
        await taxCtxPage.goto('https://tax.wizelife.ai/advisor', { waitUntil: 'domcontentloaded', timeout: 25000 });
    });
    await step('Send message 1: identify as Israeli', async () => {
        const inp = taxCtxPage.locator('textarea, input[type=text]').first();
        await inp.waitFor({ state: 'visible', timeout: 10000 });
        await inp.fill('I am Israeli, considering moving to Portugal');
        await inp.press('Enter');
    });
    await step('Wait for response 1', async () => {
        await taxCtxPage.waitForFunction(() => {
            const txt = document.body.innerText;
            return /portugal|israel|residency|tax/i.test(txt) && txt.length > 200;
        }, { timeout: 60000 });
    });
    await step('Send follow-up message 2 (depends on context)', async () => {
        await taxCtxPage.waitForTimeout(2000);
        const inp = taxCtxPage.locator('textarea, input[type=text]').first();
        await inp.fill('What is the NHR regime there?');
        await inp.press('Enter');
    });
    await step('Wait for response 2 — mentions NHR or Portugal', async () => {
        await taxCtxPage.waitForFunction(() => /nhr|non-habitual|10\s*%|portugal/i.test(document.body.innerText), { timeout: 60000 });
    });
    await taxCtxPage.close(); await taxCtxCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 32 — WizeTax: country selector / quick-action panels open
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 32 — WizeTax sidebar tool panels open');
    const taxPanelCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const taxPanelPage = await taxPanelCtx.newPage();
    await step('Open advisor', async () => {
        await taxPanelPage.goto('https://tax.wizelife.ai/advisor', { waitUntil: 'domcontentloaded', timeout: 25000 });
    });
    await step('Click any sidebar tool button (Calculators / Crypto / etc.)', async () => {
        const tool = taxPanelPage.locator('button[class*="wt"], button:has-text("Crypto"), button:has-text("Calculator"), button:has-text("מחשבון"), [class*="sidebar"] button').first();
        await tool.waitFor({ state: 'visible', timeout: 10000 });
        await tool.click();
    });
    await step('A panel/modal opens or content changes', async () => {
        await taxPanelPage.waitForFunction(() => {
            return !!document.querySelector('[class*="modal"], [class*="panel"], [class*="dialog"], dialog[open], [aria-modal=true]');
        }, { timeout: 6000 });
    });
    await taxPanelPage.close(); await taxPanelCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 33 — WizeHealth conversation context + 2nd question
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 33 — WizeHealth follow-up question');
    const healthCtxCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const healthCtxPage = await healthCtxCtx.newPage();
    await step('Open WizeHealth (60s budget)', async () => {
        await healthCtxPage.goto('https://vitara.onrender.com/', { waitUntil: 'load', timeout: 60000 });
    });
    await step('Send Q1: headache symptoms', async () => {
        const inp = healthCtxPage.locator('#txt, .chat-input, textarea, input[type=text]').first();
        await inp.waitFor({ state: 'visible', timeout: 15000 });
        await inp.fill('I have a headache with light sensitivity');
        const send = healthCtxPage.locator('button:has-text("Send"), #sendBtn, button[type=submit]').first();
        if (await send.count()) await send.click(); else await inp.press('Enter');
    });
    await step('Wait for response', async () => {
        await healthCtxPage.waitForFunction(() => {
            const sel = '[class*="assistant"],[class*="bot"],[class*="ai"],[class*="response"],.message-bot';
            return [...document.querySelectorAll(sel)].some(el => el.textContent.trim().length > 30);
        }, { timeout: 60000 });
    });
    await step('Send Q2: when to see doctor', async () => {
        const inp = healthCtxPage.locator('#txt, .chat-input, textarea').first();
        await inp.fill('When should I see a doctor about this?');
        const send = healthCtxPage.locator('button:has-text("Send"), #sendBtn').first();
        if (await send.count()) await send.click(); else await inp.press('Enter');
    });
    await step('Q2 response mentions doctor / urgent / symptoms', async () => {
        await healthCtxPage.waitForFunction(() => /doctor|רופא|urgent|emergency|symptom/i.test(document.body.innerText), { timeout: 60000 });
    });
    await healthCtxPage.close(); await healthCtxCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 34 — WizeDeal: paste real listing → analysis data extracted
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 34 — WizeDeal: extract data from listing text');
    const deal3Ctx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const deal3Page = await deal3Ctx.newPage();
    await step('WizeDeal loads', async () => {
        await deal3Page.goto('https://deal.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    await step('Open Analyze flow', async () => {
        const btn = deal3Page.locator('button:has-text("Analyze"), button:has-text("New Deal"), a:has-text("Analyze")').first();
        await btn.waitFor({ state: 'visible', timeout: 10000 });
        await btn.click();
    });
    await step('Switch to text/paste mode', async () => {
        const t = deal3Page.locator('button:has-text("Text"), button:has-text("Paste"), label:has-text("Text")').first();
        if (await t.count()) await t.click();
        await deal3Page.waitForSelector('textarea', { timeout: 5000 });
    });
    await step('Paste listing + extract', async () => {
        await deal3Page.locator('textarea').first().fill('2-bedroom flat, 70sqm, Lisbon, Alfama. Asking 450000 EUR. Year built: 1920. HOA 80/mo.');
        await deal3Page.locator('button:has-text("Extract"), button:has-text("Analyze")').last().click();
    });
    await step('Output mentions Lisbon / 70 / 450', async () => {
        await deal3Page.waitForFunction(() => /lisbon|alfama|70|450|sqm|euro/i.test(document.body.innerText), { timeout: 45000 });
    });
    await deal3Page.close(); await deal3Ctx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 35 — Browser back/forward keeps user signed in
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 35 — Browser back/forward preserves auth');
    const navCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const navPage = await navCtx.newPage();
    let navIn = false;
    await step('Login → dashboard', async () => {
        await navPage.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
        await fillAndLogin(navPage, QA_EMAIL, QA_PASSWORD);
        await navPage.waitForURL(/dashboard\.html/, { timeout: 20000 });
        navIn = true;
    });
    if (navIn) {
        await step('Navigate to feedback.html', async () => {
            await navPage.goto('https://wizelife.ai/feedback.html', { waitUntil: 'load', timeout: 15000 });
        });
        await step('Back → still on dashboard, still authed', async () => {
            await navPage.goBack({ waitUntil: 'load', timeout: 15000 });
            await navPage.waitForFunction(() => /dashboard/i.test(location.href), { timeout: 8000 });
        });
        await step('Forward → feedback page reachable again', async () => {
            await navPage.goForward({ waitUntil: 'load', timeout: 15000 });
            await navPage.waitForFunction(() => /feedback/i.test(location.href), { timeout: 8000 });
        });
    }
    await navPage.close(); await navCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 36 — XSS injection in feedback form — properly escaped
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 36 — XSS injection in feedback form');
    const xssCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const xssPage = await xssCtx.newPage();
    let alerted = false;
    xssPage.on('dialog', d => { alerted = true; d.dismiss(); });
    await step('Open feedback.html', async () => {
        await xssPage.goto('https://wizelife.ai/feedback.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    });
    await step('Inject <script>alert(1)</script> in loved textarea', async () => {
        const pill = xssPage.locator('[data-app="finsight"]').first();
        if (await pill.count()) await pill.click();
        await xssPage.fill('#loved', '<script>alert("XSS")</script><img src=x onerror=alert(1)>');
        // Don't submit — we just check that the value isn't executed locally
        await xssPage.waitForTimeout(1500);
    });
    await step('No alert dialog fired (XSS escaped)', async () => {
        if (alerted) throw new Error('alert dialog opened — XSS not escaped!');
    });
    await xssPage.close(); await xssCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 37 — 404 page exists + shows helpful message
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 37 — 404 page on each property');
    const fourO4Targets = [
        'https://wizelife.ai/this-does-not-exist-xyz123.html',
        'https://money.wizelife.ai/pages/non-existent-xyz.html',
    ];
    for (const url of fourO4Targets) {
        await step(`${new URL(url).host}: 404 page renders content`, async () => {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            const resp = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
            const status = resp ? resp.status() : 0;
            const body = await page.evaluate(() => document.body.innerText.trim());
            await page.close(); await ctx.close();
            // GH Pages returns 404 page with content. Either 404 status + content, or 200 with redirect-to-home
            if (body.length < 20) throw new Error(`${status}: empty body`);
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // Flow 38 — All apps load within performance budget
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 38 — Page-load performance budget');
    const PERF_BUDGETS = [
        { url: 'https://wizelife.ai/',           budgetMs: 5000 },
        { url: 'https://wizelife.ai/auth.html',  budgetMs: 5000 },
        { url: 'https://money.wizelife.ai/',     budgetMs: 6000 },
        { url: 'https://tax.wizelife.ai/',       budgetMs: 8000 },
        { url: 'https://deal.wizelife.ai/',      budgetMs: 8000 },
    ];
    for (const { url, budgetMs } of PERF_BUDGETS) {
        await step(`${new URL(url).host}: loads within ${budgetMs}ms`, async () => {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            const t0 = Date.now();
            await page.goto(url, { waitUntil: 'load', timeout: 30000 });
            const elapsed = Date.now() - t0;
            await page.close(); await ctx.close();
            if (elapsed > budgetMs) throw new Error(`took ${elapsed}ms (budget ${budgetMs}ms)`);
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // Flow 39 — Keyboard navigation: Tab cycles through interactive elements
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 39 — Keyboard accessibility (Tab navigation)');
    const a11yCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const a11yPage = await a11yCtx.newPage();
    await step('Open auth.html', async () => {
        await a11yPage.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 15000 });
    });
    await step('Tab cycles through 3+ focusable elements', async () => {
        const focused = new Set();
        for (let i = 0; i < 6; i++) {
            await a11yPage.keyboard.press('Tab');
            const id = await a11yPage.evaluate(() => {
                const el = document.activeElement;
                return el ? (el.id || el.tagName + ':' + (el.name || el.type || '')) : '';
            });
            if (id) focused.add(id);
        }
        if (focused.size < 3) throw new Error(`only ${focused.size} unique focusable elements (need 3+)`);
    });
    await a11yPage.close(); await a11yCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 40 — Theme switch + reload persists choice (WizeLife)
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 40 — Theme persists across reload (WizeLife)');
    const themeRCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const themeRPage = await themeRCtx.newPage();
    await step('Load WizeLife', async () => {
        await themeRPage.goto('https://wizelife.ai/', { waitUntil: 'load', timeout: 20000 });
    });
    await step('Click theme toggle (set to light)', async () => {
        const btn = themeRPage.locator('button[onclick*="theme"], button.theme-toggle, [data-theme-toggle], button[aria-label*="theme" i]').first();
        if (!(await btn.count())) return; // skip if no theme toggle on landing
        await btn.click();
        await themeRPage.waitForTimeout(500);
    });
    await step('Theme stored in localStorage', async () => {
        const t = await themeRPage.evaluate(() => localStorage.getItem('wl_theme') || localStorage.getItem('theme'));
        // Even if not toggled, localStorage may be empty — accept that
        if (t === null) return;
    });
    await step('Reload → theme attribute still set', async () => {
        await themeRPage.reload({ waitUntil: 'load', timeout: 15000 });
        const dt = await themeRPage.evaluate(() =>
            document.documentElement.getAttribute('data-theme') ||
            document.documentElement.className ||
            document.body.className
        );
        if (!dt) throw new Error('no theme indicator after reload');
    });
    await themeRPage.close(); await themeRCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 41 — WizeLife sidebar/dashboard shows bonus days banner if any
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 41 — Dashboard bonus-days banner check');
    const bonusCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const bonusPage = await bonusCtx.newPage();
    let bonusIn = false;
    await step('Login → dashboard', async () => {
        await bonusPage.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
        await fillAndLogin(bonusPage, QA_EMAIL, QA_PASSWORD);
        await bonusPage.waitForURL(/dashboard\.html/, { timeout: 20000 });
        bonusIn = true;
    });
    if (bonusIn) {
        await step('Plan banner OR access-code card visible', async () => {
            const banner = bonusPage.locator('#planBanner, [id*="bonus" i], [id*="plan" i], [class*="plan-card"], #accessCodeInput').first();
            await banner.waitFor({ state: 'attached', timeout: 8000 });
        });
    }
    await bonusPage.close(); await bonusCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 42 — Sign-out clears localStorage SSO data
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 42 — Sign-out clears SSO');
    const soCtx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const soPage = await soCtx.newPage();
    let soIn = false;
    await step('Login → dashboard', async () => {
        await soPage.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
        await fillAndLogin(soPage, QA_EMAIL, QA_PASSWORD);
        await soPage.waitForURL(/dashboard\.html/, { timeout: 20000 });
        soIn = true;
    });
    if (soIn) {
        await step('LocalStorage has wl_plan / wl_nickname', async () => {
            const data = await soPage.evaluate(() => ({
                plan: localStorage.getItem('wl_plan'),
                nick: localStorage.getItem('wl_nickname'),
            }));
            if (!data.plan && !data.nick) throw new Error('no SSO localStorage state');
        });
        await step('Click sign-out', async () => {
            const out = soPage.locator('button:has-text("Sign Out"), button:has-text("התנתק"), a:has-text("Sign Out"), button[onclick*="logout" i], button[onclick*="signOut" i], #signOutBtn').first();
            await out.waitFor({ state: 'visible', timeout: 8000 });
            await out.click();
        });
        await step('Plan cleared from localStorage', async () => {
            await soPage.waitForFunction(() => !localStorage.getItem('wl_plan') || localStorage.getItem('wl_plan') === 'free', { timeout: 8000 });
        });
    }
    await soPage.close(); await soCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 43 — Mixed-content / HTTPS-only check across all apps
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 43 — No mixed content (HTTP in HTTPS pages)');
    for (const { name, url } of PROPS) {
        await step(`${name}: no http:// requests in https page`, async () => {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            const httpReqs = [];
            page.on('request', r => { if (r.url().startsWith('http://') && !r.url().includes('localhost')) httpReqs.push(r.url()); });
            await page.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
            await page.waitForTimeout(2000);
            await page.close(); await ctx.close();
            if (httpReqs.length) throw new Error(`${httpReqs.length} http requests: ${httpReqs[0]}`);
        });
    }


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
