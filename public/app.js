const state = {
  allEntries: [],
  entries: [],
  categories: [],
  tags: [],
  query: "",
  category: "",
  tag: "",
};
const grid = document.querySelector("#entry-grid");
const template = document.querySelector("#entry-template");
const dialog = document.querySelector("#entry-dialog");

loadEntries();
document.querySelector("#search-input").addEventListener("input", (event) => {
  state.query = event.target.value;
  loadEntries();
});
document
  .querySelector("#filter-toggle")
  .addEventListener("click", () =>
    document.querySelector("#sidebar").classList.toggle("is-open"),
  );
document
  .querySelector("#new-entry-button")
  .addEventListener("click", () => openEditor());
document
  .querySelector("#close-dialog")
  .addEventListener("click", () => dialog.close());
document
  .querySelector("#cancel-entry")
  .addEventListener("click", () => dialog.close());
document.querySelector("#entry-form").addEventListener("submit", saveEntry);

async function loadEntries() {
  const response = await fetch("./data/entries.json");
  if (!response.ok) throw new Error("Could not load entries.");
  const entries = mergeDrafts(await response.json());
  state.allEntries = entries;
  const query = state.query.toLowerCase();
  state.entries = entries.filter((entry) => {
    const matchesQuery =
      !query ||
      `${entry.title} ${entry.content} ${entry.tags.join(" ")}`
        .toLowerCase()
        .includes(query);
    return (
      matchesQuery &&
      (!state.category || entry.category === state.category) &&
      (!state.tag || entry.tags.includes(state.tag))
    );
  });
  state.categories = unique(entries.map((entry) => entry.category));
  state.tags = unique(entries.flatMap((entry) => entry.tags));
  renderFilters();
  renderEntries();
}

function renderEntries() {
  grid.replaceChildren();
  document.querySelector("#results-label").textContent =
    state.query || state.category || state.tag
      ? "Filtered entries"
      : "Latest entries";
  document.querySelector("#results-count").textContent =
    `${state.entries.length} ${state.entries.length === 1 ? "entry" : "entries"}`;
  document.querySelector("#empty-state").hidden = state.entries.length > 0;
  state.entries.forEach((entry) => {
    const card = template.content.cloneNode(true);
    card.querySelector(".entry-category").textContent = entry.category;
    card.querySelector("time").textContent = formatDate(entry.updated);
    card.querySelector("h2").textContent = entry.title;
    card.querySelector(".entry-excerpt").innerHTML =
      renderText(entry.content).slice(0, 280) +
      (entry.content.length > 280 ? "…" : "");
    card.querySelector(".entry-tags").textContent = entry.tags
      .map((tag) => `#${tag}`)
      .join("  ");
    card
      .querySelector(".read-link")
      .addEventListener("click", () => openEntry(entry));
    grid.append(card);
  });
}

function renderFilters() {
  const categoryList = document.querySelector("#category-list");
  categoryList.replaceChildren(
    filterButton("All entries", !state.category && !state.tag, () => {
      state.category = "";
      state.tag = "";
      loadEntries();
    }),
  );
  state.categories.forEach((category) =>
    categoryList.append(
      filterButton(category, state.category === category, () => {
        state.category = category;
        state.tag = "";
        loadEntries();
      }),
    ),
  );
  const tagList = document.querySelector("#tag-list");
  tagList.replaceChildren(
    ...state.tags.slice(0, 30).map((tag) =>
      filterButton(`#${tag}`, state.tag === tag, () => {
        state.tag = tag;
        state.category = "";
        loadEntries();
      }),
    ),
  );
}

function filterButton(label, active, action) {
  const button = document.createElement("button");
  button.className = active ? "filter-button active" : "filter-button";
  button.textContent = label;
  button.type = "button";
  button.addEventListener("click", action);
  return button;
}

function openEntry(entry) {
  const article = document.createElement("article");
  article.className = "reader";
  article.innerHTML = `<div class="dialog-head"><div><p class="eyebrow">${escapeHtml(entry.category)} · ${formatDate(entry.updated)}</p><h2>${escapeHtml(entry.title)}</h2></div><button class="icon-button" type="button" aria-label="Close">×</button></div><div class="reader-body">${renderText(entry.content)}</div><div class="reader-actions"><span>${entry.tags.map((tag) => `#${escapeHtml(tag)}`).join("  ")}</span><button class="button button-quiet edit-entry" type="button">Edit entry</button></div>`;
  dialog.replaceChildren(article);
  article
    .querySelector(".icon-button")
    .addEventListener("click", () => dialog.close());
  article
    .querySelector(".edit-entry")
    .addEventListener("click", () => openEditor(entry));
  dialog.showModal();
}

