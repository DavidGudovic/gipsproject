import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";

const context = { window: {} };
vm.createContext(context);
for (const file of ["locales/sr.js", "locales/en.js", "content/images.js"]) vm.runInContext(fs.readFileSync(file, "utf8"), context);
const { GP_I18N: locales, GP_IMAGES: images } = context.window;
const template = fs.readFileSync("templates/index.html", "utf8");
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hash = crypto.createHash("sha256");
for (const file of ["assets/css/main.css", "assets/js/main.js", "assets/js/gallery.js", "assets/js/i18n.js"]) hash.update(fs.readFileSync(file));
const version = hash.digest("hex").slice(0, 12);
const services = ["ceilings", "partitions", "boards", "decorative", "insulation", "finishing"];
const featured = [19, 12, 0, 3];
const preview = [24, 22, 20, 15, 18, 25];
const icons = [
'<path d="M3 5h26v7H3zM7 12v15h18V12M3 20h26M12 5v7M20 5v7"/>',
'<path d="M5 4h22v24H5zM12 4v24M20 4v24M5 12h22M5 20h22"/>',
'<path d="M5 8h18v20H5zM10 8V4h17v20h-4M5 15h18M12 8v20"/>',
'<path d="M5 28V15a11 11 0 0 1 22 0v13M10 28V15a6 6 0 0 1 12 0v13M2 28h28"/>',
'<path d="M5 5v22M27 5v22M10 5l12 6-12 5 12 5-12 6M2 5h6M24 5h6M2 27h6M24 27h6"/>',
'<rect x="4" y="5" width="22" height="8" rx="1"/><path d="M26 9h3v10H16v9M12 23h8v6h-8z"/>'
];
if (Object.keys(locales.sr).sort().join() !== Object.keys(locales.en).sort().join()) throw new Error("Locale keys do not match");
for (const [lang, t] of Object.entries(locales)) {
  const home = lang === "sr" ? "/" : "/en/";
  const url = "https://gipsproject.me" + home;
  const figure = (index, extra = "") => {
    const img = images[index];
    return '<figure class="work-card ' + extra + '"><a href="/' + img.src + '" class="gallery-link" data-gallery-index="' + index + '" aria-label="' + esc(t["work.open"] + ": " + img.alt[lang]) + '"><div class="work-image"><img src="/' + img.thumb + '" width="' + img.w + '" height="' + img.h + '" alt="' + esc(img.alt[lang]) + '" loading="lazy" decoding="async"><span class="image-expand" aria-hidden="true">↗</span></div></a><figcaption><span>' + esc(img.alt[lang]) + '</span><span>' + String(index + 1).padStart(2, "0") + '</span></figcaption></figure>';
  };
  const businessId = "https://gipsproject.me/#business";
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "HomeAndConstructionBusiness", "@id": businessId, name: "GIPS PROJECT", url: "https://gipsproject.me/", telephone: "+38269476823", email: "cg@gipsproject.me", description: t["meta.description"], logo: "https://gipsproject.me/assets/img/logo.webp", image: images.map(i => "https://gipsproject.me/" + i.src), areaServed: [{ "@type": "Country", name: "Montenegro" }, ...["Podgorica", "Budva", "Cetinje", "Nikšić"].map(name => ({ "@type": "City", name }))], sameAs: ["https://www.instagram.com/gips_project/"], hasOfferCatalog: { "@type": "OfferCatalog", name: t["nav.services"], itemListElement: services.map(s => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: t["services." + s + ".title"], description: t["services." + s + ".desc"], provider: { "@id": businessId }, areaServed: "Montenegro" } })) } },
      { "@type": "WebSite", "@id": "https://gipsproject.me/#website", url: "https://gipsproject.me/", name: "GIPS PROJECT", inLanguage: ["sr-Latn", "en"], publisher: { "@id": businessId } },
      { "@type": "WebPage", "@id": url + "#webpage", url, name: t["meta.title"], description: t["meta.description"], inLanguage: lang === "sr" ? "sr-Latn" : "en", isPartOf: { "@id": "https://gipsproject.me/#website" }, about: { "@id": businessId } }
    ]
  };
  const blocks = {
    imageCount: images.length,
    "work.count": esc(t["work.count"].replace("{count}", images.length)),
    ogImageAlt: esc(images[0].alt[lang]),
    htmlLang: lang === "sr" ? "sr-Latn" : "en", url, home, version,
    ogLocale: lang === "sr" ? "sr_ME" : "en_GB", ogAlternate: lang === "sr" ? "en_GB" : "sr_ME",
    srCurrent: lang === "sr" ? 'aria-current="page"' : "", enCurrent: lang === "en" ? 'aria-current="page"' : "",
    schema: JSON.stringify(schema).replace(/</g, "\\u003c"),
    services: services.map((s, i) => '<a class="service-item reveal" href="#contact"><span class="service-number" aria-hidden="true">0' + (i + 1) + '</span><svg class="service-icon" viewBox="0 0 32 32" aria-hidden="true">' + icons[i] + '</svg><h3>' + esc(t["services." + s + ".title"]) + '</h3><p>' + esc(t["services." + s + ".desc"]) + '</p><svg class="icon service-arrow"><use href="#diagonal"/></svg></a>').join("\n"),
    featured: featured.map(i => figure(i)).join("\n"),
    preview: preview.map(i => figure(i)).join("\n"),
    gallery: images.map((_, i) => featured.includes(i) || preview.includes(i) ? "" : figure(i)).join("\n"),
    steps: [1, 2, 3].map(i => '<li class="reveal"><span>0' + i + '</span><div><h3>' + esc(t["process." + i + ".title"]) + '</h3><p>' + esc(t["process." + i + ".desc"]) + '</p></div></li>').join("\n"),
    faq: [1, 2, 3, 4, 5].map(i => '<details><summary>' + esc(t["faq." + i + ".q"]) + '<svg class="icon" aria-hidden="true"><use href="#plus"/></svg></summary><p>' + esc(t["faq." + i + ".a"]) + '</p></details>').join("\n")
  };
  const html = template.replace(/{{([\w.]+)}}/g, (_, key) => {
    if (key in blocks) return blocks[key];
    if (!(key in t)) throw new Error("Missing translation: " + key);
    return key.endsWith(".title") && !key.startsWith("meta.") ? t[key] : esc(t[key]);
  });
  fs.mkdirSync(lang === "en" ? "en" : ".", { recursive: true });
  fs.writeFileSync(lang === "en" ? "en/index.html" : "index.html", html);
}
const alternates = '<xhtml:link rel="alternate" hreflang="sr-Latn" href="https://gipsproject.me/"/><xhtml:link rel="alternate" hreflang="en" href="https://gipsproject.me/en/"/><xhtml:link rel="alternate" hreflang="x-default" href="https://gipsproject.me/"/>';
fs.writeFileSync("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' + ["/", "/en/"].map(path => '<url><loc>https://gipsproject.me' + path + '</loc>' + alternates + images.map(i => '<image:image><image:loc>https://gipsproject.me/' + i.src + '</image:loc></image:image>').join("") + '</url>').join("\n") + '\n</urlset>\n');
console.log("Built Serbian and English pages, asset versions and image sitemap.");
