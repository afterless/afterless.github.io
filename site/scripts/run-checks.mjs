#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const args = new Set(process.argv.slice(2));

const steps = [
  {
    name: "content",
    command: ["node", "scripts/check-content.mjs"],
  },
  {
    name: "writing",
    command: ["node", "scripts/check-writing.mjs"],
  },
  {
    name: "tests",
    command: [npm, "test"],
  },
];

if (!args.has("--quick")) {
  steps.push({
    name: "build",
    command: [npm, "run", "build"],
  }, {
    name: "links",
    command: ["node", "scripts/check-links.mjs"],
  }, {
    name: "accessibility",
    command: ["node", "scripts/check-a11y.mjs"],
  }, {
    name: "built pages",
    command: ["node", "scripts/check-built-pages.mjs"],
  });
}

for (const step of steps) {
  console.log(`\n[${step.name}] ${step.command.join(" ")}`);
  const result = spawnSync(step.command[0], step.command.slice(1), {
    cwd: SITE_ROOT,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll checks passed.");
