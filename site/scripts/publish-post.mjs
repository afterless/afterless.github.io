#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SITE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = join(SITE_ROOT, "src/content/blog");

const help = `
Publish a draft post.

Usage:
  npm run publish:post -- post-slug
  npm run publish:post -- post-slug --status evergreen

Options:
  --status seed|draft|evergreen|archive
  --keep-date       Do not move the published date to today.
  --dry-run         Print the changed frontmatter only.
`.trim();

const validStatuses = new Set(["seed", "draft", "evergreen", "archive"]);

if (isCliEntrypoint()) {
  publishPostFromCli(process.argv.slice(2));
}

export function publishPostFromCli(args) {
  const options = parsePublishArgs(args);
  const filePath = findPost(options.slug);
  const source = readFileSync(filePath, "utf8");
  const frontmatter = publishFrontmatter(splitFrontmatter(source).frontmatter, {
    date: new Date().toISOString().slice(0, 10),
    keepDate: options.keepDate,
    status: options.status,
  });
  const nextSource = `---\n${frontmatter.trim()}\n---${splitFrontmatter(source).body}`;

  if (options.dryRun) {
    console.log(filePath);
    console.log("");
    console.log(frontmatter.trim());
    return;
  }

  writeFileSync(filePath, nextSource, "utf8");
  console.log(`Published ${filePath}`);
}

export function parsePublishArgs(args) {
  const options = {
    slug: "",
    status: "",
    keepDate: false,
    dryRun: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      console.log(help);
      process.exit(0);
    }

    if (arg === "--keep-date") {
      options.keepDate = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--status") {
      options.status = readOption(args, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--status=")) {
      options.status = arg.slice("--status=".length);
      continue;
    }

    if (!options.slug) {
      options.slug = arg;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  if (!options.slug) {
    console.error(help);
    process.exit(1);
  }

  if (options.status && !validStatuses.has(options.status)) {
    throw new Error(`Unknown status "${options.status}". Use seed, draft, evergreen, or archive.`);
  }

  return options;
}

export function publishFrontmatter(frontmatter, { date, keepDate = false, status = "" }) {
  let nextFrontmatter = upsertField(frontmatter, "draft", "false");
  if (!keepDate) {
    nextFrontmatter = upsertField(nextFrontmatter, "date", date);
  }
  if (status) {
    nextFrontmatter = upsertField(nextFrontmatter, "status", JSON.stringify(status));
  }
  return nextFrontmatter;
}

export function splitFrontmatter(source) {
  if (!source.startsWith("---\n")) {
    throw new Error("Post must start with YAML frontmatter.");
  }

  const closingIndex = source.indexOf("\n---", 4);
  if (closingIndex === -1) {
    throw new Error("Post frontmatter is missing a closing marker.");
  }

  return {
    frontmatter: source.slice(4, closingIndex),
    body: source.slice(closingIndex + 4),
  };
}

function readOption(allArgs, index, name) {
  const value = allArgs[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function findPost(slug) {
  const normalized = slug.endsWith(".md") ? slug : `${slug}.md`;
  const directPath = join(CONTENT_DIR, normalized);
  if (existsSync(directPath)) return directPath;

  const matches = readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".md"))
    .filter((file) => file === normalized || file.startsWith(slug));

  if (matches.length === 1) return join(CONTENT_DIR, matches[0]);
  if (matches.length > 1) {
    throw new Error(`Ambiguous slug "${slug}". Matches: ${matches.join(", ")}`);
  }

  throw new Error(`No post found for slug "${slug}".`);
}

function upsertField(frontmatter, key, value) {
  const lines = frontmatter.split("\n");
  const fieldPattern = new RegExp(`^${escapeRegExp(key)}:\\s*`);
  const index = lines.findIndex((line) => fieldPattern.test(line));
  const nextLine = `${key}: ${value}`;

  if (index === -1) {
    return `${frontmatter.trimEnd()}\n${nextLine}\n`;
  }

  lines[index] = nextLine;
  return lines.join("\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isCliEntrypoint() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}
