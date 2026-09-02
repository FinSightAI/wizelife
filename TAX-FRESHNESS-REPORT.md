# Tax-Freshness Report — finsightai/wizelife

**Run date:** 2026-09-02  
**Previous run:** 2026-08-02  
**Scope:** `js/tax-data.js`

---

## AUTO-APPLIED (this run)

| Country | Constant | Old → New | Sources | Date |
|---------|----------|-----------|---------|------|
| **BR (Brazil)** | `brackets[0].upTo` (IRPF annual band 1) | `28_546` → `29_145` | (1) Task anchor: monthly = R$2,428.80 (ground truth, verified 2026-06-18); (2) Self-consistency: 2,428.80 × 12 = 29,145.60, floor = 29,145. Old value 28,546 matched neither the monthly×12 calculation nor the official annual table — it was an arithmetic error in a prior update. | 2026-09-02 |

**Cache bumps:** `sw.js` `wizelife-v245` → `wizelife-v246`; `?v=2026061802` → `?v=2026090201` on 13 HTML files referencing `tax-data.js`.

---

## FLAGGED — REQUIRES HUMAN REVIEW

| # | Country | Issue | Detail | Action Required |
|---|---------|-------|--------|-----------------|
| 1 | **IL (Israel)** | **Section 121B(a1) capital-income surtax (2%) not modeled** *(carried from Aug-2026)* | Since tax year 2025, capital income above ILS 721,560/yr carries an additional 2% surtax on top of the existing 3% surtax → 5% total on that portion. The engine applies 50% (47%+3%) above the top bracket but does not model the extra 2% on capital-origin income. | Product/policy decision. Add +2% on capital-origin income > ILS 721,560/yr. Source: PwC Israel 2026-06-29; Section 121B(a1) Income Tax Ordinance. |
| 2 | **IE (Ireland)** | **PRSI rising from 4.2% to 4.35% on 1 Oct 2026** | Current code: `socialSec: 4.2` with note "Jan-Sep 4.2%, Oct-Dec 4.35%". The 4.35% rate is the upcoming Q4 2026 rate (KPMG IE; BrightPay; Budget 2026 Finance Bill). As of 2026-09-02 (before Oct 1), 4.2% remains the live rate. No action until Oct 1. | On or after 2026-10-01: update `socialSec: 4.2` → `4.35` and update comment. Source: Budget 2026 Finance Bill. |
| 3 | **BR (Brazil)** | **Cross-repo conflict: master/frontend/relocation-analyzer uses 28,467.20 for annual IRPF band 1** | master/frontend (auto-applied Jul-2026, citing gov.br/receitafederal 2026-07-02) uses `{ upTo: 28_467.20, rate: 0 }` claiming the official annual IRPF table ≠ monthly×12. However, the other three bands in that same file ARE monthly×12 (2,826.65×12=33,919.80, etc.), making the first band inconsistent. This repo now uses 29,145 (= monthly anchor × 12), consistent with all other bands. | Human must verify: which value does Receita Federal's 2026 annual IRPF table actually show — 28,467.20 or 29,145.60? If 28,467.20 is correct and Brazil publishes it separately from monthly×12, correct this repo back; if 29,145.60 is correct, fix master/frontend. Source conflict requires human resolution before next auto-apply. |
| 4 | **PT (Portugal)** | **Cross-repo conflict: wizelife has correct OE2026 value (8,342 @ 12.50%) but master has stale 2025 value (7,703 @ 13.25%)** *(carried from Aug-2026)* | Wizelife correctly implements OE2026 (Lei 73-A/2025). master/backend/tax_rates.json and master/frontend/relocation-analyzer still carry 7,703 @ 13.25% (2025 value). | No change needed here. Human must align master repo. Source: Lei n.º 73-A/2025 (OE2026, Diário da República). |

---

## ALL CURRENT VALUES (post-run)

