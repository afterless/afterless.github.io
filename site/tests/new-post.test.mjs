import assert from "node:assert/strict";
import test from "node:test";
import { buildPost, parseArgs, slugify } from "../scripts/new-post.mjs";
import { publishFrontmatter } from "../scripts/publish-post.mjs";

test("interactive essay generation emits a draft with a figure island", () => {
  const parsed = parseArgs(
    [
      "--kind",
      "essay",
      "Dry Run Generator Spec",
      "--tags",
      "control",
      "--interactive",
      "--dry-run",
    ],
  );
  const output = buildPost({
    title: parsed.title,
    date: "2026-05-15",
    ...parsed.options,
  });

  assert.match(output, /draft: true/);
  assert.match(output, /tags: \["control"\]/);
  assert.match(output, /<section class="explorable-demo" data-explorable-demo>/);
  assert.match(output, /<script type="module">/);
});

test("slug generation is stable and filesystem-friendly", () => {
  assert.equal(slugify("A Toy Control Eval: Part 1"), "a-toy-control-eval-part-1");
});

test("publish frontmatter flips draft state and can preserve dates", () => {
  const output = publishFrontmatter(
    `title: "Hello, World"
date: 2026-02-22
description: "First post."
kind: "note"`,
    { date: "2026-05-15", keepDate: true, status: "evergreen" },
  );

  assert.match(output, /draft: false/);
  assert.match(output, /status: "evergreen"/);
  assert.match(output, /date: 2026-02-22/);
});
