# 🚨 WizeHealth-FlowsV2 action items — 2026-05-14

**2 failure(s), 4 warning(s), 8 pass.**

## For Claude to fix:
- ❌ Emergency number visible (101 for IL OR 911 EN) — No emergency-number disclaimer found — required for medical app compliance
- ❌ Chat textarea accepts a long medical question — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea').first() to be visible[22m
[2m    64 × locator resolved to hidden <textarea rows="2" class="mi" id="profConditions" plac

## For you to investigate:
- ⚠️ only 0 known model names visible
- ⚠️ No local-mode privacy copy detected — feature may be hidden
- ⚠️ No share UI text detected
- ⚠️ No local-model download instructions text

---
_<details><summary>Full detail</summary>_

# WizeHealth-FlowsV2 QA — 2026-05-14

- ❌ Emergency number visible (101 for IL OR 911 EN) — No emergency-number disclaimer found — required for medical app compliance
- ⚠️ only 0 known model names visible
- ✅ Multiple AI model options listed
- ✅ Vision-capable model labeled (for X-ray / ultrasound)
- ✅ File input accepts PDF + image
- ❌ Chat textarea accepts a long medical question — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea').first() to be visible[22m
[2m    64 × locator resolved to hidden <textarea rows="2" class="mi" id="profConditions" plac
- ✅ Profile / context — persists in localStorage
- ⚠️ No local-mode privacy copy detected — feature may be hidden
- ✅ 100%-local privacy mode messaging present
- ⚠️ No share UI text detected
- ✅ Share-link feature mentioned
- ✅ Medical disclaimer text contains "not a substitute" or equivalent
- ⚠️ No local-model download instructions text
- ✅ Local model setup instructions visible (Ollama/download/install)

</details>