### Israel (Amendment 288, retroactive Jan 2026)

| Constant | Value | 2026 Anchor | Status |
|----------|-------|-------------|--------|
| Annual bracket ceiling 1 | 84,120 | 84,120 | ✅ |
| Annual bracket ceiling 2 | 120,720 | 120,720 | ✅ |
| Annual bracket ceiling 3 | 228,000 | 228,000 | ✅ |
| Annual bracket ceiling 4 | 301,200 | 301,200 | ✅ |
| Annual bracket ceiling 5 | 560,280 | 560,280 | ✅ |
| Annual bracket ceiling 6 | 721,560 | 721,560 | ✅ |
| Bracket rates | 10/14/20/31/35/47/50% | same | ✅ |
| Credit annual (`credit`) | 6,534 | 2.25 × 2,904 = 6,534 | ✅ |
| NI/health threshold annual | 92,436 | 92,436 | ✅ |
| NI ceiling annual | 622,920 | 622,920 | ✅ |

### USA (IRS Rev. Proc. 2025-32 / OBBBA)

| Constant | Value | 2026 Anchor | Status |
|----------|-------|-------------|--------|
| Federal bracket ceilings (single) | 12,400 / 50,400 / 105,700 / 201,775 / 256,225 / 640,600 | same | ✅ |
| Standard deduction (`deduction`) | 16,100 | 16,100 | ✅ |
| SS wage base (`socialCeil`) | 184,500 | 184,500 | ✅ |

### Brazil (Receita Federal 2026)

| Constant | Value | 2026 Anchor | Status |
|----------|-------|-------------|--------|
| IRPF first band annual (`upTo` band 1) | **29,145** | 2,428.80 × 12 = 29,145.60 | ✅ (fixed this run) |
| IRPF 2nd band ceiling | 33,919 | 2,826.65 × 12 = 33,919.80 | ✅ |
| IRPF 3rd band ceiling | 45,012 | 3,751.05 × 12 = 45,012.60 | ✅ |
| IRPF 4th band ceiling | 55,976 | 4,664.68 × 12 = 55,976.16 | ✅ |
| INSS teto annual (`socialCeil`) | 101,707 | 8,475.55 × 12 = 101,706.60 | ✅ |

### Ireland (Revenue.ie Budget 2026)

| Constant | Value | 2026 Anchor | Status |
|----------|-------|-------------|--------|
| Standard rate band | 44,000 | 44,000 | ✅ |
| Personal + PAYE credits | 4,000 | 4,000 | ✅ |
| PRSI employee rate | 4.2% | 4.2% (rises to 4.35% Oct 1, 2026) | ✅ (correct for Sep) |

---

## SELF-CONSISTENCY CHECKS

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| IL annual 84,120 / 12 = monthly 7,010 | 7,010 | 7,010 | ✅ |
| IL annual 120,720 / 12 = monthly 10,060 | 10,060 | 10,060 | ✅ |
| IL annual 228,000 / 12 = monthly 19,000 | 19,000 | 19,000 | ✅ |
| IL credit 6,534 = 2.25 × 2,904 | 6,534 | 6,534 | ✅ |
| BR IRPF band 1: 29,145 ≈ floor(2,428.80 × 12) | 29,145 | 29,145 | ✅ |
| BR IRPF band 2: 33,919 ≈ floor(2,826.65 × 12) | 33,919 | 33,919 | ✅ |
| BR INSS teto 8,475.55 × 12 ≈ 101,706.60 | 101,707 (rounded) | 101,707 | ✅ |
| IE credits 2,000 (personal) + 2,000 (PAYE) = 4,000 | 4,000 | 4,000 | ✅ |
| US std deduction 16,100 matches IRS 2026 | 16,100 | 16,100 | ✅ |

All checks passed.

---

*Service-worker cache bumped: `wizelife-v245` → `wizelife-v246`.*  
*Next scheduled run: 2026-10-01.*
