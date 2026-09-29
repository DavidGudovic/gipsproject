// Language pages are rendered at build time so copy and metadata work without JavaScript.
(function () {
  const requested = new URLSearchParams(location.search).get("lang");
  if (requested === "sr" || requested === "en") {
    const url = new URL(location.href);
    url.pathname = requested === "en" ? "/en/" : "/";
    url.searchParams.delete("lang");
    location.replace(url.pathname + url.search + url.hash);
    return;
  }
  document.querySelectorAll(".lang-switch a").forEach(link => {
    link.addEventListener("click", () => { link.hash = location.hash; });
  });
})();

(function () {
  "use strict";
  const openers = [...document.querySelectorAll("[data-gallery-index]")];
  const links = [...new Map(openers.map(link => [link.dataset.galleryIndex, link])).values()].sort((a,b) => Number(a.dataset.galleryIndex) - Number(b.dataset.galleryIndex));
  let activeLinks = links;
  const dialog = document.getElementById("lightbox");
  if (!dialog || typeof dialog.showModal !== "function") return;
  const image = dialog.querySelector("[data-lightbox-img]");
  const caption = dialog.querySelector("[data-lightbox-caption]");
  const counter = dialog.querySelector("[data-lightbox-counter]");
  let current = 0;
  let opener;
  function show(index) {
    current = (index + activeLinks.length) % activeLinks.length;
    image.src = activeLinks[current].href;
    image.alt = activeLinks[current].querySelector("img").alt;
    caption.textContent = image.alt;
    counter.textContent = (current + 1) + " / " + activeLinks.length;
  }
  openers.forEach(link => link.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    opener = link;
    const filter = link.closest(".portfolio-grid")?.dataset.activeFilter;
    activeLinks = !filter || filter === "all" ? links : links.filter(item => item.closest("[data-categories]").dataset.categories.split(" ").includes(filter));
    show(activeLinks.findIndex(item => item.dataset.galleryIndex === link.dataset.galleryIndex));
    dialog.showModal();
    document.body.classList.add("gallery-open");
  }));
  dialog.querySelector("[data-lightbox-close]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-lightbox-prev]").addEventListener("click", () => show(current - 1));
  dialog.querySelector("[data-lightbox-next]").addEventListener("click", () => show(current + 1));
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("gallery-open");
    image.removeAttribute("src");
    opener?.focus({ preventScroll: true });
  });
  dialog.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault(); show(current + (e.key === "ArrowRight" ? 1 : -1));
    }
  });
  let start;
  image.addEventListener("touchstart", e => {
    start = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }, { passive: true });
  image.addEventListener("touchend", e => {
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
    start = null;
  }, { passive: true });
})();

(function () {
  "use strict";
  const header = document.getElementById("site-header");
  const menuButton = document.getElementById("menu-toggle");
  const menu = document.getElementById("mobile-menu");
  function setMenu(open) {
    menu.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? menuButton.dataset.closeLabel : menuButton.dataset.openLabel);
  }
  menuButton.addEventListener("click", () => setMenu(menu.hidden));
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuButton.focus(); }
  });
  document.addEventListener("click", e => {
    if (!menu.hidden && !header.contains(e.target)) setMenu(false);
  });
  const mobile = matchMedia("(max-width:800px)");
  mobile.addEventListener("change", () => setMenu(false));
  document.getElementById("year").textContent = new Date().getFullYear();

  const reduceMotion = matchMedia("(prefers-reduced-motion:reduce)");
  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08 });
    document.documentElement.classList.add("motion-ready");
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
  }
  const scene = document.getElementById("work-scene");
  const viewport = document.getElementById("work-viewport");
  const track = document.getElementById("work-track");
  const progress = document.getElementById("work-progress");
  const counter = document.getElementById("work-current");
  const desktop = matchMedia("(min-width:1025px) and (min-height:700px) and (prefers-reduced-motion:no-preference)");
  let ticking = false;
  let enabled = false;
  function configure() {
    enabled = desktop.matches;
    document.documentElement.classList.toggle("scroll-showcase", enabled);
    track.style.transform = "";
    viewport.scrollLeft = 0;
    update();
  }
  function update() {
    header.classList.toggle("is-scrolled", scrollY > 10);
    let fraction;
    if (enabled) {
      const rect = scene.getBoundingClientRect();
      const distance = scene.offsetHeight - (innerHeight - header.offsetHeight);
      fraction = Math.min(1, Math.max(0, (header.offsetHeight - rect.top) / distance));
      const padding = parseFloat(getComputedStyle(viewport).paddingLeft);
      const travel = Math.max(0, track.scrollWidth - viewport.clientWidth + padding * 2);
      track.style.transform = "translate3d(" + (-fraction * travel) + "px,0,0)";
    } else {
      fraction = viewport.scrollLeft / Math.max(1, viewport.scrollWidth - viewport.clientWidth);
    }
    progress.style.width = (25 + fraction * 75) + "%";
    counter.textContent = String(1 + Math.round(fraction * 3)).padStart(2, "0");
    ticking = false;
  }
  function requestUpdate() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", requestUpdate, { passive: true });
  viewport.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  desktop.addEventListener("change", configure);
  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) document.documentElement.classList.remove("motion-ready");
  });
  // Keep keyboard navigation through the horizontal showcase visible.
  track.addEventListener("focusin", e => {
    if (!enabled) return;
    const card = e.target.closest(".work-card");
    if (!card) return;
    viewport.scrollLeft = 0;
    const cards = [...track.children];
    const fraction = cards.indexOf(card) / Math.max(1, cards.length - 1);
    const distance = scene.offsetHeight - (innerHeight - header.offsetHeight);
    window.scrollTo({ top: scene.getBoundingClientRect().top + scrollY - header.offsetHeight + fraction * distance, behavior: "instant" });
  });
  configure();
})();

