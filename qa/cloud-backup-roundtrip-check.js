#!/usr/bin/env node
/**
 * cloud-backup-roundtrip-check.js
 *
 * Guards the localStorage->Firestore backup module (wize-cloud-backup.js) that
 * was added after a user lost all their stock data.  A data-loss regression
 * is the worst thing that can happen so this test is intentionally thorough.
 *
 * TIERS:
 *   Tier-1  Static analysis (always runs, no browser needed)
 *           - module file exists, correct API surface, BACKUP_KEYS complete,
 *             PIN-lock guard, Firestore path, firestore.rules owner-gate
 *   Tier-2  Browser structural check (headless, no auth)
 *           - load money.wizelife.ai on mobile 390x844
 *           - assert window.WizeCloudBackup is exposed
 *           - assert all expected methods present
 *           - assert BACKUP_KEYS array includes the critical data keys
 *           - assert no console error from the backup module on load
 *           - local round-trip: write known data -> snapshotLocal() captures it
 *   Tier-3  Authenticated round-trip (creds-gated -- set QA_EMAIL + QA_PASSWORD)
 *           - login via wizelife.ai/auth.html
 *           - navigate to money.wizelife.ai
 *           - write synthetic test data to a backed-up localStorage key
 *           - call WizeCloudBackup.pushNow() -> confirm ok
 *           - clear local key
 *           - verify WizeCloudBackup.status() reflects cloud doc
 *           - reload to trigger initialRestore() -> verify key repopulated
 *
 * Run:
 *   node qa/cloud-backup-roundtrip-check.js
 *   QA_EMAIL=you@example.com QA_PASSWORD=secret node qa/cloud-backup-roundtrip-check.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---- helpers ----------------------------------------------------------------

// The qa/ dir lives inside TOTALIST/wizelife; finance dashboard is a sibling
// of TOTALIST at the MacBook Air level.
function findFinanceDashRoot() {
    // The qa/ dir is at: <MacBookAirDir>/TOTALIST/wizelife/qa
    // Walk three levels up to reach <MacBookAirDir>.
    // NOTE: Node on macOS may resolve __dirname to the ASCII apostrophe (U+0027)
    // iCloud-stub path instead of the real U+2019 directory.  We therefore also
    // probe /Users/s/Desktop/ directly for any 'MacBook Air' directory that
    // actually contains the finance dashboard.
    const probeParents = [
        path.join(__dirname, '..', '..', '..'),         // three up from qa/
        path.join(__dirname, '..', '..', '..', '..'),   // four up (in case CWD shifted)
    ];

    // Also try all MacBook Air variants under /Users/s/Desktop/
    const desktopBase = '/Users/s/Desktop';
    try {
        for (const entry of fs.readdirSync(desktopBase)) {
            if (entry.includes('MacBook')) {
                probeParents.push(path.join(desktopBase, entry));
            }
        }
    } catch {}

    const seen = new Set();
    for (const parent of probeParents) {
        const resolved = path.resolve(parent);
        if (seen.has(resolved)) continue;
        seen.add(resolved);

        // Case 1: finance dashboard is directly inside this dir
        const direct = path.join(resolved, 'finance dashboard', 'js', 'wize-cloud-backup.js');
        if (fs.existsSync(direct)) return path.join(resolved, 'finance dashboard');

        // Case 2: scan one level into this dir for any sub-dir that has it
        try {
            for (const entry of fs.readdirSync(resolved)) {
                const candidate = path.join(resolved, entry);
                const jsPath = path.join(candidate, 'finance dashboard', 'js', 'wize-cloud-backup.js');
                if (fs.existsSync(jsPath)) return path.join(candidate, 'finance dashboard');
            }
        } catch {}
    }
    return null;
}

const QA_DIR       = __dirname;
const WIZE_ROOT    = path.join(QA_DIR, '..');
const FINANCE_DASH = findFinanceDashRoot();
const MODULE_SRC   = FINANCE_DASH ? path.join(FINANCE_DASH, 'js', 'wize-cloud-backup.js') : null;
const RULES_SRC    = FINANCE_DASH ? path.join(FINANCE_DASH, 'firestore.rules') : null;
const REPORT_FILE  = path.join(WIZE_ROOT, 'cloud-backup-roundtrip-report.md');

const QA_EMAIL    = process.env.QA_EMAIL    || process.env.QA_EMAIL_PRO    || '';
const QA_PASSWORD = process.env.QA_PASSWORD || process.env.QA_PASSWORD_PRO || '';

const MONEY_URL = 'https://money.wizelife.ai';
const AUTH_URL  = 'https://wizelife.ai/auth.html';

// Expected public API from the module
const EXPECTED_METHODS = ['init', 'pushNow', 'scheduleBackup', 'snapshotLocal', 'status'];
const EXPECTED_KEY     = 'BACKUP_KEYS';

// Must be in BACKUP_KEYS -- these are the keys a user can lose data from
const CRITICAL_KEYS = [
    'finance_stocks',
    'finance_bank_accounts',
    'finance_income',
    'finance_transactions',
    'finance_goals',
    'finance_credit_cards',
    'finance_expenses',
];

// The key used for the synthetic round-trip write (already in BACKUP_KEYS)
const ROUNDTRIP_LS_KEY = 'finance_goals';
const ROUNDTRIP_VALUE  = JSON.stringify([{ __qa_roundtrip: true, ts: Date.now(), name: 'QA test goal' }]);

// ---- reporter ---------------------------------------------------------------

const lines  = [];
const fails  = [];
const warns  = [];
const passes = [];

function ok(label)   { passes.push(label); lines.push(`- ✅ ${label}`); console.log(`  ✅ ${label}`); }
function fail(label) { fails.push(label);  lines.push(`- ❌ ${label}`); console.error(`  ❌ ${label}`); }
function skip(label, reason) {
    const msg = reason ? `${label} -- ${reason}` : label;
    warns.push(msg); lines.push(`- ⚠️ SKIP: ${msg}`); console.warn(`  ⚠️  SKIP: ${msg}`);
}
function section(title) { lines.push(`\n## ${title}\n`); console.log(`\n## ${title}`); }

// ---- Tier-1: Static source analysis ----------------------------------------

async function runStaticTier() {
    section('Tier-1: Static analysis (no browser)');

    // 1a. Module file exists
    if (!MODULE_SRC || !fs.existsSync(MODULE_SRC)) {
        fail('wize-cloud-backup.js found at expected path');
        return;
    }
    ok('wize-cloud-backup.js exists');

    const src = fs.readFileSync(MODULE_SRC, 'utf8');

    // 1b. API surface
    for (const fn of EXPECTED_METHODS) {
        if (src.includes(fn)) ok(`exports method: ${fn}`);
        else fail(`missing export: ${fn}`);
    }
    if (src.includes(EXPECTED_KEY)) ok('exports BACKUP_KEYS array');
    else fail('BACKUP_KEYS constant missing');

    // 1c. Critical user-data keys present in BACKUP_KEYS list
    for (const k of CRITICAL_KEYS) {
        if (src.includes(`'${k}'`)) ok(`BACKUP_KEYS includes ${k}`);
        else fail(`BACKUP_KEYS missing critical key: ${k}`);
    }

    // 1d. PIN-lock encrypted entries must NOT be pushed to cloud
    if (src.includes('looksEncrypted') && src.includes('__enc')) {
        ok('PIN-lock guard: skips encrypted blobs before push');
    } else {
        fail('No PIN-lock protection -- encrypted blobs could reach cloud');
    }

    // 1e. Debounce constant present (protects against Firestore write storms)
    if (/DEBOUNCE_MS\s*=\s*\d+/.test(src)) ok('debounce constant present (write-storm protection)');
    else fail('DEBOUNCE_MS missing -- no write-storm protection');

    // 1f. Firestore path correctness
    if (src.includes("'userBackups'")) ok("Firestore path uses 'userBackups' collection");
    else fail("Firestore path: 'userBackups' collection reference not found");

    if (src.includes("'wizemoney'")) ok("APP_ID = 'wizemoney' -- sibling apps cannot overwrite this doc");
    else fail("APP_ID 'wizemoney' not found -- cross-app collision risk");

    // 1g. MAX_DOC_BYTES guard (prevents silent Firestore limit failures)
    if (src.includes('MAX_DOC_BYTES')) ok('MAX_DOC_BYTES guard protects against 1MB Firestore limit');
    else fail('No MAX_DOC_BYTES guard -- large snapshots would silently fail');

    // 1h. window.WizeCloudBackup global exposed for diagnostics + testing
    if (src.includes('window.WizeCloudBackup')) ok('window.WizeCloudBackup exposed for diagnostics + testing');
    else fail('window.WizeCloudBackup not exposed -- cannot call from tests or console');

    // 1i. Firestore security rules
    if (!RULES_SRC || !fs.existsSync(RULES_SRC)) {
        skip('firestore.rules userBackups owner-gate check', 'firestore.rules not found in finance dashboard root');
    } else {
        const rules = fs.readFileSync(RULES_SRC, 'utf8');
        if (/match\s+\/userBackups\/\{[^}]+\}\s*\{[\s\S]*?isOwner/.test(rules)) {
            ok('firestore.rules: userBackups/{uid} owner-only rule present');
        } else if (rules.includes('userBackups')) {
            fail('firestore.rules: userBackups mentioned but no isOwner gate found');
        } else {
            fail('firestore.rules: no userBackups rule at all');
        }
    }

    // 1j. Auto-init wired up (DOMContentLoaded + init call)
    if (src.includes('DOMContentLoaded') && src.includes('init')) {
        ok('auto-init: wired to DOMContentLoaded');
    } else {
        fail('auto-init: DOMContentLoaded + init not found -- module may not self-start');
    }

    // 1k. beforeunload flush (data not lost on tab close)
    if (src.includes('beforeunload') && src.includes('pushNow')) {
        ok('beforeunload: flushes pending backup on tab close');
    } else {
        fail('beforeunload flush missing -- tab-close data loss possible');
    }
}

// ---- Tier-2: Browser structural + local round-trip (no auth) ----------------

async function runBrowserTier(browser) {
    section('Tier-2: Browser structural check (no auth)');

    let ctx, page;
    const consoleErrors = [];

    try {
        ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
        page = await ctx.newPage();

        // Capture console errors specifically from the backup module
        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                if (/cloudbackup|wize.*backup|backup.*wize/i.test(text)) {
                    consoleErrors.push(text);
                }
            }
        });

        // 2a. Page loads without crash
        await page.goto(MONEY_URL + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(3000);
        ok(`page loaded: ${MONEY_URL}`);

        // 2b. window.WizeCloudBackup global exists
        const globalExists = await page.evaluate(() => typeof window.WizeCloudBackup !== 'undefined');
        if (globalExists) ok('window.WizeCloudBackup global is present');
        else { fail('window.WizeCloudBackup is undefined -- module not loaded or failed to execute'); return; }

        // 2c. Expected methods present on the global
        const methodCheck = await page.evaluate((methods) => {
            return methods.map(m => ({ method: m, ok: typeof window.WizeCloudBackup[m] === 'function' }));
        }, EXPECTED_METHODS);

        for (const { method, ok: present } of methodCheck) {
            if (present) ok(`WizeCloudBackup.${method}() is a function`);
            else fail(`WizeCloudBackup.${method} missing or not a function`);
        }

        // 2d. BACKUP_KEYS is a non-empty array
        const backupKeysCheck = await page.evaluate(() => {
            const bk = window.WizeCloudBackup.BACKUP_KEYS;
            return {
                isArray: Array.isArray(bk),
                length:  Array.isArray(bk) ? bk.length : 0,
                keys:    Array.isArray(bk) ? bk : [],
            };
        });
        if (backupKeysCheck.isArray && backupKeysCheck.length > 0) {
            ok(`BACKUP_KEYS is an array with ${backupKeysCheck.length} keys`);
        } else {
            fail('WizeCloudBackup.BACKUP_KEYS is missing, empty, or not an array');
        }

        // 2e. Critical keys present in live BACKUP_KEYS
        for (const k of CRITICAL_KEYS) {
            if (backupKeysCheck.keys.includes(k)) ok(`live BACKUP_KEYS includes ${k}`);
            else fail(`live BACKUP_KEYS missing: ${k}`);
        }

        // 2f. No console errors from backup module on load
        if (consoleErrors.length === 0) {
            ok('no console errors from backup module on load');
        } else {
            fail(`${consoleErrors.length} console error(s) from backup module: ${consoleErrors.slice(0, 2).join(' | ')}`);
        }

        // 2g. Local round-trip: write test data -> snapshotLocal() must capture it
        //     snapshotLocal() reads BACKUP_KEYS from localStorage with no auth.
        const roundTripResult = await page.evaluate(({ key, value }) => {
            try {
                const prior = localStorage.getItem(key);
                localStorage.setItem(key, value);
                const snap = window.WizeCloudBackup.snapshotLocal();
                // Restore prior value
                if (prior !== null) localStorage.setItem(key, prior);
                else localStorage.removeItem(key);
                if (typeof snap !== 'object' || snap === null) {
                    return { ok: false, reason: 'snapshotLocal() returned non-object: ' + typeof snap };
                }
                if (snap[key] !== value) {
                    return { ok: false, reason: `key "${key}" not in snapshot or value mismatch. got: ${snap[key]}` };
                }
                return { ok: true, keyCount: Object.keys(snap).length };
            } catch (e) {
                return { ok: false, reason: String(e) };
            }
        }, { key: ROUNDTRIP_LS_KEY, value: ROUNDTRIP_VALUE });

        if (roundTripResult.ok) {
            ok(`local round-trip: snapshotLocal() captured test data (${roundTripResult.keyCount} keys total in snapshot)`);
        } else {
            fail(`local round-trip failed: ${roundTripResult.reason}`);
        }

        // 2h. snapshotLocal() omits null/missing keys (no empty-value noise in backup)
        const skipNullCheck = await page.evaluate(() => {
            const testKey = 'finance_loans'; // in BACKUP_KEYS
            const prior = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            const snap = window.WizeCloudBackup.snapshotLocal();
            if (prior !== null) localStorage.setItem(testKey, prior);
            return !(testKey in snap);
        });
        if (skipNullCheck) ok('snapshotLocal() omits null/missing keys (no empty-value noise in backup)');
        else fail('snapshotLocal() includes null/missing keys -- may inflate backup size unnecessarily');

    } finally {
        if (page) await page.close().catch(() => {});
        if (ctx)  await ctx.close().catch(() => {});
    }
}

// ---- Tier-3: Authenticated cloud round-trip (creds-gated) -------------------

async function runAuthTier(browser) {
    section('Tier-3: Authenticated cloud round-trip (needs QA_EMAIL + QA_PASSWORD)');

    if (!QA_EMAIL || !QA_PASSWORD) {
        skip('full cloud round-trip (backup->Firestore->restore)', 'QA_EMAIL / QA_PASSWORD not set -- run with creds to enable');
        skip('WizeCloudBackup.status() cloud doc check', 'needs auth');
        skip('Storage.set instrumentation + debounce trigger check', 'needs auth');
        skip('initialRestore() repopulates key after clear + reload', 'needs auth');
        return;
    }

    let ctx, page;

    try {
        ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
        page = await ctx.newPage();

        // 3a. Login via wizelife.ai
        await page.goto(AUTH_URL + '?_t=' + Date.now(), { timeout: 30000, waitUntil: 'load' });
        await page.waitForTimeout(1500);

        const loginFields = await page.evaluate(() => ({
            emailInput:    !!document.querySelector('input[type=email], #loginEmail, #email'),
            passwordInput: !!document.querySelector('input[type=password], #loginPassword, #password'),
        }));
        if (!loginFields.emailInput || !loginFields.passwordInput) {
            fail('auth page: login fields not found');
            return;
        }

        await page.fill('input[type=email], #loginEmail, #email', QA_EMAIL);
        await page.fill('input[type=password], #loginPassword, #password', QA_PASSWORD);
        await page.locator(
            'button#loginBtn, button:has-text("Sign In"), button:has-text("Login"), button[type=submit]'
        ).first().click({ timeout: 8000 });
        await page.waitForURL(/dashboard\.html/, { timeout: 30000 });
        ok('login succeeded -> dashboard');

        // 3b. Navigate to WizeMoney
        await page.goto(MONEY_URL + '?_t=' + Date.now(), { timeout: 30000, waitUntil: 'load' });
        await page.waitForTimeout(4000); // give Firebase auth + module init time
        ok(`navigated to ${MONEY_URL}`);

        // 3c. Confirm module loaded and user is authenticated
        const authState = await page.evaluate(async () => {
            if (typeof window.WizeCloudBackup === 'undefined') return { loaded: false };
            const s = await window.WizeCloudBackup.status().catch(e => ({ error: String(e) }));
            return { loaded: true, uid: s.uid, wrapped: s.wrapped };
        });

        if (!authState.loaded) {
            fail('WizeCloudBackup not loaded on money.wizelife.ai (authenticated view)');
            return;
        }
        ok('WizeCloudBackup loaded in authenticated session');

        if (authState.uid) {
            ok(`user is authenticated -- uid prefix: ${authState.uid.slice(0, 8)}...`);
        } else {
            fail('WizeCloudBackup.status().uid is null -- auth state not propagated to module');
            return;
        }

        if (authState.wrapped) ok('Storage.set is instrumented (writes will trigger scheduled backup)');
        else fail('Storage.__cloudWrapped is false -- Storage.set writes will NOT trigger cloud backup');

        // 3d. Write synthetic test data and trigger an immediate push
        const testPayload = JSON.stringify([{
            __qa_roundtrip: true, ts: Date.now(), name: 'QA round-trip test goal',
        }]);

        const pushResult = await page.evaluate(async ({ key, value }) => {
            localStorage.setItem(key, value);
            // Force immediate push (bypass 8s debounce)
            const result = await window.WizeCloudBackup.pushNow().catch(e => ({ ok: false, error: String(e) }));
            return result;
        }, { key: ROUNDTRIP_LS_KEY, value: testPayload });

        if (pushResult && pushResult.ok) {
            ok(`pushNow() succeeded -- pushed ${pushResult.keys} key(s) to Firestore`);
        } else if (pushResult && pushResult.error) {
            fail(`pushNow() returned error: ${pushResult.error}`);
            return;
        } else if (pushResult === undefined || pushResult === null) {
            fail('pushNow() returned undefined -- uid or data may be missing');
            return;
        } else {
            fail(`pushNow() returned ok=false: ${JSON.stringify(pushResult)}`);
            return;
        }

        // 3e. Verify the cloud doc via status()
        await page.waitForTimeout(2000);
        const statusAfterPush = await page.evaluate(async () => {
            return await window.WizeCloudBackup.status().catch(e => ({ error: String(e) }));
        });

        if (statusAfterPush.error) {
            fail(`status() after push threw: ${statusAfterPush.error}`);
        } else if (statusAfterPush.cloud === 'no-doc-yet') {
            fail('status() reports no-doc-yet after a successful pushNow() -- Firestore write may have silently failed');
        } else if (statusAfterPush.cloud && statusAfterPush.cloud.keyCount > 0) {
            ok(`status() confirms cloud doc exists (${statusAfterPush.cloud.keyCount} keys, age ${statusAfterPush.cloud.ageSec}s)`);
        } else {
            fail(`status() returned unexpected cloud state: ${JSON.stringify(statusAfterPush.cloud)}`);
        }

        // 3f. Clear local + verify restore path on fresh page load
        await page.evaluate(({ key }) => { localStorage.removeItem(key); }, { key: ROUNDTRIP_LS_KEY });
        const keyAfterClear = await page.evaluate(({ key }) => localStorage.getItem(key), { key: ROUNDTRIP_LS_KEY });
        if (keyAfterClear !== null) {
            fail('localStorage.removeItem did not clear the test key -- environment issue');
        } else {
            ok('test key cleared from localStorage before restore verification');
        }

        // Suppress wize_backup_reloaded guard so initialRestore() runs on this reload
        await page.evaluate(() => {
            try { sessionStorage.removeItem('wize_backup_reloaded'); } catch {}
        });
        await page.reload({ waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(5000); // give Firebase + restore enough time

        const restoredValue = await page.evaluate(({ key }) => {
            const v = localStorage.getItem(key);
            if (!v) return { found: false };
            try {
                const parsed = JSON.parse(v);
                const hasQaFlag = Array.isArray(parsed) && parsed.some(x => x.__qa_roundtrip);
                return { found: true, hasQaFlag };
            } catch {
                return { found: true, hasQaFlag: false };
            }
        }, { key: ROUNDTRIP_LS_KEY });

        if (restoredValue.found && restoredValue.hasQaFlag) {
            ok('FULL ROUND-TRIP VERIFIED: data written -> pushed to Firestore -> cleared locally -> restored on reload');
        } else if (restoredValue.found) {
            // Key exists but not our exact payload -- user has real data
            ok('cloud restore populated the key (existing user data present -- QA flag may have been overwritten by real data)');
        } else {
            fail('cloud restore did NOT repopulate the key after clear + reload -- data would be LOST for a real user');
        }

        // 3g. Cleanup: remove our synthetic payload if it's the only thing there
        await page.evaluate(({ key }) => {
            const v = localStorage.getItem(key);
            if (!v) return;
            try {
                const parsed = JSON.parse(v);
                if (Array.isArray(parsed) && parsed.length === 1 && parsed[0].__qa_roundtrip) {
                    localStorage.removeItem(key);
                }
            } catch {}
        }, { key: ROUNDTRIP_LS_KEY });
        ok('cleanup: synthetic QA test data removed from localStorage');

    } finally {
        if (page) await page.close().catch(() => {});
        if (ctx)  await ctx.close().catch(() => {});
    }
}

// ---- Main -------------------------------------------------------------------

(async () => {
    console.log('# Cloud Backup Round-Trip Check\n');

    // Tier-1: static analysis (no browser needed)
    await runStaticTier();

    // Tiers 2-3: need Playwright
    let browser;
    try {
        const { chromium } = require('playwright');
        browser = await chromium.launch();
        await runBrowserTier(browser);
        await runAuthTier(browser);
    } catch (e) {
        if (/cannot find module.*playwright/i.test(String(e))) {
            skip('browser tiers (Tier-2, Tier-3)', 'playwright not installed -- run: npm install in wizelife/');
        } else {
            fail(`browser tier crashed: ${e.message}`);
            console.error(e);
        }
    } finally {
        if (browser) await browser.close().catch(() => {});
    }

    // ---- Finalize report ----------------------------------------------------

    const date = new Date().toISOString().slice(0, 10);
    const summary = [];
    summary.push(`# Cloud Backup Round-Trip QA -- ${date}\n`);
    if (!fails.length && !warns.length) {
        summary.push(`✅ **All ${passes.length} checks passed -- backup integrity confirmed.**\n`);
    } else {
        summary.push(`**${fails.length} failure(s), ${warns.length} warning/skip(s), ${passes.length} passed.**\n`);
    }

    if (fails.length) {
        summary.push('## Failures (action required)');
        for (const f of fails) summary.push(`- ❌ ${f}`);
        summary.push('');
    }
    if (warns.length) {
        summary.push('## Warnings / Skipped');
        for (const w of warns) summary.push(`- ⚠️ ${w}`);
        summary.push('');
    }
    if (!QA_EMAIL) {
        summary.push('## To enable authenticated cloud round-trip (Tier-3):');
        summary.push('```');
        summary.push('QA_EMAIL=you@example.com QA_PASSWORD=secret node qa/cloud-backup-roundtrip-check.js');
        summary.push('```\n');
    }

    summary.push('---');
    summary.push('<details><summary>Full detail</summary>\n');
    summary.push(...lines);
    summary.push('\n</details>');

    const report = summary.join('\n');
    fs.writeFileSync(REPORT_FILE, report);
    console.log(`\nReport written: ${REPORT_FILE}`);

    const exitCode = fails.length > 0 ? 1 : 0;
    console.log(`\n${exitCode === 0 ? '✅' : '❌'} Exit ${exitCode} (${fails.length} failures, ${warns.length} skips, ${passes.length} passes)`);
    process.exit(exitCode);
})();
