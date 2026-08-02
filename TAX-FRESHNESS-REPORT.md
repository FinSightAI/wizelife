# Tax-Freshness Report — finsightai/wizelife

**Run date:** 2026-08-02  
**Previous run:** (none — first report for this repo)  
**Scope:** `js/tax-data.js`

---

## AUTO-APPLIED (this run)

| Country | Constant | Old → New | Sources | Date |
|---------|----------|-----------|---------|------|

*Nothing auto-applied this run.*

---

## FLAGGED — REQUIRES HUMAN REVIEW

| # | Country | Issue | Detail | Action Required |
|---|---------|-------|--------|-----------------|
| 1 | **IL (Israel)** | **Section 121B(a1) capital-income surtax (2%) not modeled** | Since tax year 2025, capital income (capital gains, dividends, interest, rental income, passive royalties) above ILS 721,560/yr carries an additional 2% surtax on top of the existing 3% general surtax → total 5% surtax on that portion. The current engine applies 50% above the top bracket (3% surtax included) but does not model the extra 2% on capital-source income. | Product/policy decision required. If modeling capital income scenarios, add +2% on capital-origin income > ILS 721,560/yr. Source: PwC Israel (updated 2026-06-29); Section 121B(a1) Income Tax Ordinance. |
| 2 | **BR (Brazil)** | **Annual IRPF first band (28,546) inconsistent with official 2026 annual table and with code comment** | Code has `{ upTo: 28_546, rate: 0 }` with comment "R$2,428.80/mo ×12". But 2,428.80 × 12 = 29,145.60, not 28,546. The official Receita Federal 2026 annual IRPF table gives **28,467.20** (Brazil publishes annual tables separately from monthly×12; verified by master repo Jul-2026 auto-apply citing gov.br + Agência Brasil). Discrepancy: 28,546 vs 28,467.20 (Δ+78.80; 0.3%). | Update `upTo: 28_546` → `28_467.20` and correct comment from "R$2,428.80/mo ×12" to "official Receita Federal 2026 annual table (≠ monthly×12)". Sources: gov.br/receitafederal annual IRPF table 2026 + Agência Brasil. |
| 3 | **PT (Portugal)** | **Cross-repo conflict: wizelife has correct OE2026 value (8,342 @ 12.50%) but master has stale 2025 value (7,703 @ 13.25%)** | `js/tax-data.js` correctly implements OE2026 (Lei 73-A/2025): first band `{ upTo: 8_342, rate: 12.50 }`. However `master/backend/knowledge/static_data/tax_rates.json` was manually updated 2026-06-25 to `7,703 @ 13.25%` (claiming finanças.gov.pt as source, but 7,703 @ 13.25% is the 2025/OE2025 value). The master's own Jul-2026 checker already flagged relocation-analyzer for the same issue. | No change needed in wizelife (value here is correct). Human must align master repo (both relocation-analyzer and tax_rates.json) to 8,342 @ 12.50% per Lei 73-A/2025. Source: Diário da República — Lei n.º 73-A/2025 (OE2026, passed 2025-12-30). |

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
| NI/health threshold annual (`socialSec_threshold`) | 92,436 | 92,436 | ✅ |
| NI ceiling annual (`socialCeil`) | 622,920 | 622,920 | ✅ |
| Health tier 1 (`health_tier1`) | 3.23% | 3.23% | ✅ |
| Health tier 2 (`health_tier2`) | 5.17% | 5.17% | ✅ |
| BL tier 1 (`socialSec_tier1`) | 1.04% | 1.04% | ✅ |
| BL tier 2 (`socialSec_tier2`) | 7.0% | 7.0% | ✅ |

### USA (IRS Rev. Proc. 2025-28 / OBBBA)

| Constant | Value | 2026 Anchor | Status |
|----------|-------|-------------|--------|
| Federal bracket ceilings (single) | 12,400 / 50,400 / 105,700 / 201,775 / 256,225 / 640,600 | same | ✅ |
| Standard deduction (`deduction`) | 16,100 | 16,100 | ✅ |
| SS wage base (`socialCeil`) | 184,500 | 184,500 | ✅ |

### Brazil (Receita Federal 2026)

| Constant | Value | 2026 Anchor | Status |
|----------|-------|-------------|--------|
| IRPF first band annual (`upTo` band 1) | 28,546 | 28,467.20 (official annual table) | ⚠️ FLAG #2 |
| IRPF 2nd band ceiling | 33,919 | ≈33,919.80 (2,826.65×12) | ✅ |
| IRPF 3rd band ceiling | 45,012 | ≈45,012.60 (3,751.05×12) | ✅ |
| IRPF 4th band ceiling | 55,976 | ≈55,976.16 (4,664.68×12) | ✅ |
| INSS teto annual (`socialCeil`) | 101,707 | ≈101,706.60 (8,475.55×12) | ✅ |

### Ireland (Revenue.ie Budget 2026)

| Constant | Value | 2026 Anchor | Status |
|----------|-------|-------------|--------|
| Standard rate band | 44,000 | 44,000 | ✅ |
| Personal + PAYE credits | 4,000 | 4,000 | ✅ |
| PRSI employee rate | 4.2% | 4.2% (rises to 4.35% Oct 2026) | ✅ |

### Germany (DRV/BMG 2026)

| Constant | Value | 2026 Anchor | Status |
|----------|-------|-------------|--------|
| RV ceiling annual (`socialCeil`) | 101,400 | 101,400 | ✅ |
| KV ceiling annual (`healthCeil`) | 69,750 | 69,750 | ✅ |

### Portugal (OE2026 Lei 73-A/2025)

| Constant | Value | 2026 Anchor | Status |
|----------|-------|-------------|--------|
| First band ceiling | 8,342 | 8,342 (OE2026) | ✅ in wizelife |
| First band rate | 12.50% | 12.50% | ✅ in wizelife |

> Note: master repo has conflicting 7,703 @ 13.25% — see Flag #3.

### Greece (Law 5246/2025, effective Jan 2026)

| Constant | Value | 2026 Anchor | Status |
|----------|-------|-------------|--------|
| 6-bracket structure | 9/20/26/34/39/44% | same | ✅ |
| New 39% band (€40,001–€60,000) | present | present | ✅ |

---

## SELF-CONSISTENCY CHECKS

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| IL annual 84,120 / 12 = monthly 7,010 | 7,010 | 7,010 | ✅ |
| IL annual 120,720 / 12 = monthly 10,060 | 10,060 | 10,060 | ✅ |
| IL annual 228,000 / 12 = monthly 19,000 | 19,000 | 19,000 | ✅ |
| IL NI ceiling 622,920 / 12 = monthly 51,910 | 51,910 | 51,910 | ✅ |
| IL credit 6,534 = 2.25 × 2,904 | 6,534 | 6,534 | ✅ |
| IE credits 2,000 (personal) + 2,000 (PAYE) = 4,000 | 4,000 | 4,000 | ✅ |
| BR INSS teto 8,475.55 × 12 ≈ 101,706.60 | 101,707 (rounded) | 101,707 | ✅ |
| BR IRPF band 1: code 28,546 vs official annual table 28,467.20 | match | MISMATCH Δ+78.80 | ⚠️ FLAG #2 |

---

*Service-worker cache: `wizelife-v245` (unchanged — no auto-applies this run).*  
*Next scheduled run: 2026-09-01.*
