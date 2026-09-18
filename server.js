import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(root, "public", "data", "entries.json");
const publicPath = path.join(root, "public");
const port = Number(process.env.PORT || 3000);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/api/entries")
      return await entriesRoute(request, response, url);
    if (url.pathname.startsWith("/api/entries/"))
      return await entryRoute(request, response, url);
    return await staticRoute(request, response, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Something went wrong." });
  }
});

server.listen(port, () =>
  console.log(`Family Recipes is running at http://localhost:${port}`),
);

async function entriesRoute(request, response, url) {
  if (request.method === "GET") {
    const entries = await loadEntries();
    const query = (url.searchParams.get("q") || "").toLowerCase();
    const category = url.searchParams.get("category");
    const tag = url.searchParams.get("tag");
    const filtered = entries.filter((entry) => {
      const matchesQuery =
        !query ||
        `${entry.title} ${entry.content} ${entry.tags.join(" ")}`
          .toLowerCase()
          .includes(query);
      return (
        matchesQuery &&
        (!category || entry.category === category) &&
        (!tag || entry.tags.includes(tag))
      );
    });
    return sendJson(response, 200, {
      entries: filtered,
      categories: unique(entries.map((entry) => entry.category)),
      tags: unique(entries.flatMap((entry) => entry.tags)),
    });
  }
  if (request.method === "POST") return saveEntry(request, response);
  return sendJson(response, 405, { error: "Method not allowed." });
}

async function entryRoute(request, response, url) {
  const id = decodeURIComponent(url.pathname.split("/").pop());
  const entries = await loadEntries();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1)
    return sendJson(response, 404, { error: "Entry not found." });
  if (request.method === "GET") return sendJson(response, 200, entries[index]);
  if (request.method === "PUT")
    return saveEntry(request, response, entries, index);
  if (request.method === "DELETE") {
    entries.splice(index, 1);
    await saveEntries(entries);
    return sendJson(response, 204, null);
  }
  return sendJson(response, 405, { error: "Method not allowed." });
}

async function saveEntry(request, response, entries = null, index = -1) {
  const input = await readJson(request);
  if (!input.title?.trim() || !input.content?.trim())
    return sendJson(response, 400, {
      error: "Title and content are required.",
    });
  const currentEntries = entries || (await loadEntries());
  const now = new Date().toISOString();
  const existing = index >= 0 ? currentEntries[index] : null;
  const entry = {
    id:
      existing?.id ||
      `${slugify(input.title)}-${crypto.randomUUID().slice(0, 8)}`,
    title: input.title.trim(),
    category: input.category?.trim() || "Uncategorized",
    tags: normalizeTags(input.tags),
    content: input.content.trim(),
    created: existing?.created || now,
    updated: now,
    author: input.author?.trim() || existing?.author || "mandi628",
  };
  if (index >= 0) currentEntries[index] = entry;
  else currentEntries.unshift(entry);
  await saveEntries(currentEntries);
  return sendJson(response, index >= 0 ? 200 : 201, entry);
}

async function staticRoute(request, response, pathname) {
  if (request.method !== "GET")
    return sendJson(response, 405, { error: "Method not allowed." });
  const filePath = path.resolve(
    publicPath,
    pathname === "/" ? "index.html" : `.${pathname}`,
  );
  if (!filePath.startsWith(publicPath))
    return sendJson(response, 403, { error: "Forbidden." });
  try {
    const content = await readFile(filePath);
    const type = pathname.endsWith(".css")
      ? "text/css"
      : pathname.endsWith(".js")
        ? "text/javascript"
        : "text/html";
    response.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "Not found." });
  }
}

async function loadEntries() {
  return JSON.parse(await readFile(dataPath, "utf8"));
}

async function saveEntries(entries) {
  await writeFile(dataPath, `${JSON.stringify(entries, null, 2)}\n`);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolve(body ? JSON.parse(body) : {}));
    request.on("error", reject);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(body === null ? undefined : JSON.stringify(body));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}
function normalizeTags(tags) {
  return Array.isArray(tags)
    ? tags
    : String(tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
}
function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "entry"
  );
}
