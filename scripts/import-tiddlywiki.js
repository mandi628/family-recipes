import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "archive", "tiddlywiki.html");
const outputPath = path.join(root, "public", "data", "entries.json");

const source = await readFile(sourcePath, "utf8");
const match = source.match(
  /<script class="tiddlywiki-tiddler-store"[^>]*>([\s\S]*?)<\/script>/,
);

if (!match) {
  throw new Error("Could not find the TiddlyWiki tiddler store in index.html");
}

const tiddlers = JSON.parse(match[1]);
const entries = tiddlers
  .filter((tiddler) => tiddler.title && !tiddler.title.startsWith("$:/"))
  .filter(
    (tiddler) => tiddler.text && !tiddler.type?.includes("application/json"),
  )
  .map((tiddler) => {
    const tags = (tiddler.tags || "").split(/\s+/).filter(Boolean);
    return {
      id: slugify(tiddler.title),
      title: tiddler.title.trim(),
      category: tags[0] || "Uncategorized",
      tags,
      content: tiddler.text,
      created: parseTiddlyDate(tiddler.created),
      updated: parseTiddlyDate(tiddler.modified || tiddler.created),
      author: tiddler.creator || tiddler.modifier || "mandi628",
    };
  });

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(entries, null, 2)}\n`);
console.log(
  `Imported ${entries.length} entries into ${path.relative(root, outputPath)}`,
);

function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `entry-${Date.now()}`
  );
}

function parseTiddlyDate(value) {
  if (!value || !/^\d{14,}$/.test(value)) return new Date().toISOString();
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) return new Date().toISOString();
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  ).toISOString();
}
