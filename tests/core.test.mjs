import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanRepository } from "../dist/core/repository-scanner.js";
import { createTask, listTasks } from "../dist/core/task-store.js";
import { createWorktree } from "../dist/core/worktree-manager.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  await execFileAsync("git", args, { cwd });
}

test("scanner, persistent task and worktree form a complete local flow", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-core-"));
  const root = join(parent, "demo");
  await git(parent, "init", "-b", "main", root);
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test", build: "tsc" } }));
  await writeFile(join(root, "README.md"), "# demo\n");
  await git(root, "config", "user.email", "test@example.invalid");
  await git(root, "config", "user.name", "Super IA Test");
  await git(root, "add", ".");
  await git(root, "commit", "-m", "init");

  try {
    const scan = await scanRepository(root);
    assert.equal(scan.isGitRepository, true);
    assert.equal(scan.packageManager, "npm");
    assert.deepEqual(scan.recommendedChecks, ["npm run test", "npm run build"]);

    const task = await createTask(scan, "Ajouter une console Matrix");
    assert.equal(task.id, "TASK-0001");
    assert.match(task.branchName, /^agent\/task-0001-/);
    assert.equal((await listTasks(root)).length, 1);

    const result = await createWorktree(task);
    const branch = (await execFileAsync("git", ["branch", "--show-current"], { cwd: result.path })).stdout.trim();
    assert.equal(branch, task.branchName);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
