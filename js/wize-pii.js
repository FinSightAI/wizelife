/**
 * WizeLife shared PII-stripping helper.
 *
 * Strips identity fields from a profile/context object before sending to a
 * third-party AI provider (Gemini, Claude, OpenRouter, Tavily). Numbers,
 * medical values, and aggregate state are KEPT — only the identity layer
 * is removed so the AI answer keeps full accuracy.
 *
 * --- CONTEXTUAL STRIPPING (added 2026-05-15) ---
 *
 * The original version stripped EVERY key named `name`, `displayName`,
 * `firstName`, etc. That was too aggressive: financial labels like
 * `goal.name = "Mortgage Tel Aviv"` or `fund.name = "Pension Plus"` are
 * NOT PII — they are labels needed for the AI to give a good answer.
 *
 * The new behaviour for the "ambiguous identity" keys (name / displayName /
 * firstName / lastName / fullname / nick / nickname):
 *
 *   1. If the key is in SAFE_KEYS (goalName, fundName, label, title,
 *      description, etc.) — ALWAYS KEEP. These are never person names.
 *
 *   2. Otherwise, look at the VALUE. KEEP if:
 *        - contains any digit
 *        - contains a currency symbol ($, €, £, ₪, R$, ¥)
 *        - contains a "label hint" word (fund, plan, account, loan,
 *          mortgage, goal, stock, etf, card, bank, savings, pension,
 *          insurance, deposit, portfolio, holding, transfer, bond, crypto,
 *          retirement, budget, expense, income, debt, asset)
 *        - is longer than 60 characters (real person names are not that long)
 *
 *   3. Otherwise (2–4 short Latin/Hebrew tokens, no digits, no label hint)
 *      → looks like a person name → STRIP.
 *
 * Hard-strip keys (email/phone/address/IDs/IBAN/card numbers) remain
 * unconditional — they are never labels.
 *
 * Recursive: strips nested objects and arrays.
 * Regex value-pattern scrubbing for free-text fields is unchanged.
 */
