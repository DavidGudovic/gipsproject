// Locale engine: detects language, applies copy from locales/*.js, persists the choice.
(function () {
  const STORE_KEY = "gp-lang";
  // keys whose values contain markup (gold <em> accents) — applied via innerHTML
  const HTML_KEYS = new Set([
    "hero.title",
    "services.title",
    "work.title",
    "why.title",
    "contact.title"
  ]);

  function detectLang() {
    const param = new URLSearchParams(location.search).get("lang");
    if (param === "en" || param === "sr") return param;
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved === "en" || saved === "sr") return saved;
    } catch (e) { /* private mode */ }
    return (navigator.language || "").toLowerCase().startsWith("en") ? "en" : "sr";
  }

  function applyLang(lang) {
    const t = window.GP_I18N[lang] || window.GP_I18N.sr;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const val = t[el.getAttribute("data-i18n")];
      if (val == null) return;
      if (HTML_KEYS.has(el.getAttribute("data-i18n"))) el.innerHTML = val;
      else el.textContent = val;
    });

    document.querySelectorAll("[data-i18n-attrs]").forEach((el) => {
      el.getAttribute("data-i18n-attrs").split(",").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (t[key] != null) el.setAttribute(attr, t[key]);
      });
    });

    document.documentElement.lang = lang === "sr" ? "sr-Latn" : "en";
    document.title = t["meta.title"];
    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.langBtn === lang));
    });

    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* private mode */ }
    window.GP_LANG = lang;
    document.dispatchEvent(new CustomEvent("gp:langchange", { detail: { lang } }));
  }

  window.GP_LANG = detectLang();

  document.addEventListener("DOMContentLoaded", () => {
    applyLang(window.GP_LANG);
    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      btn.addEventListener("click", () => applyLang(btn.dataset.langBtn));
    });
  });
})();
