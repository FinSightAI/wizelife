# 🚨 WizeTax-FlowsV2 action items — 2026-05-16

**1 failure(s), 3 warning(s), 9 pass.**

## For Claude to fix:
- ❌ Multi-language i18n: html dir flips when EN clicked — html still rtl after EN click

## For you to investigate:
- ⚠️ only 1 flags visible — list may be tab-gated
- ⚠️ Send button not found
- ⚠️ only 1 distinct years on page — timeline may be tab-gated

---
_<details><summary>Full detail</summary>_

# WizeTax-FlowsV2 QA — 2026-05-16

- ⚠️ only 1 flags visible — list may be tab-gated
- ✅ Country list — exposes ≥20 countries (we added 8 waves)
- ✅ Chat input has reasonable maxlength (>= 500 chars)
- ⚠️ Send button not found
- ✅ Send first chat → wait → send second → both visible
- ❌ Multi-language i18n: html dir flips when EN clicked — html still rtl after EN click
- ✅ Saved sessions area — page handles 0 sessions gracefully
- ✅ Profile saved to localStorage — survives reload
- ✅ OECD source attribution visible
- ✅ Israel income simulator route reachable
- ✅ Payslip OCR file input accepts PDF/image MIME
- ⚠️ only 1 distinct years on page — timeline may be tab-gated
- ✅ Tax timeline — has dated entries (events with years)

</details>