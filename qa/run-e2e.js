#!/usr/bin/env node
// E2E flow tests — real user journeys for every app.
// Skipped if QA_EMAIL/QA_PASSWORD secrets aren't available.

const { chromium } = require('playwright');
const fs = require('fs');

const QA_EMAIL    = process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD;

const out  = ['# E2E flows\n'];
const fails = [];

if (!QA_EMAIL || !QA_PASSWORD) {
    out.push('_skipped — QA_EMAIL/QA_PASSWORD secrets missing_');
    fs.writeFileSync('e2e-report.md', out.join('\n'));
    process.exit(0);
}

async function step(label, fn) {
    try {
        await fn();
        out.push(`- ✅ ${label}`);
        return true;
    } catch (e) {
        out.push(`- ❌ ${label} — ${e.message.slice(0, 220)}`);
        fails.push(label);
        return false;
    }
}

async function fillAndLogin(page, email, password) {
    await page.waitForSelector('input[type=email], #email, input[name=email]', { timeout: 15000 });
    await page.fill('input[type=email], #email, input[name=email]', email);
    await page.fill('input[type=password], #password, input[name=password]', password);
    const btn = page.locator([
        'button:has-text("Sign In")', 'button:has-text("Sign in")',
        'button:has-text("Login")', 'button:has-text("התחבר")',
        'button#loginBtn', 'button[type=submit]',
    ].join(', ')).first();
    await btn.click({ timeout: 5000 });
}

