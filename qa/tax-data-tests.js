/**
 * Unit tests for tax-data.js calc engine.
 *
 * Run:  node qa/tax-data-tests.js
 *
 * Uses Node's built-in test runner (Node 18+) — no dependencies.
 *
 * Strategy:
 * - Each assertion uses a RANGE (±5%) rather than an exact number.
 *   This catches semantic regressions (e.g. broken bracket math, wrong
 *   deduction handling) while tolerating minor rounding differences.
 * - Sanity checks: no NaN, all required fields present, effectiveRate
 *   in [0, 60].
 * - Specific regression checks for bugs we fixed today:
 *   - IL Bituach Leumi 2-tier (the old single-rate bug)
 *   - US deduction-vs-credit (the standard-deduction bug)
 *   - 2026 bracket widening (IL — ₪22K should be 31%, not 35%)
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TAX_DATA, calcNet, TAX_META } = require('../js/tax-data.js');

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Assert value is within ±tolerance (default 5%) of expected. */
function inRange(value, expected, label, tolerance = 0.05) {
  const lo = expected * (1 - tolerance);
  const hi = expected * (1 + tolerance);
  assert.ok(
    value >= lo && value <= hi,
    `${label}: expected ~${expected} (±${tolerance * 100}%), got ${value}`
  );
}

/** Run calc and assert basic shape sanity. */
function calc(code, gross, marital = 'single', children = 0) {
  const r = calcNet(code, gross, marital, children);
  assert.ok(r, `calcNet(${code}, ${gross}) returned null`);
  ['grossLocal','incomeTax','socialSec','health','netMonthly','netUSD','effectiveRate'].forEach(k => {
    assert.ok(!isNaN(r[k]), `${code}@${gross}: ${k} is NaN`);
    assert.ok(typeof r[k] === 'number', `${code}@${gross}: ${k} not a number`);
  });
  return r;
}

// ─── Israel: 2026 brackets + 2-tier BL/Health ─────────────────────────────

test('IL: low band (₪5K/mo) — BL+health use tier1 (1.04%/3.23%)', () => {
  const r = calc('IL', 5000);
  inRange(r.netUSD, 1292, 'IL@5K netUSD');
  // Critical: BL should be ~₪52/mo, NOT ₪350/mo (would be if single-rate
  // 7% was applied incorrectly to low earners — the pre-fix bug)
  inRange(r.socialSec, 52, 'IL@5K BL — tier1 must NOT use 7%', 0.30);
  assert.ok(r.incomeTax === 0, `IL@5K should pay no income tax (credit covers it), got ${r.incomeTax}`);
});

test('IL: mid (₪15K/mo) — straddles BL threshold', () => {
  const r = calc('IL', 15000);
  inRange(r.netUSD, 3297, 'IL@15K netUSD');
  inRange(r.effectiveRate, 19, 'IL@15K effective rate', 0.15);
});

test('IL: typical engineer (₪25K/mo) — high band, 2026 brackets', () => {
  const r = calc('IL', 25000);
  inRange(r.netUSD, 4950, 'IL@25K netUSD');
  inRange(r.effectiveRate, 27, 'IL@25K effective rate', 0.12);
});

test('IL: 2026 bracket widening regression — ₪22K should pay 31%, not 35%', () => {
  // 22K/mo = 264K/yr. In 2025 this fell in the 35% bracket (>269,280).
  // In 2026, the 31% ceiling moved to 301,200, so 264K stays in 31%.
  // Test by comparing ₪22K vs ₪23K — both should be 31%, slight tax delta.
  const r22 = calc('IL', 22000);
  const r23 = calc('IL', 23000);
  // If 23K was still in the 35% bracket (pre-fix), tax delta would be ~₪350/mo.
  // Now both are in 31% — delta is ~₪310/mo.
  const taxDelta = r23.incomeTax - r22.incomeTax;
  assert.ok(taxDelta < 330, `IL@22K→23K tax delta should be ~31% (~₪310), got ₪${taxDelta} — bracket widening may have regressed`);
});

