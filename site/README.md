# Personal Site

Astro site for the landing page, writing archive, and project notes.

## Commands

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 4321
npm run new:note -- "Short useful fragment" --tags control
npm run new:essay -- "Explorable argument" --tags control --interactive
npm run publish:post -- post-slug --status seed
npm run check
```

`npm run check:quick` is the pre-commit path. It validates content, writing
conventions, and script tests without doing a production build.

`npm run check` is the pre-push path. It runs the quick checks, builds the site,
then checks internal links, basic accessibility, and built page integrity.

## Hooks

The repo keeps hooks in `../.hooks` so they can be reviewed and versioned.

```bash
npm run hooks:install
```

After installation:

- `pre-commit` runs `npm run check:quick`.
- `pre-push` runs `npm run check`.

## Writing

See `WRITING.md` for the post workflow and interactive figure pattern.
