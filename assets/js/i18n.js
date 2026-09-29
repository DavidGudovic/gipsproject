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
