// Dev-only smoke test: drives the site in headless Chromium and checks the
// behaviours that matter (i18n, gallery, lightbox, CTAs, mobile FAB).
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8123";
const SHOTS = process.env.SHOTS_DIR || `${process.env.HOME}/gp-verify`;

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok, extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });

  // snap chromium swallows stdout, so launch it ourselves and connect over the debug port
  const { spawn } = await import("node:child_process");
  const os = await import("node:os");
  const profile = fs.mkdtempSync(`${os.tmpdir()}/gp-verify-`);
  const chrome = spawn("/snap/bin/chromium", [
    "--headless=new",
    "--disable-gpu",
    "--remote-debugging-port=9777",
    `--user-data-dir=${profile}`,
    "about:blank"
  ], { stdio: "ignore" });
  let browser;
  for (let i = 0; i < 40; i++) {
    try {
      browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9777", defaultViewport: null });
      break;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!browser) { console.error("could not connect to chromium"); process.exit(1); }
  process.on("exit", () => chrome.kill());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  // — desktop, default (sr) —
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "language", { get: () => "sr-Latn-ME" });
  });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });

  check("html lang is sr-Latn", (await page.evaluate(() => document.documentElement.lang)) === "sr-Latn");
  const h1sr = await page.$eval("h1", (el) => el.textContent.trim());
  check("h1 is Serbian", h1sr.includes("Savršeni"), h1sr);
  check("12 gallery figures", (await page.$$eval("#work-grid figure", (f) => f.length)) === 12);
  check("tel CTA present", (await page.$$eval('a[href="tel:+38269476823"]', (a) => a.length)) >= 3);
  check("wa.me CTA present", (await page.$$eval('a[href^="https://wa.me/38269476823"]', (a) => a.length)) >= 1);
  check("mailto CTA present", (await page.$$eval('a[href="mailto:cg@gipsproject.me"]', (a) => a.length)) >= 2);
  check("instagram link present", (await page.$$eval('a[href^="https://www.instagram.com/gips_project"]', (a) => a.length)) >= 1);

  // — language toggle —
  await page.click('[data-lang-btn="en"]');
  const h1en = await page.$eval("h1", (el) => el.textContent.trim());
  check("EN toggle swaps h1", h1en.includes("Flawless"), h1en);
  check("html lang becomes en", (await page.evaluate(() => document.documentElement.lang)) === "en");
  check("choice persisted", (await page.evaluate(() => localStorage.getItem("gp-lang"))) === "en");
  const altEn = await page.$eval("#work-grid img", (el) => el.alt);
  check("gallery alt switches to EN", /ceiling/i.test(altEn), altEn);
  await page.click('[data-lang-btn="sr"]');

  // — ?lang=en param —
  await page.goto(`${BASE}/?lang=sr`, { waitUntil: "networkidle0" });
  await page.goto(`${BASE}/?lang=en`, { waitUntil: "networkidle0" });
  check("?lang=en forces English", (await page.$eval("h1", (el) => el.textContent)).includes("Flawless"));

  // — lightbox —
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.click("#work-grid figure:first-child button");
  await page.waitForSelector("#lightbox[open]");
  check("lightbox opens", true);
  const src1 = await page.$eval("[data-lightbox-img]", (el) => el.src);
  await page.keyboard.press("ArrowRight");
  const src2 = await page.$eval("[data-lightbox-img]", (el) => el.src);
  check("arrow key navigates", src1 !== src2, `${src1.split("/").pop()} → ${src2.split("/").pop()}`);
  const counter = await page.$eval("[data-lightbox-counter]", (el) => el.textContent);
  check("counter shows 2 / 12", counter.trim() === "2 / 12", counter);
  await page.keyboard.press("Escape");
  check("Esc closes lightbox", await page.$eval("#lightbox", (el) => !el.open));

  // — reveals after scroll —
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await new Promise((r) => setTimeout(r, 1200));
  const unrevealed = await page.$$eval(".reveal:not(.is-visible)", (els) => els.length);
  check("all reveals fired after full scroll", unrevealed === 0, `${unrevealed} unrevealed`);
  await page.screenshot({ path: `${SHOTS}/desktop-full.png`, fullPage: true });

  // — mobile —
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  check("mobile menu hidden initially", await page.$eval("#mobile-menu", (el) => el.classList.contains("hidden")));
  await page.click("#menu-toggle");
  check("hamburger opens menu", await page.$eval("#mobile-menu", (el) => !el.classList.contains("hidden")));
  await page.click('#mobile-menu a[href="#services"]');
  check("menu closes on link tap", await page.$eval("#mobile-menu", (el) => el.classList.contains("hidden")));
  await page.evaluate(() => document.getElementById("contact").scrollIntoView());
  await new Promise((r) => setTimeout(r, 900));
  const fabShown = await page.$eval("#call-fab", (el) => !el.classList.contains("opacity-0"));
  check("call FAB appears after hero", fabShown);
  await page.screenshot({ path: `${SHOTS}/mobile-full.png`, fullPage: true });

  check("no console/page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
