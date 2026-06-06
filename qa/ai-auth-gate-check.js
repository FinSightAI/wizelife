#!/usr/bin/env node
/**
 * AI auth-gate guard.
 *
 * The AI backends MUST reject anonymous requests. If a gate is ever removed, the
 * AI (and its Gemini/LLM bill) becomes public → runaway cost + abuse. This locks
 * the behavior verified 2026-06-05: anonymous POST → 401. A 2xx here is a
 * SECURITY regression (the gate is open).
 *
 * Node-only (fetch), no browser. ~5s.
 */
const { makeReporter } = require('./shared-lib/helpers');
const { step, warn, finalize } = makeReporter('AI-Auth-Gate');

const ENDPOINTS = [
  { name: 'WizeTax /api/chat',          url: 'https://wizetax-backend-3ol2retcla-uc.a.run.app/api/chat', body: { message: 'x' } },
  { name: 'WizeHealth /api/chat',       url: 'https://health.wizelife.ai/api/chat',                       body: { message: 'x' } },
  { name: 'aiProxy (Cloud Function)',   url: 'https://us-central1-finzilla-7f1f9.cloudfunctions.net/aiProxy', body: { data: { prompt: 'x' } } },
];

(async () => {
  for (const e of ENDPOINTS) {
    await step(`${e.name} rejects anonymous (no open gate)`, async () => {
      let status;
      try {
        const r = await fetch(e.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(e.body),
          signal: AbortSignal.timeout(45000), // tolerate cold start
        });
        status = r.status;
      } catch (err) {
        // Network/timeout — can't confirm the gate; warn rather than green-pass.
        warn(`${e.name}: could not reach endpoint (${String(err).slice(0, 50)})`, 'retry when warm');
        return;
      }
      // THE security assertion: anonymous must NOT get a 2xx success.
      if (status >= 200 && status < 300) {
        throw new Error(`OPEN GATE — anonymous request got HTTP ${status}. The AI is publicly callable!`);
      }
      // 401/403 is the clean expected gate. Anything else (404/500/307) isn't an
      // open gate but isn't the expected rejection either — surface it.
      if (![401, 403].includes(status)) {
        warn(`${e.name}: rejected with HTTP ${status} (expected 401/403)`, 'verify the auth gate still returns a clean 401');
      }
    });
  }
  // ── SSO token-exchange guard ──────────────────────────────────────────────
  // issueCustomToken must NOT mint a session for a forged/expired ID token —
  // that would let anyone impersonate any user across all apps. A `customToken`
  // in the response to bad input is a critical breach.
  const ICT = 'https://us-central1-finzilla-7f1f9.cloudfunctions.net/issueCustomToken';
  const postICT = async (data, ms) => {
    const r = await fetch(ICT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }), signal: AbortSignal.timeout(ms),
    });
    return { status: r.status, body: await r.text() };
  };
  await step('issueCustomToken rejects a forged ID token (no session minted)', async () => {
    const { status, body } = await postICT({ idToken: 'garbage.forged.token' }, 30000);
    if (status >= 200 && status < 300 && /customToken/.test(body)) {
      throw new Error('FORGED TOKEN ACCEPTED — issueCustomToken minted a session for a fake idToken!');
    }
  });
  await step('issueCustomToken rejects empty input (no token minted)', async () => {
    const { status, body } = await postICT({}, 20000);
    if (status >= 200 && status < 300 && /customToken/.test(body)) {
      throw new Error('issueCustomToken returned a token for empty input');
    }
  });

  finalize('ai-auth-gate-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
