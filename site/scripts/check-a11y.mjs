#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST_DIR = join(SITE_ROOT, "dist");
const failures = [];

if (!existsSync(DIST_DIR)) {
  console.error("Accessibility checks require a built site. Run npm run build first.");
  process.exit(1);
}

for (const filePath of htmlFiles(DIST_DIR)) {
  checkHtml(filePath);
}

if (failures.length > 0) {
  console.error("Accessibility checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Accessibility checks passed.");

function checkHtml(filePath) {
  const html = readFileSync(filePath, "utf8");
  const displayPath = relative(SITE_ROOT, filePath).split(sep).join("/");

  if (!/<main\b/i.test(html)) {
    fail(displayPath, "page is missing a <main> landmark");
  }

  if ((html.match(/<h1\b/gi) ?? []).length !== 1) {
    fail(displayPath, "page should have exactly one <h1>");
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\balt=["'][^"']*["']/i.test(tag)) {
      fail(displayPath, `image is missing alt text: ${trimTag(tag)}`);
    }
  }

  for (const match of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    const tag = match[0];
    const text = stripTags(match[1]).trim();
    if (!text && !/\baria-label=["'][^"']+["']/i.test(tag)) {
      fail(displayPath, `button has no accessible name: ${trimTag(tag)}`);
    }
  }

  for (const match of html.matchAll(/<svg\b[^>]*role=["']img["'][^>]*>/gi)) {
    const tag = match[0];
    if (!/\baria-label=["'][^"']+["']/i.test(tag) && !/\baria-labelledby=["'][^"']+["']/i.test(tag)) {
      fail(displayPath, `image-like svg has no accessible name: ${trimTag(tag)}`);
    }
  }

  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = match[0];
    if (/\btype=["']hidden["']/i.test(tag)) continue;
    if (/\baria-label=["'][^"']+["']/i.test(tag)) continue;

    const before = html.slice(Math.max(0, match.index - 180), match.index);
    const after = html.slice(match.index, Math.min(html.length, match.index + 180));
    if (!/<label\b[^>]*>[\s\S]*$/i.test(before) || !/^[\s\S]*<\/label>/i.test(after)) {
      fail(displayPath, `input is not wrapped in a label or aria-labeled: ${trimTag(tag)}`);
    }
  }
}

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  });
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, "");
}

function trimTag(value) {
  return value.replace(/\s+/g, " ").slice(0, 120);
}

function fail(displayPath, message) {
  failures.push(`${displayPath}: ${message}`);
}