(function (root) {
  if (root.WizePII) return;

  // Always-strip keys (true PII — value never looks label-like).
  var HARD_STRIP_KEYS = new Set([
    // Contact
    'email', 'emails', 'phone', 'phonenumber', 'mobile', 'tel', 'whatsapp',
    // Address
    'address', 'streetaddress', 'street', 'postalcode', 'zip', 'zipcode', 'apartment',
    // Government IDs
    'id', 'idnumber', 'ssn', 'cpf', 'rg', 'tz', 'passport', 'passportnumber',
    'nationalid', 'taxid', 'vatid', 'nif', 'nie', 'dni',
    // Financial identifiers (the IDs, not the amounts)
    'bankaccount', 'accountnumber', 'iban', 'swift', 'routing', 'bankid',
    'creditcard', 'cardnumber', 'cvv', 'cardholder',
    // Internal
    'uid', 'userid', 'firebaseuid', 'customerid', 'authuid',
  ]);

  // Ambiguous keys — sometimes a person name, sometimes a label. We inspect
  // the value before deciding.
  var AMBIGUOUS_KEYS = new Set([
    'name', 'displayname', 'firstname', 'lastname', 'fullname',
    'nick', 'nickname',
  ]);

  // Safe-key allowlist — even if the lowercased form matches AMBIGUOUS_KEYS
  // semantically, these are domain labels and ALWAYS KEPT.
  var SAFE_KEYS = new Set([
    'goalname', 'fundname', 'accountname', 'accountlabel', 'label',
    'title', 'description', 'category', 'subcategory', 'bankname',
    'loanname', 'cardlabel', 'holdingname', 'stockname', 'companyname',
    'productname',
  ]);

  // Words that strongly suggest the value is a financial / domain label
  // rather than a person name.
  var LABEL_HINT_RE = /(fund|plan|account|loan|mortgage|goal|stock|etf|card|bank|savings|pension|insurance|deposit|portfolio|holding|transfer|bond|crypto|retirement|budget|expense|income|debt|asset|child|children|kids|family|education|college|university|tuition|wedding|emergency|reserve|nest\s*egg|mutual|index|hedge|broker|brokerage|trade|trading|dividend|interest|yield|tax|estate|trust|annuity|ira|roth|401k|403b|gemel|hishtalmut|kupot|keren|kupa|hashlama|hashlamut|tagmulim|haf?ka?da|otzar|hochasa|hochasot|hochasit|חיסכון|חסכון|פנסיה|השתלמות|גמל|השתלמות|קרן|קופה|הפקדה|הפקדות|חיסכ|לימודים|חתונה|חירום|רזרבה)/i;

  // Currency symbols (₪ NIS, $ USD, € EUR, £ GBP, ¥ JPY/CNY, R$ BRL).
  var CURRENCY_RE = /[₪$€£¥]|R\$/;

  // Patterns that indicate a value LOOKS like an identifier, even if the key
  // is unrelated (e.g. user typed their ID into a "notes" field). These are
  // applied to STRING values only.
  //
  // Each entry is [regex, replacement]. Ordered MOST specific → LEAST specific
  // so that, e.g., a formatted credit card is caught before a bare 16-digit
  // amount is even considered.
  //
  // Safety: bare numeric patterns (9-digit IL ID, 11-digit CPF, 16-digit card)
  // are guarded against currency context (₪, $, €, £, R$, NIS, USD, EUR,
  // BRL, ש"ח, .00, ,00) so financial amounts are NOT redacted.
  var CURRENCY_GUARD_BEFORE = /(?:[₪$€£¥]|R\$|NIS|USD|EUR|GBP|BRL|ILS|JPY|CNY)\s*$/i;
  var CURRENCY_GUARD_AFTER  = /^\s*(?:[₪$€£¥]|R\$|NIS|USD|EUR|GBP|BRL|ILS|JPY|CNY|ש["׳]ח|שח|שקל|שקלים|reais|reais\b|euros?|dollars?|pounds?|[.,]0{2}\b)/i;

  function guardedReplace(str, regex, replacement) {
    return str.replace(regex, function (match, offset, full) {
      var before = full.slice(Math.max(0, offset - 8), offset);
      var after  = full.slice(offset + match.length, offset + match.length + 12);
      if (CURRENCY_GUARD_BEFORE.test(before)) return match;
      if (CURRENCY_GUARD_AFTER.test(after)) return match;
      return replacement;
    });
  }

  var VALUE_PATTERNS = [
    // 1. Email (most specific — has @)
    [/\b[\w.-]+@[\w.-]+\.\w{2,}\b/g, '[redacted-email]', false],

    // 2. GPS coordinates (lat,lng with 4+ decimals)
    [/\b-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/g, '[redacted-gps]', false],

    // 3. IBAN (2 letters + 2 digits + 10–30 alphanumerics)
    [/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, '[redacted-iban]', false],

    // 4. Formatted credit card (4-4-4-4 with separators) — separators required
    //    so bare 16-digit amounts aren't matched here.
    [/\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g, '[redacted-cc]', false],

    // 5. Brazilian RG (formatted)
    [/\b\d{2}\.\d{3}\.\d{3}-[\dxX]\b/g, '[redacted-id]', false],

    // 6. Israeli bank account (xx-xxxx-xxxxxxxxx)
    [/\b\d{2}-\d{3,4}-\d{6,9}\b/g, '[redacted-acct]', false],

    // 7. US SSN
    [/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted-ssn]', false],

    // 8. Spanish DNI (8 digits + letter)
    [/\b\d{8}[A-HJ-NP-TV-Z]\b/g, '[redacted-id]', false],

    // 9. International phone (with leading +, country code, separators).
    //    Requires a + so plain digit runs (amounts) aren't matched.
    [/\+\d{1,3}[\s.\-]?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}\b/g, '[redacted-phone]', false],

    // 10. Israeli mobile (05X-XXXXXXX with separator)
    [/\b0?5\d[\s\-]\d{3}[\s\-]?\d{4}\b/g, '[redacted-phone]', false],

    // 11. Address — Hebrew
    [/(רחוב|רח['׳]|שדרות|שד['׳]|דרך|סמטת|כביש)\s+[א-ת]+(?:\s+[א-ת]+){0,4}\s+\d{1,4}\b/g, '[redacted-address]', false],

    // 12. Address — English (street types with number prefix)
    [/\b\d{1,5}\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Court|Ct\.?|Place|Pl\.?)\b/g, '[redacted-address]', false],

    // 13. Address — Portuguese (BR)
    [/\b(?:Rua|Av\.?|Avenida|Praça|Travessa|Alameda|Estrada)\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,4},?\s+\d{1,5}\b/g, '[redacted-address]', false],

    // 14. Address — Spanish
    [/\b(?:Calle|Avda\.?|Avenida|Plaza|Paseo|Carretera)\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,4},?\s+\d{1,5}\b/g, '[redacted-address]', false],

    // 15. Brazilian CPF (11 bare digits) — GUARDED against currency.
    [/\b\d{11}\b/g, '[redacted-id]', true],

    // 16. Israeli ת.ז / Portuguese NIF (9 bare digits) — GUARDED against
    //     currency so "1500000 ש"ח" or "$ 123456789" is NOT redacted.
    [/\b\d{9}\b/g, '[redacted-id]', true],
  ];

  function scrubString(s) {
    if (typeof s !== 'string' || s.length < 5) return s;
    var out = s;
    for (var i = 0; i < VALUE_PATTERNS.length; i++) {
      var entry = VALUE_PATTERNS[i];
      var regex = entry[0];
      var replacement = entry[1];
      var guarded = entry[2];
      // Reset lastIndex defensively (global regex state across calls).
      regex.lastIndex = 0;
      if (guarded) {
        out = guardedReplace(out, regex, replacement);
      } else {
        out = out.replace(regex, replacement);
      }
    }
    return out;
  }

  /**
   * Decide whether a value sitting under an AMBIGUOUS key looks like a
   * label (KEEP) vs a person name (STRIP).
   * Returns true if the value is label-ish and should be kept.
   */
  function looksLikeLabel(v) {
    if (v === null || v === undefined) return false;
    if (typeof v !== 'string') {
      // Non-strings under name keys are weird; keep them (the recursive
      // walker will still strip identity inside any nested object).
      return true;
    }
    if (v.length > 60) return true;       // person names aren't this long
    if (/\d/.test(v)) return true;         // any digit → label
    if (CURRENCY_RE.test(v)) return true;  // currency symbol → label
    if (LABEL_HINT_RE.test(v)) return true; // financial keyword → label
    return false;
  }

  /**
   * Returns a deep clone of input with identity fields removed.
   * Does NOT mutate the input.
   */
  function stripIdentity(obj) {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(stripIdentity);
    if (typeof obj === 'object') {
      var out = {};
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var lk = k.toLowerCase();
        // Hard-strip categories: always remove.
        if (HARD_STRIP_KEYS.has(lk)) continue;
        // Domain-label allowlist: always keep, recurse for nested PII.
        if (SAFE_KEYS.has(lk)) { out[k] = stripIdentity(obj[k]); continue; }
        // Ambiguous keys: decide by value shape.
        if (AMBIGUOUS_KEYS.has(lk)) {
          if (looksLikeLabel(obj[k])) {
            out[k] = stripIdentity(obj[k]);
          }
          // else: looks like a person name → strip (skip).
          continue;
        }
        // Everything else: keep, recurse.
        out[k] = stripIdentity(obj[k]);
      }
      return out;
    }
    if (typeof obj === 'string') return scrubString(obj);
    return obj;
  }

  root.WizePII = { stripIdentity: stripIdentity, scrubString: scrubString };
})(typeof window !== 'undefined' ? window : globalThis);
