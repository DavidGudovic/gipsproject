// Deployment gate: validate the actual generated pages and public assets without a browser.
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
let checks = 0;
function check(name, test) { assert.ok(test, name); checks++; console.log("PASS " + name); }
const context = { window: {} };
vm.createContext(context);
for (const name of ["locales/sr.js", "locales/en.js", "content/images.js"]) vm.runInContext(fs.readFileSync(name, "utf8"), context);
const locales = context.window.GP_I18N;
const imageCount = context.window.GP_IMAGES.length;
const categories = new Set(["ceilings", "walls", "decorative", "structure"]);
check("Every photo has a supported portfolio category", context.window.GP_IMAGES.every(image => image.categories?.length && image.categories.every(category => categories.has(category))));
check("Both locales contain identical keys", JSON.stringify(Object.keys(locales.sr).sort()) === JSON.stringify(Object.keys(locales.en).sort()));
for (const [file, lang, url] of [["index.html", "sr-Latn", "https://gipsproject.me/"], ["en/index.html", "en", "https://gipsproject.me/en/"]]) {
  const html = fs.readFileSync(file, "utf8");
  check(file + ": correct document language", html.includes('<html lang="' + lang + '">'));
  check(file + ": one H1", [...html.matchAll(/<h1[ >]/g)].length === 1);
  check(file + ": localized static content", html.includes(lang === "en" ? "Clean lines." : "Čiste linije."));
  check(file + ": no unresolved placeholders", !html.includes("{{"));
  check(file + ": self canonical", html.includes('<link rel="canonical" href="' + url + '">'));
  check(file + ": reciprocal language links", html.includes('hreflang="sr-Latn" href="https://gipsproject.me/"') && html.includes('hreflang="en" href="https://gipsproject.me/en/"'));
  check(file + ": no accidental noindex", !/noindex/i.test(html));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const business = schema["@graph"].find(item => item["@type"] === "HomeAndConstructionBusiness");
  check(file + ": correct structured business contact", business.telephone === "+38269476823" && business.email === "cg@gipsproject.me");
  check(file + ": six structured services", business.hasOfferCatalog.itemListElement.length === 6);
  check(file + ": no invented ratings or physical address", !business.aggregateRating && !business.address);
  const anchors = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  check(file + ": unique element ids", new Set(anchors).size === anchors.length);
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(anchors.includes(id), "Missing anchor: " + id);
  check(file + ": anchor and icon destinations exist", true);
  const indexes = [...html.matchAll(/data-gallery-index="(\d+)"/g)].map(m => Number(m[1]));
  check(file + ": all client images available without JS", new Set(indexes).size === imageCount && indexes.every(i => i >= 0 && i < imageCount));
  check(file + ": telephone destinations preserved", [...html.matchAll(/href="tel:([^"]+)"/g)].every(m => m[1] === "+38269476823"));
  check(file + ": WhatsApp destinations preserved", [...html.matchAll(/href="https:\/\/wa.me\/([^"]+)"/g)].every(m => m[1] === "38266147007"));
  for (const [, path] of html.matchAll(/(?:src|href)="(\/(?:assets|en)[^"#]*)"/g)) {
    const clean = path.split("?")[0];
    assert.ok(fs.existsSync("." + clean), "Missing asset: " + clean);
  }
  check(file + ": all linked local assets exist", true);
  check(file + ": CSS and JS cache versions present", /main.css\?v=[a-f0-9]{12}/.test(html) && /site.js\?v=[a-f0-9]{12}/.test(html));
  check(file + ": no third-party scripts or fonts", !/<script[^>]+src="https:/.test(html) && !html.includes("fonts.googleapis"));
  check(file + ": one deferred script request", [...html.matchAll(/<script[^>]+src=/g)].length === 1 && /src="\/assets\/js\/site.js[^"]+" defer/.test(html));
  check(file + ": enquiry uses the preserved WhatsApp destination", html.includes('action="https://wa.me/38266147007" method="get"'));
  check(file + ": enquiry has native required-field validation", /id="enquiry-service" required/.test(html) && /id="enquiry-location"[^>]* required/.test(html));

}
const robots = fs.readFileSync("robots.txt", "utf8");
check("Robots allows public pages and references sitemap", robots.includes("Allow: /") && robots.includes("Sitemap: https://gipsproject.me/sitemap.xml"));
check("Robots does not block public assets", !/Disallow:\s*\/assets/.test(robots));
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
check("Sitemap contains both canonical pages", sitemap.includes("<loc>https://gipsproject.me/</loc>") && sitemap.includes("<loc>https://gipsproject.me/en/</loc>"));
check("Sitemap excludes legacy query URLs", !sitemap.includes("?lang="));
check("Sitemap includes client images", (sitemap.match(/<image:image>/g) || []).length === imageCount * 2);
const llms = fs.readFileSync("llms.txt", "utf8");
check("LLM summary preserves separate phone and WhatsApp contacts", llms.includes("+382 69 476 823") && llms.includes("+382 66 147 007"));
const css = fs.readFileSync("css/input.css", "utf8");
for (const [, path] of css.matchAll(/url\("(\/assets\/fonts\/[^"]+)"\)/g)) assert.ok(fs.existsSync("." + path), "Missing font " + path);
check("All self-hosted font files exist", true);
check("Reduced-motion fallback exists", css.includes("prefers-reduced-motion:reduce"));
console.log("\n" + checks + " release checks passed.");
