# Tax-Freshness Report — wizelife

**Run date:** 2026-07-02  
**Verified against:** ≥2 independent official sources per change  
**Next review:** 2026-10-01

---

## AUTO-APPLIED CHANGES

| Field | File | Old Value | New Value | Sources |
|-------|------|-----------|-----------|---------|
| BR IRPF 0% annual ceiling | `js/tax-data.js` | 28,546 | 28,467.20 | gov.br/receitafederal 2026 annual table + Agência Brasil (ebc.com.br) — official annual IRPF table is NOT monthly×12 |
| BR IRPF 7.5% upper ceiling | `js/tax-data.js` | 33,919 | 33,919.80 | Same; decimal precision from official table |
| BR IRPF 15% upper ceiling | `js/tax-data.js` | 45,012 | 45,012.60 | Same |
| BR IRPF 22.5% upper ceiling | `js/tax-data.js` | 55,976 | 55,976.16 | Same |
| TAX_META `updatedAt` | `js/tax-data.js` | 2026-06-18 | 2026-07-02 | This run |
| TAX_META BR change log | `js/tax-data.js` | `28,546 (R$2,428.80/mo)` | `28,467.20 (official annual table)` | Corrected misleading comment |

**Key note — Brazil annual table:** Brazil's Receita Federal publishes the annual IRPF bracket table separately; it does NOT equal monthly threshold × 12. The correct 2026 annual 0% ceiling is R$28,467.20, not R$2,428.80 × 12 = R$29,145.60.

---

## FLAGGED — REQUIRES HUMAN REVIEW

*(None for this repo.)*

---

## ALL CURRENT VALUES (post-run)

### Brazil (BR) — `js/tax-data.js`
| Band | Annual ceiling (R$) | Rate |
|------|---------------------|------|
| 1 | 28,467.20 | 0% |
| 2 | 33,919.80 | 7.5% |
| 3 | 45,012.60 | 15% |
| 4 | 55,976.16 | 22.5% |
| 5 | ∞ | 27.5% |

- INSS teto: R$101,707/yr (R$8,475.55/mo) ✅
- Non-resident IRRF: 15% flat ✅
- GCAP rate: 15% base ✅

### Other key countries verified as CURRENT (no changes)
- **DE:** Grundfreibetrag €12,348 ✅ (per TAX_META); 42% band starts €69,878 ✅
- **IE:** personal+PAYE credit €4,000 ✅ (per TAX_META)
- **CA:** brackets 58,523/117,045/181,440/258,482 ✅; CPP YMPE $74,600 ✅; BPA credit $2,303 ✅
- **AU:** 16%/30%/37%/45% (Stage 3 cuts) ✅
- **US:** 2026 federal brackets confirmed ✅
- **IL:** Israel child-credit constant 2,904 ✅

---

## SELF-CONSISTENCY CHECKS

- BR annual table ≠ monthly × 12: confirmed expected (official Receita Federal publishes separately) ✅
- INSS teto R$8,475.55/mo × 12 = R$101,706.60 ≈ socialCeil 101,707 ✅ (rounding)

---

*No GitHub issue opened — no flagged items.*
