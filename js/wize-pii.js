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
  var LABEL_HINT_RE = /(fund|plan|account|loan|mortgage|goal|stock|etf|card|bank|savings|pension|insurance|deposit|portfolio|holding|transfer|bond|crypto|retirement|budget|expense|income|debt|asset)/i;

  // Currency symbols (₪ NIS, $ USD, € EUR, £ GBP, ¥ JPY/CNY, R$ BRL).
  var CURRENCY_RE = /[₪$€£¥]|R\$/;

  // Patterns that indicate a value LOOKS like an identifier, even if the key
  // is unrelated (e.g. user typed their ID into a "notes" field). These are
  // applied to STRING values only.
  var VALUE_PATTERNS = [
    /\b\d{9}\b/g,           // Israeli ת.ז (9 digits)
    /\b\d{3}-\d{2}-\d{4}\b/g,  // US SSN
    /\b\d{11}\b/g,          // CPF (11 digits)
    /\b[\w.-]+@[\w.-]+\.\w{2,}\b/g,  // Email anywhere in a string
  ];

  function scrubString(s) {
    if (typeof s !== 'string' || s.length < 5) return s;
    var out = s;
    for (var i = 0; i < VALUE_PATTERNS.length; i++) {
      out = out.replace(VALUE_PATTERNS[i], '[redacted]');
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
