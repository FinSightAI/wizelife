/**
 * wize-attribution.js — Capture referral + UTM params to localStorage.
 *
 * QA (biz-logic-suite.js) flagged that ?ref= and ?utm_source= were not
 * being captured, breaking referral attribution + marketing channel ROI.
 *
 * Schema persisted at localStorage.wl_attribution:
 *   {
 *     first: { ts, ref, utm_source, utm_medium, utm_campaign, utm_term,
 *              utm_content, landing_url, referrer },
 *     last:  { same },
 *     touches: count
 *   }
 *
 * - "first" never overwrites (first-touch attribution — campaign that
 *   first brought the user).
 * - "last" updates on every visit with attribution params (last-touch
 *   attribution — campaign that closed the conversion).
 * - 90-day TTL — if first.ts is older than 90 days, treat next visit
 *   with utm params as a new first-touch.
 *
 * Safe: pure localStorage write. No network. No PII.
 *
 * Mount: include via <script src="/js/wize-attribution.js" defer> on every
 * landing page (index.html + /p/* + dashboard.html).
 */
(function () {
  'use strict';
  if (typeof localStorage === 'undefined') return;

  const params = new URLSearchParams(location.search);
  const FIELDS = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const captured = {};
  let hasAny = false;
  for (const f of FIELDS) {
    const v = params.get(f);
    if (v) { captured[f] = v.slice(0, 80); hasAny = true; }
  }
  // No attribution params this visit — nothing to record.
  if (!hasAny) return;

  const now = Date.now();
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

  let store;
  try {
    store = JSON.parse(localStorage.getItem('wl_attribution') || '{}');
  } catch (_) { store = {}; }

  const entry = {
    ts: now,
    landing_url: location.pathname + location.search,
    referrer: (document.referrer || '').slice(0, 200),
    ...captured,
  };

  // First-touch: set only if missing OR expired (>90 days).
  if (!store.first || (now - (store.first.ts || 0) > NINETY_DAYS)) {
    store.first = entry;
  }
  // Last-touch: always update.
  store.last = entry;
  store.touches = (store.touches || 0) + 1;

  try {
    localStorage.setItem('wl_attribution', JSON.stringify(store));
  } catch (_) { /* quota / private mode — silently skip */ }
})();