(function () {
  "use strict";
  const portfolio = document.getElementById("portfolio");
  if (!portfolio) return;
  const grid = portfolio.querySelector(".portfolio-grid");
  const cards = [...grid.querySelectorAll(".work-card")];
  const filters = [...portfolio.querySelectorAll("[data-filter]")];
  const more = portfolio.querySelector(".portfolio-more");
  const count = portfolio.querySelector("#portfolio-count");
  const description = portfolio.querySelector("#portfolio-description");
  const enquiry = portfolio.querySelector("[data-portfolio-enquiry]");
  const batch = 6;
  let category = "all", limit = batch;
  function matching() { return cards.filter(card => category === "all" || card.dataset.categories.split(" ").includes(category)); }
  function render() {
    const matches = matching();
    const visible = new Set(matches.slice(0, limit));
    cards.forEach(card => { card.hidden = !visible.has(card); });
    filters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === category)));
    grid.dataset.activeFilter = category;
    count.textContent = count.dataset.label + ": " + visible.size + " / " + matches.length;
    more.hidden = visible.size === matches.length;
    enquiry.dataset.enquiryService = ({ ceilings: "ceilings", walls: "boards", decorative: "decorative", structure: "advice" })[category] || "";
  }
  filters.forEach(button => button.addEventListener("click", () => {
    category = button.dataset.filter;
    limit = batch;
    description.textContent = button.dataset.description;
    render();
  }));
  more.addEventListener("click", () => {
    const next = matching()[limit];
    limit += batch;
    render();
    next?.querySelector("a").focus();
  });
  render();
  portfolio.querySelector(".portfolio-filters").hidden = false;
  count.hidden = false;
})();

(function () {
  "use strict";
  const section = document.getElementById("enquiry");
  const form = document.getElementById("enquiry-form");
  if (!section || !form) return;
  const service = form.querySelector("#enquiry-service");
  const location = form.querySelector("#enquiry-location");
  const area = form.querySelector("#enquiry-area");
  const text = form.querySelector("#enquiry-text");
  const preview = form.querySelector("#enquiry-message-preview");
  function update() {
    const place = location.value.trim();
    location.setCustomValidity(location.value && !place ? (document.documentElement.lang === "en" ? "Enter a town or location." : "Unesite naziv grada ili mjesta.") : "");
    const lines = [];
    if (service.value) lines.push(form.dataset.serviceLabel + ": " + service.selectedOptions[0].textContent);
    if (place) lines.push(form.dataset.locationLabel + ": " + place);
    if (area.value && area.validity.valid) lines.push(form.dataset.areaLabel + ": " + area.value + " m²");
    text.value = lines.length ? form.dataset.start + "\n\n" + lines.join("\n") + "\n\n" + form.dataset.end : "";
    preview.textContent = text.value || form.dataset.empty;
  }
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", update);
  window.addEventListener("pageshow", update);
  document.addEventListener("click", event => {
    const link = event.target.closest("[data-enquiry-service]");
    if (!link || !link.dataset.enquiryService || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    service.value = link.dataset.enquiryService;
    update();
  });
  update();
  section.hidden = false;
  section.closest(".contact").classList.add("has-enquiry");
})();
