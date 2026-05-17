# 🚨 WizeTax-FlowsV3 action items — 2026-05-16

**0 failure(s), 7 warning(s), 12 pass.**

## For you to investigate:
- ⚠️ only 1/4 expected flags
- ⚠️ No voice-input control — optional feature
- ⚠️ No Devil mode toggle text — may be hidden behind settings
- ⚠️ No plan-mode toggle
- ⚠️ only 0 distinct years on timeline — may be 404 or empty
- ⚠️ no send button
- ⚠️ No sample-profile pre-fill button — helps first-time UX

---
_<details><summary>Full detail</summary>_

# WizeTax-FlowsV3 QA — 2026-05-16

- ✅ Save session: localStorage write detected
- ⚠️ only 1/4 expected flags
- ✅ Country flags shown — at least Israel + Portugal + UAE
- ✅ Currency symbol matches country (₪ for IL, € for EU, etc.)
- ✅ Provider switcher mentioned (Gemini/OpenRouter/etc.)
- ⚠️ No voice-input control — optional feature
- ✅ Voice input / dictation icon present (if implemented)
- ⚠️ No Devil mode toggle text — may be hidden behind settings
- ✅ Devil mode toggle exists (red-team prompting feature)
- ⚠️ No plan-mode toggle
- ✅ Plan mode toggle (tax plan review) exists
- ⚠️ only 0 distinct years on timeline — may be 404 or empty
- ✅ Tax timeline visible — has at least 2 years
- ⚠️ no send button
- ✅ Send chat then Esc / Cancel — input clears OR aborts streaming
- ✅ Long chat: keeps input + scrolls bottom
- ⚠️ No sample-profile pre-fill button — helps first-time UX
- ✅ Sample profile pre-fill button exists
- ✅ Mobile (390×844): chat input reachable

</details>