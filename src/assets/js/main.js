function initTheme() {
  const saved = localStorage.getItem("codemint-theme");
  const theme = saved || "dark";
  document.documentElement.dataset.theme = theme;

  const toggle = document.querySelector("#theme-toggle");
  if (!toggle) return;

  toggle.textContent = theme === "dark" ? "☼" : "◐";
  toggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("codemint-theme", next);
    toggle.textContent = next === "dark" ? "☼" : "◐";
  });
}

function initPostSearch() {
  const input = document.querySelector("#post-search");
  const cards = Array.from(document.querySelectorAll(".post-card"));
  const target = document.querySelector("#tag-filter");
  if (!input || !cards.length || !target) return;

  const tags = Array.from(
    new Set(cards.flatMap((card) => (card.dataset.tags || "").split(" ").filter(Boolean)))
  );
  let activeTag = "all";

  function renderFilters() {
    target.innerHTML = "";
    ["全部", ...tags].forEach((tag) => {
      const button = document.createElement("button");
      const value = tag === "全部" ? "all" : tag;
      button.type = "button";
      button.className = `tag-btn${activeTag === value ? " active" : ""}`;
      button.textContent = tag;
      button.addEventListener("click", () => {
        activeTag = value;
        renderFilters();
        filterCards();
      });
      target.appendChild(button);
    });
  }

  function filterCards() {
    const query = input.value.trim().toLowerCase();
    cards.forEach((card) => {
      const haystack = [
        card.dataset.title,
        card.dataset.excerpt,
        card.dataset.tags
      ].join(" ").toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesTag = activeTag === "all" || (card.dataset.tags || "").split(" ").includes(activeTag);
      card.hidden = !(matchesSearch && matchesTag);
    });
  }

  input.addEventListener("input", filterCards);
  renderFilters();
}

initTheme();
initPostSearch();
