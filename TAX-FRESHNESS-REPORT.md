# TAX-FRESHNESS-REPORT — finsightai/wizelife
_Generated: 2026-10-02 by automated monthly tax-data freshness check_

## Summary
| Status | Count |
|--------|-------|
| AUTO-APPLIED changes | 2 values in `js/tax-data.js` |
| Cache-bust updates | 14 files (sw.js + 13 HTML) |
| Flagged items | 0 |

---

## AUTO-APPLIED Changes

### js/tax-data.js

**Change 1 — IE PRSI rate: 4.2% → 4.35%**
- Field: `IE.socialSec`
- Old value: `4.2`
- New value: `4.35`
- Reason: PRSI Class A Schedule E increase took effect Oct 1, 2026 (today Oct 2, 2026 — in effect)
- Sources (≥2 independent official):
  1. gov.ie — Social Welfare Rates 2026
  2. Revenue.ie — PRSI contribution rates 2026
- Criteria met: (a) ≥2 sources agree (b) numeric refresh only (c) magnitude 0.15pp change < 25% (d) no structural change (e) —
- Also updated: IE.notes Hebrew text, IE.lastVerified → 2026-10, TAX_META.updatedAt → 2026-10-02, changelog entry added

### sw.js
- CACHE version bumped: `wizelife-v246` → `wizelife-v247` (required after js/tax-data.js change)

### HTML cache-busting (13 files)
- Query string updated: `tax-data.js?v=2026090201` → `tax-data.js?v=2026100201`
- Files: tax-compare.html, salary-compare.html, p/relocate-uae.html, p/relocate-bali.html, p/relocate-italy.html, p/relocate-spain.html, p/relocate-greece.html, p/relocate-brazil.html, p/relocate-cyprus.html, p/relocate-romania.html, p/relocate-thailand.html, p/relocate-bulgaria.html, p/relocate-portugal.html

---

## Values Verified Correct (no change needed)

| Country | Field | Value | Status |
|---------|-------|-------|--------|
| IL | incomeTax brackets | 7,010/10,060/19,000/25,100/46,690/60,130 ILS/mo | ✓ CORRECT |
| IL | creditPoint | 242 ILS/mo (2,904/yr) | ✓ CORRECT |
| IL | BL ceiling | 51,910 ILS/mo (622,920/yr) | ✓ CORRECT |
| IL | VAT | 18% | ✓ CORRECT |
| IE | personalCredit | 4,000 EUR | ✓ CORRECT |
| IE | standardBand | 44,000 EUR | ✓ CORRECT |
| BR | IRPF first band | 2,428.80 BRL/mo | ✓ CORRECT |
| BR | INSS teto | 8,475.55 BRL | ✓ CORRECT |
| US | stdDeduction | 16,100 USD | ✓ CORRECT |
| US | SS wage base | 184,500 USD | ✓ CORRECT |

---

## Flagged Items
_None._

---

_Next scheduled check: 2026-11-01_
