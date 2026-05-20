# 🚨 WizeMoney-FlowsV6 action items — 2026-05-20

**0 failure(s), 7 warning(s), 30 pass.**

## For you to investigate:
- ⚠️ ImageImport.ensureTesseract not available
- ⚠️ ImageImport.extractPayslip unavailable
- ⚠️ ImageImport.extractPayslip unavailable
- ⚠️ processPayslipPDF unavailable
- ⚠️ showSmartPreviewModal unavailable
- ⚠️ no [data-pro] / lock markers in sidebar — expected when PAYWALL_ACTIVE=false; verify Pro wiring exists
- ⚠️ SW controller present but offline navigation served no shell — verify sw.js fetch-handler fallback

---
_<details><summary>Full detail</summary>_

# WizeMoney-FlowsV6 QA — 2026-05-20

- ✅ 1/OCR: profile page exposes ImageImport module + scanPayslip() entry point
- ✅ 2/OCR: pdf.js (pdfjsLib) loads on profile page and worker is configured
- ⚠️ ImageImport.ensureTesseract not available
- ✅ 3/OCR: ensureTesseract() lazy-loads Tesseract.js from CDN on demand
- ⚠️ ImageImport.extractPayslip unavailable
- ✅ 4/OCR: extractPayslip() returns null for non-payslip text (graceful, no throw)
- ⚠️ ImageImport.extractPayslip unavailable
- ✅ 5/OCR: extractPayslip() recognizes a Hebrew payslip and extracts gross/net
- ⚠️ processPayslipPDF unavailable
- ✅ 6/OCR: processPayslipPDF guards on missing pdfjsLib (no uncaught crash path)
- ⚠️ showSmartPreviewModal unavailable
- ✅ 7/OCR: showSmartPreviewModal escapes OCR-extracted strings (XSS-safe rendering)
- ✅ 8/TxEdge: emoji + HTML in description survives addExpense without breaking storage
- ✅ 9/TxEdge: negative + huge + future-date amounts do not throw in addExpense
- ✅ 10/TxEdge: I18n.formatCurrency handles negative / huge / NaN without crashing
- ✅ 11/Quota: writing a large blob near quota fails gracefully (catchable QuotaExceeded)
- ✅ 12/Quota: app still reads existing data after a failed oversized write
- ✅ 13/Quota: Storage.get returns a safe default (not undefined) for missing keys
- ✅ 14/SW: finsight-v299 cache present (or newer) after settle
- ✅ 15/SW: no infinite reload loop — page does not navigate >1 time within 9s
- ✅ 16/SW: registration has no perpetually-installing worker after 8s (clean activation)
- ✅ 17/RAG: ai-chat builds a financial context block from local data
- ✅ 18/RAG: system prompt includes ground-truth enforcement footer
- ✅ 19/RAG: ai-chat has a send control + textarea wired to sendMessage()
- ✅ 20/Currency: formatCurrency renders distinct symbols for ILS / USD / BRL
- ✅ 21/Currency: switching language flips getCurrency() default currency code
- ✅ 22/Currency: formatNumber respects locale grouping after language switch
- ✅ 23/Sidebar: every sidebar href resolves (no 404 for first 6 internal links)
- ⚠️ no [data-pro] / lock markers in sidebar — expected when PAYWALL_ACTIVE=false; verify Pro wiring exists
- ✅ 24/Sidebar: locked Pro items carry [data-pro] OR a lock affordance
- ✅ 25/Sidebar: AI-chat, Goals, Reports links all distinct hrefs (no copy-paste dupes)
- ✅ 26/Render: goals.html loads with no uncaught JS error within 7s
- ✅ 27/Render: gemel.html loads with no uncaught JS error within 7s
- ✅ 28/Render: bank.html loads with no uncaught JS error within 7s
- ✅ 29/Charts: at least one canvas renders with non-zero pixel dimensions on dashboard
- ⚠️ SW controller present but offline navigation served no shell — verify sw.js fetch-handler fallback
- ✅ 30/Offline+i18n: SW serves shell offline AND HE/EN/PT/ES round-trip on dashboard

</details>