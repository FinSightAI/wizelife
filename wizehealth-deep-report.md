# 🚨 WizeHealth-Deep action items — 2026-05-14

**2 failure(s), 1 warning(s), 10 pass.**

## For Claude to fix:
- ❌ Lang HE → EN swaps UI — UI unchanged after EN click
- ❌ No Hebrew leak in EN mode — 5 leaks: Llama 3.3 70B (חינמי | טקסט) | Llama 3.2 11B Vision (חינמי | תמונות ✅) | Gemini 2.0 Flash (חינמי | תמונות ✅) | Qwen2 VL 7B (חינמי | תמונות ✅) | DeepSeek R1 (חינמי | ריזוניג)

## For you to investigate:
- ⚠️ No privacy/local mode banner detected

---
_<details><summary>Full detail</summary>_

# WizeHealth-Deep QA — 2026-05-14

- ✅ Landing loads (60s cold-start budget)
- ✅ CNAME health.wizelife.ai routes to same content
- ✅ Chat textarea / input reachable
- ✅ Model selector exists
- ✅ File upload input present (for blood tests / docs)
- ⚠️ No privacy/local mode banner detected
- ✅ Privacy / local-mode banner mentions "100% local" or similar
- ✅ Lang pills HE/EN/PT/ES present
- ❌ Lang HE → EN swaps UI — UI unchanged after EN click
- ❌ No Hebrew leak in EN mode — 5 leaks: Llama 3.3 70B (חינמי | טקסט) | Llama 3.2 11B Vision (חינמי | תמונות ✅) | Gemini 2.0 Flash (חינמי | תמונות ✅) | Qwen2 VL 7B (חינמי | תמונות ✅) | DeepSeek R1 (חינמי | ריזוניג)
- ✅ Medical disclaimer present in DOM
- ✅ Share-with-doctor link/feature present
- ✅ iPhone (390×844): no overflow + chat reachable

</details>