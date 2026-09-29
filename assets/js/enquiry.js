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
