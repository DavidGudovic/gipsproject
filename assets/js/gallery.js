// Work gallery: renders the grid from content/images.js and drives the <dialog> lightbox.
(function () {
  const images = window.GP_IMAGES || [];
  let current = 0;

  const altFor = (i) => images[i].alt[window.GP_LANG] || images[i].alt.sr;

  document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("work-grid");
    const dialog = document.getElementById("lightbox");
    if (!grid || !dialog || !images.length) return;

    const slide = dialog.querySelector("[data-lightbox-img]");
    const counter = dialog.querySelector("[data-lightbox-counter]");

    images.forEach((img, i) => {
      const figure = document.createElement("figure");
      figure.className = "mb-4 break-inside-avoid";
      figure.innerHTML =
        `<button type="button" data-index="${i}" class="group block w-full overflow-hidden rounded-xl border border-ink/10 bg-cream focus-visible:outline-2 focus-visible:outline-gold-deep">` +
        `<img src="${img.thumb}" alt="" width="${img.w}" height="${img.h}" loading="lazy" decoding="async" ` +
        `class="block w-full h-auto transition-transform duration-500 group-hover:scale-[1.03]"></button>`;
      figure.querySelector("img").alt = altFor(i);
      figure.querySelector("button").addEventListener("click", () => open(i));
      grid.appendChild(figure);
    });

    function show(i) {
      current = (i + images.length) % images.length;
      const img = images[current];
      slide.src = img.src;
      slide.alt = altFor(current);
      counter.textContent = `${current + 1} / ${images.length}`;
      // warm neighbours
      [current + 1, current - 1].forEach((n) => {
        new Image().src = images[(n + images.length) % images.length].src;
      });
    }

    function open(i) {
      show(i);
      dialog.showModal();
      document.body.classList.add("overflow-hidden");
    }

    dialog.addEventListener("close", () => {
      document.body.classList.remove("overflow-hidden");
      slide.src = "";
    });
    // click outside the figure closes
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.querySelector("[data-lightbox-close]").addEventListener("click", () => dialog.close());
    dialog.querySelector("[data-lightbox-prev]").addEventListener("click", () => show(current - 1));
    dialog.querySelector("[data-lightbox-next]").addEventListener("click", () => show(current + 1));

    dialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });

    // swipe (pointer events cover touch + mouse drag)
    let startX = null, startY = null;
    dialog.addEventListener("pointerdown", (e) => { startX = e.clientX; startY = e.clientY; });
    dialog.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
      startX = startY = null;
    });

    document.addEventListener("gp:langchange", () => {
      grid.querySelectorAll("img").forEach((el, i) => { el.alt = altFor(i); });
      if (dialog.open) slide.alt = altFor(current);
    });
  });
})();
