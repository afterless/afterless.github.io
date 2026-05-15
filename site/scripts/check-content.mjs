#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = join(SITE_ROOT, "src/content/blog");

const validKinds = new Set(["essay", "note", "log", "doc"]);
const validStatuses = new Set(["seed", "draft", "evergreen", "archive"]);
const redundantTags = new Set([
  "essay",
  "note",
  "log",
  "doc",
  "interactive",
  "interactive-figure",
  "interactive figure",
  "explorable",
]);

const failures = [];
const seenSlugs = new Set();
const seenTitles = new Map();

for (const filePath of markdownFiles(CONTENT_DIR)) {
  checkPost(filePath);
}

if (failures.length > 0) {
  console.error("Content checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Content checks passed.");

function checkPost(filePath) {
  const source = readFileSync(filePath, "utf8");
  const displayPath = relative(SITE_ROOT, filePath).split(sep).join("/");
  const slug = displayPath.replace(/^src\/content\/blog\//, "").replace(/\.md$/, "");

  if (!/^[a-z0-9][a-z0-9/-]*[a-z0-9]$/.test(slug)) {
    fail(displayPath, `slug "${slug}" should be lowercase words separated by hyphens`);
  }

  if (seenSlugs.has(slug)) {
    fail(displayPath, `duplicate slug "${slug}"`);
  }
  seenSlugs.add(slug);

  const parsed = splitFrontmatter(source);
  if (!parsed) {
    fail(displayPath, "missing YAML frontmatter");
    return;
  }

  const frontmatter = parseFrontmatter(parsed.frontmatter);
  const title = frontmatter.get("title");
  const description = frontmatter.get("description");
  const date = frontmatter.get("date");
  const kind = frontmatter.get("kind");
  const status = frontmatter.get("status");
  const draft = frontmatter.get("draft");
  const tags = parseTags(frontmatter.get("tags"), displayPath);

  requireField(displayPath, "title", title);
  requireField(displayPath, "date", date);
  requireField(displayPath, "description", description);

  if (title) {
    const normalizedTitle = title.toLowerCase();
    const previousPath = seenTitles.get(normalizedTitle);
    if (previousPath) {
      fail(displayPath, `title duplicates ${previousPath}`);
    }
    seenTitles.set(normalizedTitle, displayPath);
  }

  if (kind && !validKinds.has(kind)) {
    fail(displayPath, `kind "${kind}" is not one of ${[...validKinds].join(", ")}`);
  }

  if (status && !validStatuses.has(status)) {
    fail(displayPath, `status "${status}" is not one of ${[...validStatuses].join(", ")}`);
  }

  if (draft !== undefined && !["true", "false"].includes(draft)) {
    fail(displayPath, "draft must be true or false");
  }

  if (draft !== "true" && /TODO:/i.test(`${title ?? ""} ${description ?? ""}`)) {
    fail(displayPath, "published posts should not keep TODO frontmatter");
  }

  for (const tag of tags) {
    const normalizedTag = tag.toLowerCase();
    if (redundantTags.has(normalizedTag)) {
      fail(displayPath, `tag "${tag}" is redundant; use kind/status or the figure itself`);
    }
  }

  checkInteractiveBlocks(displayPath, parsed.body);
}

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

function splitFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;
  return {
    frontmatter: match[1],
    body: source.slice(match[0].length),
  };
}

function parseFrontmatter(frontmatter) {
  const fields = new Map();
  for (const line of frontmatter.split("\n")) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!match) continue;
    fields.set(match[1], unquote(match[2].trim()));
  }
  return fields;
}

function parseTags(rawValue, displayPath) {
  if (!rawValue) return [];
  if (!rawValue.startsWith("[")) {
    fail(displayPath, "tags should use an inline array, e.g. tags: [\"control\"]");
    return [];
  }

  try {
    const value = JSON.parse(rawValue.replace(/'/g, '"'));
    if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string")) {
      fail(displayPath, "tags must be an array of strings");
      return [];
    }
    return value;
  } catch {
    fail(displayPath, "tags are not parseable as an inline array");
    return [];
  }
}

function checkInteractiveBlocks(displayPath, body) {
  const sectionCount = count(body, /<section\s+class="explorable-demo"/g);
  if (sectionCount === 0) return;

  const closingSectionCount = count(body, /<\/section>/g);
  if (closingSectionCount < sectionCount) {
    fail(displayPath, "interactive section is missing a closing </section>");
  }

  if (!body.includes('<script type="module">')) {
    fail(displayPath, "interactive posts should keep figure logic in a local module script");
  }

  for (const [index, line] of body.split("\n").entries()) {
    if (/^\s+<(section|script)\b/.test(line)) {
      fail(displayPath, `raw HTML starts indented on line ${index + 1}; Markdown may parse it as code`);
    }
  }
}

function count(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function requireField(displayPath, field, value) {
  if (!value) fail(displayPath, `missing required field "${field}"`);
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function fail(displayPath, message) {
  failures.push(`${displayPath}: ${message}`);
}