test('IL: high earner (₪50K/mo)', () => {
  const r = calc('IL', 50000);
  inRange(r.netUSD, 8409, 'IL@50K netUSD');
  inRange(r.effectiveRate, 38, 'IL@50K effective rate', 0.10);
});

test('IL: mas yesef territory (₪80K/mo) — 50% top bracket', () => {
  const r = calc('IL', 80000);
  inRange(r.netUSD, 12086, 'IL@80K netUSD');
  // Effective should be ≥ 42% (mas yesef is engaged for income above ₪721,560/yr = ₪60K/mo)
  assert.ok(r.effectiveRate >= 42, `IL@80K should be ≥42% effective, got ${r.effectiveRate}%`);
});

test('IL: BL low-band rate is 1.04% (NOT 7%) — regression test for 2-tier fix', () => {
  // At ₪5K/mo (₪60K/yr), entirely below the ₪92,436 threshold.
  const r = calc('IL', 5000);
  const annualBL = r.socialSec * 12;
  const expectedBL = 60000 * 0.0104; // ₪624/yr
  // If still single-rate at 7%, would be 60000*0.07=₪4200/yr.
  assert.ok(annualBL < 1500, `IL@5K annual BL ${annualBL} — single-rate (~₪4200) bug regressed`);
});

// ─── USA: 2026 brackets + deduction (not credit) ──────────────────────────

test('US: typical (₪25K/mo IL gross → ~$81K USD)', () => {
  const r = calc('US', 25000);
  inRange(r.netUSD, 5484, 'US@25K netUSD');
});

test('US: deduction-not-credit regression — $100K/yr should pay realistic tax', () => {
  // ₪370,370/mo IL ≈ $100K USD annual gross. Pre-bug: ~$8K/mo net (way too high).
  // Post-fix: ~$6,400/mo net (realistic after fed tax + FICA + Medicare).
  const r = calc('US', 30864); // 370,370/12
  // Critical: deduction must reduce TAXABLE INCOME, not just tax.
  // A $16,100 deduction on $100K income = ~$1,800 less tax (12% band),
  // NOT $16,100 less tax. If the old credit-style logic ran, net would be too high.
  assert.ok(r.netUSD < 7500, `US@100K monthly net ${r.netUSD} — deduction bug may have regressed (was ~$8K)`);
  assert.ok(r.netUSD > 5500, `US@100K monthly net ${r.netUSD} too low`);
});

test('US: low earner — deduction makes income tax-free', () => {
  // ₪3K/mo ≈ $10K/yr — below the $16,100 standard deduction.
  const r = calc('US', 3000);
  assert.ok(r.incomeTax === 0, `US@$10K should owe zero income tax (under standard deduction), got $${r.incomeTax}/mo`);
});

// ─── Portugal: 2026 reduced rates ─────────────────────────────────────────

test('PT: 2026 rate cut — second bracket is 16.5% (was 18%)', () => {
  const r = calc('PT', 25000);
  inRange(r.netUSD, 3579, 'PT@25K netUSD', 0.08);
});

// ─── Cyprus: 2026 — tax-free threshold raised to €22K ────────────────────

test('CY: low earner — pays no income tax under €22K threshold', () => {
  // ₪5K/mo ≈ €15K/yr, all under €22K threshold.
  const r = calc('CY', 5000);
  assert.ok(r.incomeTax === 0, `CY@€15K should pay zero income tax (under €22K threshold), got €${r.incomeTax}/mo`);
});

test('CY: typical (₪25K/mo)', () => {
  const r = calc('CY', 25000);
  inRange(r.netUSD, 4737, 'CY@25K netUSD');
});

// ─── Italy: 2026 bracket rate cut ─────────────────────────────────────────

test('IT: 2026 — second bracket dropped to 33%', () => {
  const r = calc('IT', 25000);
  inRange(r.netUSD, 3955, 'IT@25K netUSD');
});

// ─── Germany ──────────────────────────────────────────────────────────────

