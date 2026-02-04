#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  console.log(`Usage: node scripts/release.mjs <version> [--notes <path>] [--dry-run]

Options:
  --notes <path>    Use an existing release notes file
  --dry-run         Print commands without executing
  --skip-tests      Skip check:prompts and tests
  --skip-publish    Skip npm publish
  --skip-push       Skip git push + git push --tags
  --skip-github     Skip GitHub release creation
  --allow-dirty     Allow dirty git working tree
`);
  process.exit(0);
}

const version = args[0];
let notesPath = null;
for (let i = 1; i < args.length; i += 1) {
  if (args[i] === "--notes") {
    notesPath = args[i + 1];
  }
}

const flags = new Set(args);
const dryRun = flags.has("--dry-run");
const skipTests = flags.has("--skip-tests");
const skipPublish = flags.has("--skip-publish");
const skipPush = flags.has("--skip-push");
const skipGithub = flags.has("--skip-github");
const allowDirty = flags.has("--allow-dirty");

function run(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  if (dryRun) return;
  execSync(cmd, { stdio: "inherit", ...options });
}

function readCmd(cmd) {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

function ensureClean() {
  if (allowDirty) return;
  const status = readCmd("git status --porcelain");
  if (status) {
    console.error("Working tree is dirty. Commit or stash changes before releasing (or pass --allow-dirty).\n");
    process.exit(1);
  }
}

function getPrevTag() {
  const tags = readCmd("git tag --list --sort=-creatordate").split(/\r?\n/).filter(Boolean);
  return tags[0] || "";
}

function normalizeVersion(tag) {
  return tag.startsWith("v") ? tag.slice(1) : tag;
}

function buildNotesFile() {
  if (notesPath) {
    if (!existsSync(notesPath)) {
      console.error(`Notes file not found: ${notesPath}`);
      process.exit(1);
    }
    return notesPath;
  }

  const templatePath = path.join("workflow", "release-notes-template.md");
  if (!existsSync(templatePath)) {
    console.error("Missing workflow/release-notes-template.md. Provide --notes <path>.");
    process.exit(1);
  }

  const prevTag = getPrevTag();
  const prevVersion = normalizeVersion(prevTag || "0.0.0");
  const template = readFileSync(templatePath, "utf-8");
  const body = template
    .replace(/\{\{VERSION\}\}/g, version)
    .replace(/\{\{PREV_VERSION\}\}/g, prevVersion);

  const tmpPath = path.join(os.tmpdir(), `redpen-release-${version}.md`);
  writeFileSync(tmpPath, body, "utf-8");
  return tmpPath;
}

function hasGh() {
  try {
    readCmd("gh --version");
    return true;
  } catch {
    return false;
  }
}

ensureClean();

if (!skipTests) {
  run("npm run check:prompts");
  run("npm test");
}

run(`npm version ${version} --no-git-tag-version`);

run("git add -A");
run(`git commit -m \"chore(release): v${version}\"`);
run(`git tag v${version}`);

if (!skipPublish) {
  run("npm publish");
}

if (!skipPush) {
  run("git push");
  run("git push --tags");
}

if (!skipGithub) {
  if (!hasGh()) {
    console.log("gh not found; skipping GitHub release creation");
  } else {
    const notesFile = buildNotesFile();
    run(`gh release create v${version} -F \"${notesFile}\"`);
    if (notesFile.includes(os.tmpdir()) && existsSync(notesFile)) {
      if (!dryRun) unlinkSync(notesFile);
    }
  }
}
