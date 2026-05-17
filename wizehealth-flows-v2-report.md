# 🚨 WizeHealth-FlowsV2 action items — 2026-05-16

**1 failure(s), 4 warning(s), 9 pass.**

## For Claude to fix:
- ❌ Chat textarea accepts a long medical question — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea').first() to be visible[22m
[2m    15 × locator resolved to hidden <textarea rows="2" class="mi" id="profConditions" data

## For you to investigate:
- ⚠️ only 0 known model names visible
- ⚠️ No vision-model label visible — imaging analysis may not be discoverable
- ⚠️ No local-mode privacy copy detected — feature may be hidden
- ⚠️ No local-model download instructions text

---
_<details><summary>Full detail</summary>_

# WizeHealth-FlowsV2 QA — 2026-05-16

- ✅ Emergency number visible (101 for IL OR 911 EN)
- ⚠️ only 0 known model names visible
- ✅ Multiple AI model options listed
- ⚠️ No vision-model label visible — imaging analysis may not be discoverable
- ✅ Vision-capable model labeled (for X-ray / ultrasound)
- ✅ File input accepts PDF + image
- ❌ Chat textarea accepts a long medical question — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea').first() to be visible[22m
[2m    15 × locator resolved to hidden <textarea rows="2" class="mi" id="profConditions" data
- ✅ Profile / context — persists in localStorage
- ⚠️ No local-mode privacy copy detected — feature may be hidden
- ✅ 100%-local privacy mode messaging present
- ✅ Share-link feature mentioned
- ✅ Medical disclaimer text contains "not a substitute" or equivalent
- ⚠️ No local-model download instructions text
- ✅ Local model setup instructions visible (Ollama/download/install)

</details>