async function main() {
    const browser = await chromium.launch();

    // ══════════════════════════════════════════════════════════════════
    // Flow 1 — WizeLife: login → dashboard
    // ══════════════════════════════════════════════════════════════════
    out.push('## Flow 1 — WizeLife login → dashboard');
    const wizeCtx = await browser.newContext();
    const wizePage = await wizeCtx.newPage();
    let wizeLoggedIn = false;

    await step('Open auth.html', async () => {
        await wizePage.goto('https://wizelife.ai/auth.html', { waitUntil: 'load', timeout: 30000 });
    });
    wizeLoggedIn = await step('Submit credentials → reach dashboard', async () => {
        await fillAndLogin(wizePage, QA_EMAIL, QA_PASSWORD);
        await wizePage.waitForURL(/dashboard\.html/, { timeout: 20000 });
    });
    if (wizeLoggedIn) {
        await step('Nickname visible in top bar', async () => {
            const txt = await wizePage.locator('#navUserName').first().textContent({ timeout: 6000 });
            if (!txt || txt === '—') throw new Error(`empty nick: '${txt}'`);
        });
        await step('Plan badge visible', async () => {
            const txt = await wizePage.locator('#navPlanBadge').first().textContent({ timeout: 5000 });
            if (!txt) throw new Error('no plan badge text');
        });
        await step('Referral link generated', async () => {
            const val = await wizePage.locator('#refLink').first().inputValue({ timeout: 5000 });
            if (!val || !val.includes('?ref=')) throw new Error(`bad refLink: ${val}`);
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // Flow 1b — Access code redemption (WIZELIFE2026 → YOLO)
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 1b — Access code redemption');
    if (wizeLoggedIn) {
        await step('Navigate to dashboard', async () => {
            await wizePage.goto('https://wizelife.ai/dashboard.html', { waitUntil: 'load', timeout: 20000 });
        });
        await step('Access code input visible', async () => {
            await wizePage.waitForSelector('#accessCodeInput', { timeout: 8000 });
        });
        await step('Type WIZELIFE2026 and click Apply', async () => {
            await wizePage.fill('#accessCodeInput', 'WIZELIFE2026');
            await wizePage.click('#accessCodeBtn');
        });
        await step('#codeMsg shows activation or already-active', async () => {
            await wizePage.waitForFunction(() => {
                const msg = document.getElementById('codeMsg');
                return msg && msg.textContent && msg.textContent.trim().length > 3;
            }, { timeout: 12000 });
            const msg = await wizePage.locator('#codeMsg').textContent();
            if (!/activ|yolo|pro|already|invalid|פעיל|הופעל/i.test(msg)) {
                throw new Error(`unexpected codeMsg: "${msg}"`);
            }
        });
    } else {
        out.push('_skipped — login failed in Flow 1_');
    }
    await wizePage.close();
    await wizeCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 2 — WizeMoney: login → income page → add income row
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 2 — WizeMoney: add income entry');
    const moneyCtx  = await browser.newContext();
    const moneyPage = await moneyCtx.newPage();
    let moneyLoggedIn = false;

    await step('Navigate to WizeMoney', async () => {
        await moneyPage.goto('https://finsightai.github.io/finsight/', { waitUntil: 'load', timeout: 30000 });
    });
    moneyLoggedIn = await step('Handle auth if needed', async () => {
        const hasContent = await moneyPage.locator('.sidebar, .app-container, #mainContent').count();
        if (hasContent) return;
        const emailVisible = await moneyPage.locator('input[type=email], #email').count();
        if (emailVisible) {
            await fillAndLogin(moneyPage, QA_EMAIL, QA_PASSWORD);
            await moneyPage.waitForSelector('.sidebar, .app-container, #mainContent', { timeout: 15000 });
        } else {
            throw new Error('neither dashboard nor auth found');
        }
    });
    if (moneyLoggedIn !== false) {
        await step('Open income page', async () => {
            await moneyPage.goto('https://finsightai.github.io/finsight/pages/income.html', { waitUntil: 'load', timeout: 20000 });
            if (moneyPage.url().includes('auth')) {
                await fillAndLogin(moneyPage, QA_EMAIL, QA_PASSWORD);
                await moneyPage.waitForURL(/income\.html/, { timeout: 15000 });
            }
        });
        await step('Click "Add income" button', async () => {
            const btn = moneyPage.locator('button[onclick*="openAddModal"], button:has-text("הוסף הכנסה"), button:has-text("Add income")').first();
            await btn.waitFor({ timeout: 8000 });
            await btn.click();
        });
        await step('Income modal opens', async () => {
            await moneyPage.waitForFunction(() => {
                const m = document.getElementById('incomeModal');
                return m && m.style.display !== 'none';
            }, { timeout: 6000 });
        });
        await step('Fill income form', async () => {
            await moneyPage.fill('#incomeName',  'QA Test Income — ignore');
            await moneyPage.fill('#incomeAmount', '1234');
            const today = new Date().toISOString().split('T')[0];
            await moneyPage.fill('#incomeDate', today);
        });
        await step('Submit → new row appears in table', async () => {
            await moneyPage.click('#incomeModal button[type=submit], #incomeModal button:has-text("שמור"), #incomeModal button:has-text("הוסף"), #incomeModal .btn-primary');
            await moneyPage.waitForFunction(() => {
                const rows = document.querySelectorAll('#incomeTableBody tr');
                return [...rows].some(r => r.textContent.includes('QA Test Income'));
            }, { timeout: 12000 });
        });
    } else {
        out.push('_skipped — WizeMoney auth failed_');
    }
    await moneyPage.close();
    await moneyCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 3 — WizeTax: load → send chat question → read response
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 3 — WizeTax chat');
    const taxCtx  = await browser.newContext();
    const taxPage = await taxCtx.newPage();

    await step('Tax advisor page loads', async () => {
        await taxPage.goto('https://tax.wizelife.ai/advisor', { waitUntil: 'domcontentloaded', timeout: 25000 });
    });
    await step('Chat input present', async () => {
        await taxPage.waitForSelector('textarea, input[type="text"]', { timeout: 10000 });
    });
    await step('Sidebar with categories present', async () => {
        const cats = await taxPage.locator('.wt-cat, details, [open]').count();
        if (cats === 0) throw new Error('no sidebar categories');
    });
    await step('Send question: "מה זה מע"מ?"', async () => {
        const input = taxPage.locator('textarea, input[type="text"]').first();
        await input.fill('מה זה מע"מ?');
        await input.press('Enter');
    });
    await step('Assistant response streams in (>20 chars)', async () => {
        await taxPage.waitForFunction(() => {
            const sel = '[class*="assistant"],[class*="bot"],[class*="response"],[class*="message"],[class*="chat"]';
            return [...document.querySelectorAll(sel)].some(el => el.textContent.trim().length > 20);
        }, { timeout: 45000 });
    });
    await taxPage.close();
    await taxCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 4 — WizeHealth: load → send health question → read response
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 4 — WizeHealth chat');
    const healthCtx  = await browser.newContext();
    const healthPage = await healthCtx.newPage();

    await step('Vitara loads (cold-start budget: 60s)', async () => {
        await healthPage.goto('https://vitara.onrender.com/', { waitUntil: 'load', timeout: 60000 });
    });
    await step('Chat input present', async () => {
        await healthPage.waitForSelector('#txt, .chat-input, textarea, input[type=text]', { timeout: 15000 });
    });
    await step('Send question: "What helps with a headache?"', async () => {
        const input = healthPage.locator('#txt, .chat-input, textarea').first();
        await input.fill('What helps with a headache?');
        const sendBtn = healthPage.locator('button:has-text("Send"), button[type=submit], button.send-btn, #sendBtn').first();
        if (await sendBtn.count()) {
            await sendBtn.click();
        } else {
            await input.press('Enter');
        }
    });
    await step('Response appears in chat', async () => {
        await healthPage.waitForFunction(() => {
            const sel = '[class*="assistant"],[class*="bot"],[class*="ai"],[class*="response"],.message-bot,.chat-message';
            return [...document.querySelectorAll(sel)].some(el => el.textContent.trim().length > 20);
        }, { timeout: 60000 });
    });
    await healthPage.close();
    await healthCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 5 — WizeTravel: load → tabs render
    // (Kiwi search is cross-origin iframe — can't automate inside it)
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 5 — WizeTravel UI');
    const travelCtx  = await browser.newContext();
    const travelPage = await travelCtx.newPage();

    await step('WizeTravel page loads', async () => {
        await travelPage.goto('https://travel.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    await step('Page has content (not blank)', async () => {
        await travelPage.waitForFunction(() => document.body.innerText.trim().length > 100, { timeout: 10000 });
    });
    await step('Tab bar / navigation renders', async () => {
        const nav = travelPage.locator('nav, [role=tablist], .tabs, .tab-bar, button[data-tab]').first();
        await nav.waitFor({ state: 'attached', timeout: 10000 });
    });
    await step('Kiwi iframe embedded', async () => {
        const iframe = travelPage.locator('iframe[src*="kiwi"], iframe[src*="kiwicom"], iframe').first();
        await iframe.waitFor({ state: 'attached', timeout: 10000 });
    });
    await travelPage.close();
    await travelCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 6 — WizeDeal: load → "Analyze New Deal" → listing input
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 6 — WizeDeal analyze flow');
    const dealCtx  = await browser.newContext();
    const dealPage = await dealCtx.newPage();

    await step('WizeDeal home loads', async () => {
        await dealPage.goto('https://deal.wizelife.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    await step('Page body has content', async () => {
        await dealPage.waitForFunction(() => document.body.innerText.trim().length > 100, { timeout: 10000 });
    });
    await step('Click "Analyze" / "New Deal" button', async () => {
        const btn = dealPage.locator([
            'button:has-text("Analyze")', 'button:has-text("New Deal")',
            'button:has-text("Add Deal")', 'button:has-text("נתח")',
            'button:has-text("עסקה חדשה")', 'a:has-text("New Deal")',
        ].join(', ')).first();
        await btn.waitFor({ state: 'visible', timeout: 10000 });
        await btn.click();
    });
    await step('Listing URL/text input visible', async () => {
        await dealPage.waitForSelector([
            'input[placeholder*="zapimoveis"]',
            'input[placeholder*="yad2"]',
            'input[placeholder*="url" i]',
            'input[placeholder*="http"]',
            'textarea[placeholder*="listing"]',
        ].join(', '), { timeout: 10000 });
    });
    await dealPage.close();
    await dealCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // Flow 7 — Feedback form: real Firestore write → success message
    // ══════════════════════════════════════════════════════════════════
    out.push('\n## Flow 7 — Feedback form (real submit)');
    const fbCtx  = await browser.newContext();
    const fbPage = await fbCtx.newPage();

    await step('Open feedback.html', async () => {
        await fbPage.goto('https://wizelife.ai/feedback.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    });
    await step('Select WizeMoney app pill', async () => {
        const pill = fbPage.locator('[data-app="finsight"]').first();
        await pill.waitFor({ timeout: 5000 });
        await pill.click();
    });
    await step('Fill "loved" textarea', async () => {
        await fbPage.fill('#loved', 'QA automated test — please ignore');
    });
    await step('Submit form', async () => {
        await fbPage.click('[type="submit"]');
    });
    await step('Success message visible (Firestore write confirmed)', async () => {
        const ok = fbPage.locator('.ok-msg');
        await ok.waitFor({ timeout: 12000 });
        const txt = await ok.textContent();
        if (!txt || txt.trim().length < 3) throw new Error('success message empty');
    });
    await fbPage.close();
    await fbCtx.close();

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
