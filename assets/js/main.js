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
