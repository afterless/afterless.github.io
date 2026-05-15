#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST_DIR = join(SITE_ROOT, "dist");
const SOURCE_DIR = join(SITE_ROOT, "src");
const failures = [];

if (!existsSync(DIST_DIR)) {
  console.error("Link checks require a built site. Run npm run build first.");
  process.exit(1);
}

for (const filePath of textFiles(SOURCE_DIR)) {
  checkSourceLinks(filePath);
}

for (const filePath of textFiles(DIST_DIR, [".html"])) {
  checkBuiltLinks(filePath);
}

if (failures.length > 0) {
  console.error("Link checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Link checks passed.");

function checkSourceLinks(filePath) {
  const source = readFileSync(filePath, "utf8");
  const displayPath = relative(SITE_ROOT, filePath).split(sep).join("/");
  const links = [
    ...source.matchAll(/\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g),
    ...source.matchAll(/\b(?:href|src)=["']([^"']+)["']/g),
  ];

  for (const match of links) {
    const href = match[1];
    if (!shouldCheck(href)) continue;
    if (href.startsWith("http")) {
      checkExternal(displayPath, href);
      continue;
    }
    checkInternal(displayPath, href);
  }
}

function checkBuiltLinks(filePath) {
  const source = readFileSync(filePath, "utf8");
  const displayPath = relative(SITE_ROOT, filePath).split(sep).join("/");
  for (const match of source.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    const href = match[1];
    if (!shouldCheck(href) || href.startsWith("http")) continue;
    checkInternal(displayPath, href);
  }
}

function checkExternal(displayPath, href) {
  try {
    new URL(href);
  } catch {
    failures.push(`${displayPath}: malformed external URL "${href}"`);
  }
}

function checkInternal(displayPath, href) {
  const [pathPart, hash] = href.split("#");
  if (!pathPart && hash) return;
  if (pathPart.startsWith("./") || pathPart.startsWith("../")) return;

  const path = decodeURIComponent(pathPart || "/");
  const candidates = [];

  if (path.startsWith("/_astro/") || path.startsWith("/favicon")) return;
  if (/\.[A-Za-z0-9]+$/.test(path)) {
    candidates.push(join(DIST_DIR, path));
    candidates.push(join(SITE_ROOT, "public", path));
  } else {
    candidates.push(join(DIST_DIR, path, "index.html"));
    candidates.push(join(DIST_DIR, `${path}.html`));
  }

  if (!candidates.some((candidate) => existsSync(candidate))) {
    failures.push(`${displayPath}: broken internal link "${href}"`);
  }
}

function shouldCheck(href) {
  return (
    href &&
    !href.startsWith("#") &&
    !href.startsWith("mailto:") &&
    !href.startsWith("tel:") &&
    !href.startsWith("data:") &&
    !href.includes("{")
  );
}

function textFiles(dir, extensions = [".astro", ".md", ".html"]) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return textFiles(path, extensions);
    return entry.isFile() && extensions.includes(extname(entry.name)) ? [path] : [];
  });
}
