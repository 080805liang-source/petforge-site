(() => {
  const config = window.PETFORGE_MEMBERSHIP;
  if (!config?.apiUrl) return;
  const filename = window.location.pathname.split("/").pop() || "index.html";
  const page = ({ "": "home", "index.html": "home", "creator.html": "creator", "workshop.html": "workshop", "support.html": "support" })[filename];
  if (!page) return;
  const payload = JSON.stringify({ page });
  fetch(`${config.apiUrl}/analytics/pageview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
    credentials: "omit"
  }).catch(() => {});
})();