function openEditor(entry = null) {
  dialog.innerHTML = `<div class="dialog-head"><p class="eyebrow">${entry ? "Edit entry" : "New entry"}</p><button class="icon-button" type="button" aria-label="Close">×</button></div><form id="entry-form"><input id="entry-id" type="hidden" value="${entry?.id || ""}"><label>Title<input id="entry-title" value="${escapeAttribute(entry?.title || "")}" required></label><div class="form-row"><label>Category<input id="entry-category" value="${escapeAttribute(entry?.category || "")}" placeholder="Recipes"></label><label>Tags<input id="entry-tags" value="${escapeAttribute(entry?.tags?.join(", ") || "")}" placeholder="family, vegetarian"></label></div><label>Entry<textarea id="entry-content" rows="16" required placeholder="Write with simple headings, lists, and [[links]]...">${escapeHtml(entry?.content || "")}</textarea></label><div class="form-actions"><button class="button button-quiet cancel-entry" type="button">Cancel</button><button class="button button-dark" type="submit">Save entry</button></div><p class="form-error" hidden></p></form>`;
  dialog.showModal();
  dialog
    .querySelector(".icon-button")
    .addEventListener("click", () => dialog.close());
  dialog
    .querySelector(".cancel-entry")
    .addEventListener("click", () => dialog.close());
  dialog.querySelector("form").addEventListener("submit", saveEntry);
}

async function saveEntry(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.querySelector("#entry-id").value;
  const payload = {
    title: form.querySelector("#entry-title").value,
    category: form.querySelector("#entry-category").value,
    tags: form.querySelector("#entry-tags").value,
    content: form.querySelector("#entry-content").value,
  };
  const stored = JSON.parse(
    localStorage.getItem("family-recipes-drafts") || "[]",
  );
  const existing = state.allEntries.find((item) => item.id === id);
  const entry = {
    id: id || `${slugify(payload.title)}-${Date.now()}`,
    title: payload.title.trim(),
    category: payload.category.trim() || "Uncategorized",
    tags: payload.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    content: payload.content.trim(),
    created: id
      ? existing?.created || new Date().toISOString()
      : new Date().toISOString(),
    updated: new Date().toISOString(),
    author: "mandi628",
  };
  const next = id
    ? state.allEntries.map((item) => (item.id === id ? entry : item))
    : [entry, ...state.allEntries];
  localStorage.setItem("family-recipes-drafts", JSON.stringify(next));
  downloadJson(next, "family-recipes-drafts.json");
  dialog.close();
  alert(
    "Draft downloaded. Replace public/data/entries.json with the downloaded file, then commit and push it to publish the change.",
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "entry"
  );
}

function downloadJson(value, filename) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function mergeDrafts(entries) {
  const drafts = JSON.parse(
    localStorage.getItem("family-recipes-drafts") || "[]",
  );
  const draftIds = new Set(drafts.map((entry) => entry.id));
  return [...drafts, ...entries.filter((entry) => !draftIds.has(entry.id))];
}

function renderText(value) {
  const output = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      output.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (!listItems.length) return;
    output.push(
      `<${listType}>${listItems.map((item) => `<li>${inline(item)}</li>`).join("")}</${listType}>`,
    );
    listType = null;
    listItems = [];
  };

  for (const rawLine of value.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (/^!!+\s*/.test(line)) {
      flushParagraph();
      flushList();
      output.push(`<h3>${inline(line.replace(/^!!+\s*/, ""))}</h3>`);
      continue;
    }
    if (/^!+\s*/.test(line)) {
      flushParagraph();
      flushList();
      output.push(`<h2>${inline(line.replace(/^!+\s*/, ""))}</h2>`);
      continue;
    }
    const unordered = line.match(/^[*-]\s*(.*)$/);
    const ordered = line.match(/^#\s*(.*)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextListType = ordered ? "ol" : "ul";
      if (listType && listType !== nextListType) flushList();
      listType = nextListType;
      listItems.push((unordered || ordered)[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return output.join("");
}

function inline(value) {
  return escapeHtml(value)
    .replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_, label, target) =>
        `<a href="#" data-entry-link="${escapeAttribute(target || label)}">${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character],
  );
}
function escapeAttribute(value) {
  return escapeHtml(value);
}
function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
