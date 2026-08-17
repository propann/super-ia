import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { captureGitWorkspace, enforceGitChangeScope } from "../dist/quality/change-guard.js";

const execFileAsync = promisify(execFile);
async function git(cwd, ...args) { await execFileAsync("git", args, { cwd }); }

async function repository(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  await git(root, "init", "-b", "main");
  await git(root, "config", "user.email", "test@example.invalid");
  await git(root, "config", "user.name", "Super IA Test");
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src", "app.ts"), "export const ok = true;\n", "utf8");
  await git(root, "add", ".");
  await git(root, "commit", "-m", "init");
  return root;
}

test("forbidden credential paths fail even when a broad scope allows them", async () => {
  const root = await repository("superia-forbidden-");
  try {
    const before = await captureGitWorkspace(root);
    await writeFile(join(root, ".env"), "TOKEN=not-a-real-secret\n", "utf8");
    const report = await enforceGitChangeScope({
      before,
      afterRoot: root,
      allowedPaths: ["**"],
      artifactDirectory: join(root, ".superia", "guard"),
    });
    assert.equal(report.passed, false);
    assert.deepEqual(report.outOfScopeFiles, []);
    assert.deepEqual(report.forbiddenFiles, [".env"]);
    assert.equal(report.limitViolations.length, 0);
    assert.equal(JSON.parse(await readFile(report.reportPath, "utf8")).forbiddenFiles[0], ".env");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("change guard fails when too many files are modified", async () => {
  const root = await repository("superia-file-limit-");
  try {
    const before = await captureGitWorkspace(root);
    await writeFile(join(root, "src", "one.ts"), "one\n", "utf8");
    await writeFile(join(root, "src", "two.ts"), "two\n", "utf8");
    const report = await enforceGitChangeScope({
      before,
      afterRoot: root,
      allowedPaths: ["src/**"],
      artifactDirectory: join(root, ".superia", "guard"),
      maxChangedFiles: 1,
    });
    assert.equal(report.passed, false);
    assert.deepEqual(report.outOfScopeFiles, []);
    assert.match(report.limitViolations[0], /^too-many-files:2>1$/);
    assert.equal(report.limits.changedFiles, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("change guard counts untracked content against the diff byte ceiling", async () => {
  const root = await repository("superia-diff-limit-");
  try {
    const before = await captureGitWorkspace(root);
    await writeFile(join(root, "src", "large.txt"), "x".repeat(256), "utf8");
    const report = await enforceGitChangeScope({
      before,
      afterRoot: root,
      allowedPaths: ["src/**"],
      artifactDirectory: join(root, ".superia", "guard"),
      maxDiffBytes: 100,
    });
    assert.equal(report.passed, false);
    assert.ok(report.limits.diffBytes >= 256);
    assert.match(report.limitViolations[0], /^diff-too-large:/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid non-positive limits fail closed", async () => {
  const root = await repository("superia-invalid-limit-");
  try {
    const before = await captureGitWorkspace(root);
    await assert.rejects(enforceGitChangeScope({
      before,
      afterRoot: root,
      allowedPaths: ["src/**"],
      artifactDirectory: join(root, ".superia", "guard"),
      maxChangedFiles: 0,
    }), /maxChangedFiles/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
