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
