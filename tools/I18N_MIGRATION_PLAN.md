# i18n Architecture Migration — Long-term Plan

**Status:** PROPOSED — not started. Reference doc for a dedicated future session.

**Why:** The current pattern (per-page inline `WIZE_TR = {he, en, pt, es}` block) is painful to maintain. Every text change requires 4 dictionary entries in the same file. Risk of:
- Missing keys in some langs (causes Hebrew leak in EN/PT/ES mode)
- Inconsistent translations of the same concept across pages
- Bloat (every page ships every lang's dict, even if user only sees one)
- No shared infrastructure (no helpers, no validation, no automation)

---

## Target architecture

### Option A — Vanilla, file-per-lang JSON (RECOMMENDED, low risk)

```
TOTALIST/wizelife/
├── i18n/
│   ├── core.he.json       ← shared keys (nav, footer, common buttons)
│   ├── core.en.json
│   ├── core.pt.json
│   ├── core.es.json
│   ├── about.he.json      ← page-specific
│   ├── about.en.json
│   └── ...
├── js/
│   └── wl-i18n.js         ← loader (fetch JSON + apply via data-i18n)
└── ...
```

**Loader (vanilla, ~80 lines):**
- Reads `localStorage.wl_lang` (default 'he')
- `fetch('i18n/core.<lang>.json')` + `fetch('i18n/<pagename>.<lang>.json')`
- Merges, applies via `document.querySelectorAll('[data-i18n]')`
- Caches in sessionStorage so navigation between pages doesn't re-fetch
- Falls back to English if a key is missing in target lang

**HTML pattern:**
```html
<h1 data-i18n="hero.title">Default English text</h1>
```

Pros:
- No build step needed (still vanilla HTML hosted on GitHub Pages)
- Each page loads only its own dict + core (small)
- Easy to delete a key — just edit JSON
- Auto-fill script (`tools/fill-i18n.js`) works on JSON directly
- Translators can edit JSON without touching HTML

Cons:
- Initial paint may flash defaults before fetch resolves (mitigate with `<noscript>` defaults + inline critical-path dict)
- Network requests on first load (~2-4 KB per page)

### Option B — i18next (full framework)

Use [i18next](https://www.i18next.com/) — battle-tested JS i18n library.

Pros:
- Pluralization, gendered text, ICU format support
- Built-in lang detection, namespace splitting, lazy-load
- Huge ecosystem (validators, parsers, codemods)
- Migration path to React/Next.js if you ever convert

Cons:
- Adds ~30KB minified+gzipped to every page
- More learning curve
- Likely overkill for a vanilla-JS portal

### Option C — Build-time generation

Use a build step (esbuild / Vite / custom node script) to pre-compile per-page HTML files for each lang (e.g. `about.he.html`, `about.en.html`).

Pros:
- Zero runtime cost — fully static per-lang HTML, perfect for SEO
- No FOUC (flash of untranslated content)

Cons:
- Adds a build step to the deploy pipeline (currently GitHub Pages = git push only)
- 4× the number of HTML files = harder to grep/edit
- Need URL routing for `/en/about` vs `/he/about`

---

## Recommended path

**Phase 1** (this session's `tools/fill-i18n.js`): keep current per-page dict pattern, but use DeepL to auto-fill missing keys so no leak surfaces. Already done.

**Phase 2** (separate session, ~4-6 hours):
1. Extract every per-page `*_TR` block → `i18n/<pagename>.<lang>.json` files
2. Replace inline blocks with `<script src="/js/wl-i18n.js" data-page="<name>" defer></script>`
3. Test each page individually
4. Same pattern in each sub-app (FinSight, Vitara, etc.)

**Phase 3** (later, optional): if i18n complexity grows (genders, plurals, market-specific copy), upgrade to i18next.

---

## Why NOT start Phase 2 now

- Multi-day refactor — touches every HTML file across 6 repos
- Risk of breakage during the migration window
- Phase 1 (auto-fill script) already solves the immediate pain
- Better done in a dedicated session with focused QA after each app

---

## How to use `tools/fill-i18n.js` (Phase 1, available NOW)

```bash
# 1. Get a free DeepL API key (500K chars/month free):
#    https://www.deepl.com/pro-api?cta=header-pro-api
export DEEPL_API_KEY="..."

# 2. Dry run — see what would change
cd "/Users/s/Desktop/Desktop - O’s MacBook Air/TOTALIST/wizelife"
node tools/fill-i18n.js

# 3. Apply
node tools/fill-i18n.js --write

# 4. Single file
node tools/fill-i18n.js --file=about.html --write
```

The script scans every HTML file in WizeLife portal + 5 sub-apps for inline
`*_TR = { he, en, pt, es }` blocks, identifies keys missing from one or more
langs, translates the source string via DeepL, and patches the file in place.
