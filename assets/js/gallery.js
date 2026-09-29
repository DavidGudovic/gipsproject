(function () {
  "use strict";
  const links = [...document.querySelectorAll("[data-gallery-index]")].sort((a,b) => Number(a.dataset.galleryIndex) - Number(b.dataset.galleryIndex));
  const dialog = document.getElementById("lightbox");
  if (!dialog || typeof dialog.showModal !== "function") return;
  const image = dialog.querySelector("[data-lightbox-img]");
  const caption = dialog.querySelector("[data-lightbox-caption]");
  const counter = dialog.querySelector("[data-lightbox-counter]");
  let current = 0;
  let opener;
  function show(index) {
    current = (index + links.length) % links.length;
    image.src = links[current].href;
    image.alt = links[current].querySelector("img").alt;
    caption.textContent = image.alt;
    counter.textContent = (current + 1) + " / " + links.length;
  }
  links.forEach((link, index) => link.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    opener = link;
    show(index);
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
