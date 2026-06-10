// Page behaviour: scroll reveals, header state, mobile menu, floating call button, year.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    // rise-in reveals
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    // header shadow once scrolled
    const header = document.getElementById("site-header");
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // mobile menu
    const menuBtn = document.getElementById("menu-toggle");
    const menu = document.getElementById("mobile-menu");
    menuBtn.addEventListener("click", () => {
      const open = menu.classList.toggle("hidden") === false;
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        menu.classList.add("hidden");
        menuBtn.setAttribute("aria-expanded", "false");
      })
    );

    // floating call button after the hero
    const fab = document.getElementById("call-fab");
    const hero = document.getElementById("hero");
    new IntersectionObserver(([entry]) => {
      fab.classList.toggle("translate-y-24", entry.isIntersecting);
      fab.classList.toggle("opacity-0", entry.isIntersecting);
    }).observe(hero);

    document.getElementById("year").textContent = new Date().getFullYear();
  });
})();
