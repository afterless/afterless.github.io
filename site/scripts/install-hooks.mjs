#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = dirname(SITE_ROOT);
const HOOKS_DIR = join(REPO_ROOT, ".hooks");

for (const hook of ["pre-commit", "pre-push"]) {
  chmodSync(join(HOOKS_DIR, hook), 0o755);
}

const result = spawnSync("git", ["config", "core.hooksPath", ".hooks"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Git hooks now use .hooks.");
