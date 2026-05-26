# WizeLife QA Tests

Node.js regression tests — no Playwright required. Run with `node qa/<file>`.

Exit 0 = all pass. Exit 1 = one or more failures.

## SEO

| File | What it catches |
|------|-----------------|
| seo-faqpage-duplicate.qa.js | Multiple FAQPage JSON-LD schemas per URL (Google rejects rich results) |
| seo-url-extraction.qa.js | Slash-prefixed pricing text (e.g. `/mo`) that Googlebot parses as URL paths |
| seo-sitemap-urls.qa.js | Sitemap `<loc>` entries that return 404/5xx |
| seo-auth-nofollow.qa.js | `auth.html` links missing `rel="nofollow"` (GSC noise) |

## Security

| File | What it catches |
|------|-----------------|
| security-csp-recaptcha.qa.js | CSP `frame-src` missing Google origins — blocks reCAPTCHA/Firebase Auth |

## Infrastructure

| File | What it catches |
|------|-----------------|
| docker-perms-check.qa.js | Dockerfiles with non-root `USER` lacking `--chown` or `chmod -R a+rX` |

## i18n

| File | What it catches |
|------|-----------------|
| i18n-jsonld-leak.qa.js | Hebrew chars in EN/PT/ES JSON-LD blocks (or Latin-only text in HE block) |

## Product

| File | What it catches |
|------|-----------------|
| pricing-pill-coverage.qa.js | `wize-pricing-pill.js` present in 5 sub-apps, absent from Portal |

---

All 8 tests added 2026-05-25 as regressions for bugs found that day.