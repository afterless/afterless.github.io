#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST_DIR = join(SITE_ROOT, "dist");
const failures = [];

if (!existsSync(DIST_DIR)) {
  console.error("Built-page checks require a built site. Run npm run build first.");
  process.exit(1);
}

for (const route of ["/", "/blog/", "/projects/", "/blog/a-toy-control-eval/"]) {
  const filePath = join(DIST_DIR, route, "index.html");
  if (!existsSync(filePath)) {
    failures.push(`${route}: route did not build`);
    continue;
  }
  const html = readFileSync(filePath, "utf8");
  if (html.length < 1200) failures.push(`${route}: built page is unexpectedly small`);
  if (/\bundefined\b|\[object Object\]/.test(stripScripts(html))) {
    failures.push(`${route}: built page contains a likely template leak`);
  }
}

for (const filePath of htmlFiles(DIST_DIR)) {
  const html = readFileSync(filePath, "utf8");
  const displayPath = relative(SITE_ROOT, filePath).split(sep).join("/");
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    failures.push(`${displayPath}: missing title`);
  }
  if (!/<meta name="description" content="[^"]+"/i.test(html)) {
    failures.push(`${displayPath}: missing meta description`);
  }
}

if (failures.length > 0) {
  console.error("Built-page checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Built-page checks passed.");

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  });
}

function stripScripts(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
}
