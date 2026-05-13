/**
 * WizeLife text-content fallback translator.
 *
 * Why this exists:
 *  Many UI elements on WizeLife pages contain Hebrew text but lack a
 *  `data-i18n="key"` attribute pointing to the right WL_TR dictionary entry.
 *  Without the attribute, the standard i18n machinery in wl-lang-switcher.js
 *  (and per-page applyLang functions) cannot translate them — so they stay
 *  Hebrew even when the user selects EN / PT / ES.
 *
 *  This script complements (does not replace) data-i18n. After the page's
 *  primary translator runs, it scans every text node, looks up its trimmed
 *  Hebrew content in a reverse map of WL_TR.he, and swaps in the corresponding
 *  WL_TR[lang] string when found. Risk-free: when no match is found, the
 *  original text is left untouched.
 *
 *  Side benefit: identical Hebrew strings that recur on a page (e.g. the same
 *  CTA in nav + hero + footer) all get translated, even if only one of them
 *  was tagged with data-i18n.
 *
 * Drop-in: <script src="/js/wl-text-i18n.js?v=1" defer></script>
 * Must be loaded AFTER the page's own translation dict is set on window.WL_TR
 * and after any inline applyLang runs.
 */
(function () {
  if (window.__wlTextI18nLoaded) return;
  window.__wlTextI18nLoaded = true;

  function getLang() {
    try { return (localStorage.getItem('wl_lang') || 'he').slice(0, 2); }
    catch (e) { return 'he'; }
  }

  // Build (and cache) a reverse map keyed by trimmed HE text → key.
  // Only includes entries whose HE value contains Hebrew characters, so we
  // never accidentally match English strings as if they were translatable.
  var _reverseMap = null;
  function buildReverseMap() {
    if (_reverseMap) return _reverseMap;
    _reverseMap = {};
    var heDict = window.WL_TR && window.WL_TR.he;
    if (!heDict) return _reverseMap;
    var hebrewChar = /[֐-׿]/;
    Object.keys(heDict).forEach(function (k) {
      var v = heDict[k];
      if (typeof v !== 'string') return;
      var t = v.trim();
      if (t.length < 2) return;
      if (!hebrewChar.test(t)) return;
      // First key wins on collision — preserves the order of declaration.
      if (!_reverseMap[t]) _reverseMap[t] = k;
    });
    return _reverseMap;
  }

  function translatePage(lang) {
    if (lang === 'he') return; // Hebrew is the source; nothing to swap.
    var dict = window.WL_TR && window.WL_TR[lang];
    if (!dict) return;
    var reverse = buildReverseMap();
    if (!Object.keys(reverse).length) return;

    var walker = document.createTreeWalker(
      document.body, NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (n) {
          // Skip empty / pure-whitespace text nodes.
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          // Skip script / style nodes.
          var p = n.parentNode;
          while (p && p.nodeType === 1) {
            var tn = p.tagName;
            if (tn === 'SCRIPT' || tn === 'STYLE' || tn === 'NOSCRIPT') {
              return NodeFilter.FILTER_REJECT;
            }
            p = p.parentNode;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    var node, swapped = 0;
    while ((node = walker.nextNode())) {
      var orig = node.nodeValue;
      var trimmed = orig.trim();
      var key = reverse[trimmed];
      if (!key) continue;
      var translated = dict[key];
      if (typeof translated !== 'string' || !translated.length) continue;
      // Preserve leading/trailing whitespace of the original.
      var lead = orig.match(/^\s*/)[0];
      var tail = orig.match(/\s*$/)[0];
      node.nodeValue = lead + translated + tail;
      swapped++;
    }
    // Re-apply attributes that store Hebrew copy (title, aria-label, placeholder).
    var attrs = ['title', 'aria-label', 'placeholder', 'alt'];
    document.querySelectorAll('[title],[aria-label],[placeholder],[alt]').forEach(function (el) {
      attrs.forEach(function (a) {
        var v = el.getAttribute(a);
        if (!v) return;
        var key = reverse[v.trim()];
        if (key && dict[key]) el.setAttribute(a, dict[key]);
      });
    });
    return swapped;
  }

  function run() {
    try { translatePage(getLang()); } catch (e) { console.warn('wl-text-i18n', e); }
  }

  // Run after page-specific applyLang finishes (which is usually inside the
  // page's own DOMContentLoaded handler). A small timeout gives those handlers
  // a chance to set the initial language first.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 50); });
  } else {
    setTimeout(run, 50);
  }

  // Re-translate on language change. Listens for storage events (other tabs)
  // and exposes window.wlTextI18nReapply() for inline switchers to call.
  window.wlTextI18nReapply = run;
  window.addEventListener('storage', function (e) { if (e.key === 'wl_lang') run(); });

  // Catch in-page language clicks across all switcher variants. Runs after a
  // short delay so the page's own applyLang finishes first.
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.matches) return;
    if (t.matches('[data-lang]') ||
        t.matches('[data-wl-lang]') ||
        t.matches('.lang-pill, .wl-lang-pill, .auth-lang-pill')) {
      setTimeout(run, 80);
    }
  }, true);
})();
