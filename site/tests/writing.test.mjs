import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SITE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = join(SITE_ROOT, "src/content/blog");

const weakPhrases = [
  /\bthis post is only a template\b/i,
  /\bstay tuned\b/i,
  /\blorem ipsum\b/i,
  /\bcoming soon\b/i,
  /\bunder construction\b/i,
];

test("blog writing avoids placeholders and Markdown footguns", () => {
  const failures = [];

  for (const filePath of markdownFiles(CONTENT_DIR)) {
    checkFile(filePath, failures);
  }

  assertNoFailures(failures);
});

function checkFile(filePath, failures) {
  const source = readFileSync(filePath, "utf8");
  const displayPath = relative(SITE_ROOT, filePath).split(sep).join("/");
  const body = source.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const lines = body.split("\n");

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (/\b([A-Za-z]+)\s+\1\b/i.test(line)) {
      fail(failures, displayPath, lineNumber, "duplicate adjacent word");
    }

    if (/!\[\s*\]\(/.test(line)) {
      fail(failures, displayPath, lineNumber, "image is missing alt text");
    }

    if (/^#{2,6}\s+.*[.:;!?]\s*$/.test(line)) {
      fail(failures, displayPath, lineNumber, "section headings should not end with punctuation");
    }

    if (/^\s{1,3}<(section|script|figure|svg)\b/.test(line)) {
      fail(failures, displayPath, lineNumber, "raw HTML blocks should not be indented in Markdown");
    }
  });

  for (const phrase of weakPhrases) {
    const match = body.match(phrase);
    if (match) {
      fail(failures, displayPath, lineForIndex(body, match.index ?? 0), `placeholder-like phrase "${match[0]}"`);
    }
  }
}

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

function lineForIndex(value, index) {
  return value.slice(0, index).split("\n").length;
}

function fail(failures, displayPath, lineNumber, message) {
  failures.push(`${displayPath}:${lineNumber}: ${message}`);
}

function assertNoFailures(failures) {
  if (failures.length > 0) {
    assert.fail(`Writing conventions failed:\n- ${failures.join("\n- ")}`);
  }
}
