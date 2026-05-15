#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SITE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = join(SITE_ROOT, "src/content/blog");

const help = `
Create a blog draft.

Usage:
  npm run new:note -- "Short title" --tags control,notes
  npm run new:essay -- "Longer title" --description "One-sentence summary"
  npm run new:post -- "Title" --kind doc --publish

Options:
  --kind note|essay|log|doc       Content type. Defaults to note.
  --tags tag-a,tag-b              Comma-separated tags.
  --description "..."             Frontmatter description.
  --status seed|draft|evergreen|archive
  --slug custom-slug              Override generated slug.
  --interactive                   Add an explorable figure scaffold.
  --publish                       Create as public instead of draft.
  --dry-run                       Print the target file and template only.
`.trim();

const validKinds = new Set(["essay", "note", "log", "doc"]);
const validStatuses = new Set(["seed", "draft", "evergreen", "archive"]);

if (isCliEntrypoint()) {
  createPostFromCli(process.argv.slice(2));
}

export function createPostFromCli(args) {
  const parsed = parseArgs(args);
  const title = parsed.title;

  if (!title) {
    console.error(help);
    process.exit(1);
  }

  const date = new Date().toISOString().slice(0, 10);
  const baseSlug = slugify(parsed.options.slug || title);
  const filePath = uniquePath(join(CONTENT_DIR, `${baseSlug}.md`));
  const post = buildPost({
    title,
    date,
    description: parsed.options.description,
    tags: parsed.options.tags,
    kind: parsed.options.kind,
    draft: parsed.options.draft,
    status: parsed.options.status,
    interactive: parsed.options.interactive,
  });

  if (parsed.options.dryRun) {
    console.log(filePath);
    console.log("");
    console.log(post);
    return;
  }

  mkdirSync(CONTENT_DIR, { recursive: true });
  writeFileSync(filePath, post, "utf8");
  console.log(`Created ${filePath}`);
}

export function parseArgs(args) {
  const options = {
    kind: "note",
    tags: [],
    description: "TODO: replace with a one-sentence summary.",
    draft: true,
    status: "seed",
    slug: "",
    interactive: false,
    dryRun: false,
  };
  const titleParts = [];

  function readOption(index, name) {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${name} requires a value.`);
    }
    return value;
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      console.log(help);
      process.exit(0);
    }

    if (arg === "--publish") {
      options.draft = false;
      continue;
    }

    if (arg === "--draft") {
      options.draft = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--interactive") {
      options.interactive = true;
      continue;
    }

    if (arg === "--kind") {
      options.kind = readOption(index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--kind=")) {
      options.kind = arg.slice("--kind=".length);
      continue;
    }

    if (arg === "--tags") {
      options.tags = parseTags(readOption(index, arg));
      index += 1;
      continue;
    }

    if (arg.startsWith("--tags=")) {
      options.tags = parseTags(arg.slice("--tags=".length));
      continue;
    }

    if (arg === "--description") {
      options.description = readOption(index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--description=")) {
      options.description = arg.slice("--description=".length);
      continue;
    }

    if (arg === "--status") {
      options.status = readOption(index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--status=")) {
      options.status = arg.slice("--status=".length);
      continue;
    }

    if (arg === "--slug") {
      options.slug = readOption(index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--slug=")) {
      options.slug = arg.slice("--slug=".length);
      continue;
    }

    titleParts.push(arg);
  }

  if (!validKinds.has(options.kind)) {
    throw new Error(`Unknown kind "${options.kind}". Use note, essay, log, or doc.`);
  }

  if (!validStatuses.has(options.status)) {
    throw new Error(`Unknown status "${options.status}". Use seed, draft, evergreen, or archive.`);
  }

  return {
    title: titleParts.join(" ").trim(),
    options,
  };
}

export function parseTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

export function uniquePath(path) {
  if (!existsSync(path)) return path;

  const extension = ".md";
  const stem = path.slice(0, -extension.length);

  for (let index = 2; index < 1000; index += 1) {
    const nextPath = `${stem}-${index}${extension}`;
    if (!existsSync(nextPath)) return nextPath;
  }

  throw new Error("Could not find an unused filename.");
}

export function buildPost({ title, date, description, tags, kind, draft, status, interactive }) {
  const body = kind === "essay" ? essayBody({ interactive }) : shortBody(kind);

  return `---
title: ${yamlString(title)}
date: ${date}
description: ${yamlString(description)}
tags: ${yamlArray(tags)}
kind: ${yamlString(kind)}
draft: ${draft}
status: ${yamlString(status)}
---

${body}
`;
}

function yamlString(value) {
  return JSON.stringify(value);
}

function yamlArray(values) {
  return `[${values.map(yamlString).join(", ")}]`;
}

function essayBody({ interactive }) {
  return `## Claim

State the core claim in one or two sentences.

## Context

What problem is this post trying to make clearer?

${interactive ? `${interactiveFigureTemplate()}\n` : ""}

## Argument

Build the argument from concrete examples before generalizing.

## Cruxes

- What would change your mind?
- What still feels under-specified?

## Notes

- Links, related drafts, or follow-up questions.
`;
}

function interactiveFigureTemplate() {
  return `<section class="explorable-demo" data-explorable-demo>
<div class="explorable-header">
<h2>One question this figure should answer</h2>
</div>
<div class="explorable-threshold" aria-hidden="true">
<span></span><span></span><span></span><span></span><span></span>
</div>
<div class="explorable-layout">
<div class="explorable-controls" aria-label="Interactive figure controls">
<label><span>Parameter</span><input type="range" min="0" max="100" value="50" data-control="parameter" /><output data-output="parameter">50</output></label>
</div>
<figure class="explorable-figure">
<svg viewBox="0 0 640 220" role="img" aria-label="Interactive placeholder figure" data-figure-svg>
<path class="threshold-arc" d="M52 48 C160 18 278 20 378 48"></path>
<line x1="52" y1="170" x2="588" y2="170" class="axis"></line>
<rect x="52" y="92" width="268" height="54" rx="4" fill="#b8793a" data-figure-bar></rect>
<circle cx="320" cy="119" r="6" class="frontier-point" data-figure-point></circle>
</svg>
<figcaption><strong>Figure caption</strong><span>Replace this with a compact legend, not a paragraph.</span></figcaption>
</figure>
</div>
</section>

<script type="module">
  const root = document.querySelector("[data-explorable-demo]");

  if (root) {
    const slider = root.querySelector("[data-control='parameter']");
    const output = root.querySelector("[data-output='parameter']");
    const bar = root.querySelector("[data-figure-bar]");
    const point = root.querySelector("[data-figure-point]");

    function update() {
      const value = Number(slider.value);
      output.textContent = value;
      bar.setAttribute("width", 90 + value * 4.4);
      point.setAttribute("cx", 52 + value * 5.36);
    }

    slider.addEventListener("input", update);
    update();
  }
</script>`;
}

function shortBody(kind) {
  const heading = kind === "doc" ? "Reference" : kind === "log" ? "Log" : "Note";

  return `## ${heading}

Write the useful fragment first.

## Back room

- Source, uncertainty, or nearby question.
`;
}

function isCliEntrypoint() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}
