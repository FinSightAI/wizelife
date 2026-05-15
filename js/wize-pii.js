/**
 * WizeLife shared PII-stripping helper.
 *
 * Strips identity fields from a profile/context object before sending to a
 * third-party AI provider (Gemini, Claude, OpenRouter, Tavily). Numbers,
 * medical values, and aggregate state are KEPT — only the identity layer
 * is removed so the AI answer keeps full accuracy.
 *
 * Usage:
 *   <script src="https://wizelife.ai/js/wize-pii.js"></script>
 *   const safe = WizePII.stripIdentity(profile);
 *
 * What gets stripped:
 *   - Direct identifiers: name, displayName, firstName, lastName, nick, nickname
 *   - Contact: email, phone, mobile, tel
 *   - Address: address, streetAddress, street, postalCode, zip
 *   - Government IDs: id, idNumber, ssn, cpf, tz, passport, passportNumber,
 *                     nationalId, taxId, vatId
 *   - Financial identifiers: bankAccount, accountNumber, iban, swift, routing,
 *                            creditCard, cardNumber, cvv
 *   - Internal: uid, userId, firebaseUid, customerId
 *
 * What is KEPT:
 *   - All numerical financial state (income, balances, holdings amounts, prices)
 *   - All medical numerical state (blood-test values, vitals, drug names)
 *   - City, country, citizenships, residency status, age, sex, profession
 *   - Goals, preferences, language, plan tier
 *
 * Recursive: strips nested objects and arrays.
 */
(function (root) {
  if (root.WizePII) return;

  // Lowercase keys we strip. Match is case-insensitive.
  var STRIP_KEYS = new Set([
    // Identity
    'name', 'displayname', 'firstname', 'lastname', 'fullname', 'nick', 'nickname',
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
        if (STRIP_KEYS.has(k.toLowerCase())) continue;
        out[k] = stripIdentity(obj[k]);
      }
      return out;
    }
    if (typeof obj === 'string') return scrubString(obj);
    return obj;
  }

  root.WizePII = { stripIdentity: stripIdentity, scrubString: scrubString };
})(typeof window !== 'undefined' ? window : globalThis);