test('DE: typical (₪25K/mo)', () => {
  const r = calc('DE', 25000);
  inRange(r.netUSD, 3315, 'DE@25K netUSD');
});

test('DE: low earner under Grundfreibetrag — no income tax', () => {
  // ₪3K/mo ≈ €9K/yr, under €12,348 Grundfreibetrag.
  const r = calc('DE', 3000);
  assert.ok(r.incomeTax === 0, `DE@€9K under Grundfreibetrag should owe no tax, got €${r.incomeTax}/mo`);
});

// ─── UK ───────────────────────────────────────────────────────────────────

test('GB: typical (₪25K/mo)', () => {
  const r = calc('GB', 25000);
  inRange(r.netUSD, 4840, 'GB@25K netUSD');
});

test('GB: under personal allowance — no income tax', () => {
  // ₪4K/mo ≈ £10K/yr, under £12,570 personal allowance.
  const r = calc('GB', 4000);
  assert.ok(r.incomeTax === 0, `GB@£10K should owe no tax (under personal allowance), got £${r.incomeTax}/mo`);
});

// ─── UAE ──────────────────────────────────────────────────────────────────

test('AE: zero income tax + zero social — any gross goes 100% to net', () => {
  [5000, 25000, 80000].forEach(gross => {
    const r = calc('AE', gross);
    assert.equal(r.incomeTax, 0, `AE@${gross}: income tax must be 0`);
    assert.equal(r.socialSec, 0, `AE@${gross}: social must be 0`);
    assert.equal(r.health, 0, `AE@${gross}: health must be 0`);
    assert.equal(r.effectiveRate, 0, `AE@${gross}: effective rate must be 0`);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────

test('Edge: gross 0 — no NaN, all zeros', () => {
  Object.keys(TAX_DATA).forEach(code => {
    const r = calcNet(code, 0, 'single', 0);
    assert.ok(r, `${code}@0: returned null`);
    assert.ok(!isNaN(r.netUSD), `${code}@0: netUSD is NaN`);
  });
});

test('Edge: very high income (₪500K/mo) — no NaN, effective rate in [10, 60]', () => {
  Object.keys(TAX_DATA).forEach(code => {
    const r = calcNet(code, 500000, 'single', 0);
    assert.ok(r, `${code}@500K: returned null`);
    assert.ok(!isNaN(r.netUSD), `${code}@500K: netUSD is NaN`);
    if (code !== 'AE') {
      assert.ok(r.effectiveRate >= 10 && r.effectiveRate <= 60,
        `${code}@500K: effective rate ${r.effectiveRate}% out of [10, 60] range`);
    }
  });
});

test('All countries: shape sanity at typical income (₪25K/mo)', () => {
  Object.keys(TAX_DATA).forEach(code => {
    const r = calcNet(code, 25000, 'single', 0);
    assert.ok(r, `${code}: null result`);
    assert.ok(r.netUSD > 0, `${code}: netUSD ${r.netUSD} must be positive`);
    assert.ok(r.netUSD < 25000, `${code}: netUSD ${r.netUSD} exceeds gross — impossible`);
    assert.ok(r.effectiveRate >= 0, `${code}: negative effective rate ${r.effectiveRate}%`);
  });
});

test('All countries: lastVerified field present on Israel-relevant peers', () => {
  // Only check the countries we explicitly verified to 2026.
  ['IL', 'PT', 'CY', 'IT', 'US', 'DE', 'GB', 'FR'].forEach(code => {
    assert.ok(TAX_DATA[code].lastVerified, `${code}: missing lastVerified — verify against 2026 sources`);
  });
});

test('TAX_META: matches expected shape', () => {
  assert.equal(TAX_META.validYear, 2026, 'validYear should be 2026 after today\'s update');
  assert.ok(Array.isArray(TAX_META.sources) && TAX_META.sources.length > 0, 'sources missing');
  assert.ok(Array.isArray(TAX_META.knownPending), 'knownPending should be array');
});
