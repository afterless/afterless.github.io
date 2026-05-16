# Writing Workflow

The blog is an Astro content collection in `src/content/blog`. New files are
Markdown with frontmatter, and drafts are filtered out of the landing page, blog
index, and post routes while `draft: true`.

This is the small version of the workflow used by heavier static-blog setups:
posts are plain Markdown, metadata is explicit, checks happen before publish, and
publication is a file change rather than a CMS action.

## Create

```bash
npm run new:note -- "Short useful fragment" --tags control,notes
npm run new:essay -- "Longer structured argument" --tags interpretability --description "One-sentence summary."
npm run new:essay -- "Explorable argument" --tags control --interactive
```

Both commands create drafts by default. Publish by changing `draft: false` in the
frontmatter, or use the publish command:

```bash
npm run publish:post -- short-useful-fragment
```

The publish command flips `draft` to `false` and moves `date` to today. Use
`--keep-date` if the date is already intentional, or `--status evergreen` to
change the status at the same time.

## Frontmatter

```yaml
title: "Post title"
date: 2026-05-14
description: "One-sentence summary."
tags: ["control", "notes"]
kind: "note"
draft: true
status: "seed"
```

`kind` controls how the writing index shelves the post. Use `essay` for longer
arguments and `note`, `log`, or `doc` for shorter pieces. `status` is optional
metadata for your own process: `seed`, `draft`, `evergreen`, or `archive`.

## Publish Check

```bash
npm run build
npm run check
```

Astro validates the content schema during the build. The full check command also
validates content metadata, writing conventions, generated routes, internal
links, and basic accessibility.

## Practical Loop

```bash
npm run new:note -- "Observation title" --tags control
npm run dev
npm run check:quick
npm run publish:post -- observation-title --status seed
npm run check
```

## Interactive Posts

For Distill-style pieces, start with:

```bash
npm run new:essay -- "Explorable argument" --tags control --interactive
```

This creates a normal Markdown draft with a working raw HTML figure island, a
slider, an SVG placeholder, and a local `<script type="module">` update loop.
Put reusable figure styling in `src/styles/global.css` under `.essay-content`.

Avoid indenting raw HTML blocks in Markdown. Indented tags can be parsed as code
blocks instead of rendered as figures.

The example post `src/content/blog/a-toy-control-eval.md` demonstrates this
pattern with slider controls, an SVG risk decomposition, and a second SVG
frontier plot.

## Guardrails

The workflow mirrors a heavier static-blog setup in miniature:

- `scripts/new-post.mjs` creates deterministic Markdown drafts.
- `scripts/publish-post.mjs` flips draft state and date metadata.
- `tests/content.test.mjs` catches malformed frontmatter, redundant tags, slug
  issues, and broken interactive figure blocks.
- `tests/writing.test.mjs` catches placeholder prose, empty image alt text,
  duplicate words, and Markdown/HTML indentation mistakes.
- `scripts/check-links.mjs`, `scripts/check-a11y.mjs`, and
  `scripts/check-built-pages.mjs` run after a production build.
- `tests/new-post.test.mjs` protects the generation and publish scripts.

Install the versioned hooks with:

```bash
npm run hooks:install
```
