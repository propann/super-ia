import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { captureGitWorkspace, enforceGitChangeScope, pathIsAllowed } from "../dist/quality/change-guard.js";

const execFileAsync = promisify(execFile);
async function git(cwd, ...args) { await execFileAsync("git", args, { cwd }); }

test("change guard archives diff and rejects files outside task scope", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-change-guard-"));
  const artifacts = join(root, ".superia", "artifacts");
  try {
    await git(root, "init", "-b", "main");
    await git(root, "config", "user.email", "test@example.invalid");
    await git(root, "config", "user.name", "Super IA Test");
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "docs"), { recursive: true });
    await writeFile(join(root, ".gitignore"), ".superia/\n");
    await writeFile(join(root, "src", "app.ts"), "export const value = 1;\n");
    await writeFile(join(root, "docs", "README.md"), "# Docs\n");
    await git(root, "add", ".");
    await git(root, "commit", "-m", "init");

    const before = await captureGitWorkspace(root);
    await writeFile(join(root, "src", "app.ts"), "export const value = 2;\n");
    await writeFile(join(root, "docs", "README.md"), "# Changed outside scope\n");
    const report = await enforceGitChangeScope({ before, afterRoot: root, allowedPaths: ["src/**"], artifactDirectory: artifacts });

    assert.equal(report.passed, false);
    assert.deepEqual(report.changedFiles, ["docs/README.md", "src/app.ts"]);
    assert.deepEqual(report.outOfScopeFiles, ["docs/README.md"]);
    assert.equal(pathIsAllowed("src/app.ts", ["src/**"]), true);
    assert.equal(pathIsAllowed("docs/README.md", ["src/**"]), false);
    assert.match(await readFile(report.diffPath, "utf8"), /Changed outside scope/);
    assert.equal(JSON.parse(await readFile(report.reportPath, "utf8")).passed, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("change guard accepts an allowed file and plan mode accepts no changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-change-guard-clean-"));
  try {
    await git(root, "init", "-b", "main");
    await git(root, "config", "user.email", "test@example.invalid");
    await git(root, "config", "user.name", "Super IA Test");
    await writeFile(join(root, ".gitignore"), ".superia/\n");
    await writeFile(join(root, "app.ts"), "one\n");
    await git(root, "add", ".");
    await git(root, "commit", "-m", "init");
    const before = await captureGitWorkspace(root);
    const clean = await enforceGitChangeScope({ before, afterRoot: root, allowedPaths: [], artifactDirectory: join(root, ".superia", "clean") });
    assert.equal(clean.passed, true);
    await writeFile(join(root, "app.ts"), "two\n");
    const allowed = await enforceGitChangeScope({ before, afterRoot: root, allowedPaths: ["app.ts"], artifactDirectory: join(root, ".superia", "allowed") });
    assert.equal(allowed.passed, true);
    assert.deepEqual(allowed.outOfScopeFiles, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
