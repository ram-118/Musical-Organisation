const passwordInput = document.getElementById("admin-password");
const statusPanel = document.getElementById("admin-status");
const themeStorageKey = "music-website-theme";
const adminAchievementsList = document.getElementById("admin-achievements-list");
const adminCollaborationsList = document.getElementById("admin-collaborations-list");
const adminImagesList = document.getElementById("admin-images-list");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeImageUrl(url) {
  return typeof url === "string" && url.startsWith("/images/") ? url : "/images/RS7-logo.png";
}

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

function setStatus(message, variant = "") {
  statusPanel.textContent = message;
  statusPanel.className = `status-panel${variant ? ` ${variant}` : ""}`;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": passwordInput.value
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Request failed.");
  }

  return result;
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Failed to load ${url}`);
  }

  return result;
}

async function deleteItem(url) {
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "x-admin-password": passwordInput.value
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Delete request failed.");
  }

  return result;
}

function renderAdminList(container, items, type) {
  if (!items.length) {
    container.classList.add("empty-state");
    container.textContent = `No ${type} available.`;
    return;
  }

  container.classList.remove("empty-state");
  container.innerHTML = items
    .map((item) => {
      const id = item._id || item.id;
      const title = escapeHtml(item.title || item.name || "Untitled");
      const subtitle = escapeHtml(item.description || item.filename || "");
      const safeId = escapeHtml(id);
      const imageUrl = normalizeImageUrl(item.url);
      const preview =
        type === "images"
          ? `<img class="admin-item__thumb" src="${imageUrl}?v=${encodeURIComponent(item.createdAt || id)}" alt="${title}">`
          : "";

      return `
        <article class="admin-item">
          <div class="admin-item__main">
            ${preview}
            <div class="admin-item__copy">
              <strong>${title}</strong>
              <span>${subtitle || "No extra details."}</span>
            </div>
          </div>
          <button class="button button--danger admin-remove" type="button" data-type="${type}" data-id="${safeId}">
            Remove
          </button>
        </article>
      `;
    })
    .join("");
}

async function refreshAdminLists() {
  try {
    const [achievements, collaborations, images] = await Promise.all([
      loadJson("/api/achievements"),
      loadJson("/api/collaborations"),
      loadJson("/api/images")
    ]);

    renderAdminList(adminAchievementsList, achievements, "achievements");
    renderAdminList(adminCollaborationsList, collaborations, "collaborations");
    renderAdminList(adminImagesList, images, "images");
  } catch (error) {
    adminAchievementsList.textContent = error.message;
    adminCollaborationsList.textContent = error.message;
    adminImagesList.textContent = error.message;
  }
}

document.getElementById("achievement-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);

  try {
    await postJson("/api/achievements", {
      title: form.get("title"),
      description: form.get("description")
    });
    formElement.reset();
    refreshAdminLists();
    setStatus("Achievement saved successfully.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.getElementById("collaboration-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);

  try {
    await postJson("/api/collaborations", {
      name: form.get("name"),
      description: form.get("description")
    });
    formElement.reset();
    refreshAdminLists();
    setStatus("Collaboration saved successfully.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.getElementById("image-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);

  try {
    const response = await fetch("/api/images", {
      method: "POST",
      headers: {
        "x-admin-password": passwordInput.value
      },
      body: form
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Image upload failed.");
    }

    formElement.reset();
    refreshAdminLists();
    setStatus(`Image uploaded: ${result.title}`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.addEventListener("click", async (event) => {
  const removeButton = event.target.closest(".admin-remove");

  if (!removeButton) {
    return;
  }

  try {
    await deleteItem(`/api/${removeButton.dataset.type}/${removeButton.dataset.id}`);
    await refreshAdminLists();
    setStatus("Item removed successfully.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

setupThemeToggle();
refreshAdminLists();
