const themeStorageKey = "music-website-theme";

function applyTheme(theme) {
  document.body.dataset.theme = theme;
}

function setupThemeToggle() {
  const savedTheme = localStorage.getItem(themeStorageKey) || "light";
  const toggle = document.querySelector("[data-theme-toggle]");

  applyTheme(savedTheme);

  if (!toggle) {
    return;
  }

  toggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    localStorage.setItem(themeStorageKey, nextTheme);
  });
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  return response.json();
}

function renderList(containerId, items, titleKey, descriptionKey) {
  const container = document.getElementById(containerId);

  if (!items.length) {
    container.textContent = "No entries yet.";
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <div class="item">
          <strong>${item[titleKey]}</strong>
          <span>${item[descriptionKey] || "Details will appear here."}</span>
        </div>
      `
    )
    .join("");
}

function renderGallery(items) {
  const container = document.getElementById("gallery-list");

  if (!items.length) {
    container.textContent = "No gallery images yet.";
    return;
  }

  container.classList.remove("empty-state");
  container.innerHTML = items
    .map(
      (item) => `
        <figure class="gallery-card">
          <img src="${item.url}?v=${encodeURIComponent(item.createdAt || item.id || Date.now())}" alt="${item.title}" />
          <p>${item.title}</p>
        </figure>
      `
    )
    .join("");
}

async function boot() {
  setupThemeToggle();

  const [achievementsResult, collaborationsResult, imagesResult] = await Promise.allSettled([
    loadJson("/api/achievements"),
    loadJson("/api/collaborations"),
    loadJson("/api/images")
  ]);

  if (achievementsResult.status === "fulfilled") {
    renderList("achievements-list", achievementsResult.value, "title", "description");
  } else {
    document.getElementById("achievements-list").textContent = "Unable to load achievements right now.";
  }

  if (collaborationsResult.status === "fulfilled") {
    renderList("collaborations-list", collaborationsResult.value, "name", "description");
  } else {
    document.getElementById("collaborations-list").textContent = "Unable to load collaborations right now.";
  }

  if (imagesResult.status === "fulfilled") {
    renderGallery(imagesResult.value);
  } else {
    document.getElementById("gallery-list").textContent = "Unable to load gallery right now.";
  }
}

boot();
