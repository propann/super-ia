import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanRepository } from "../dist/core/repository-scanner.js";
import { createTask } from "../dist/core/task-store.js";
import { openControlPlane } from "../dist/control/control-plane.js";
import { registerRepositorySnapshot } from "../dist/control/repository-registry.js";
import { buildGitContext } from "../dist/context/builder.js";
import { runManagedProcess } from "../dist/runtime/process-runner.js";
import { createRunReceipt, verifyRunReceipt } from "../dist/quality/receipt.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  await execFileAsync("git", args, { cwd });
}

test("receipt verifies evidence and detects later artifact tampering", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-receipt-"));
  const root = join(parent, "repo");
  const home = join(parent, "home");
  await git(parent, "init", "-b", "main", root);
  await writeFile(join(root, ".gitignore"), ".superia/\n");
  await writeFile(join(root, "README.md"), "# receipt demo\n");
  await git(root, "config", "user.email", "test@example.invalid");
  await git(root, "config", "user.name", "Super IA Test");
  await git(root, "add", ".");
  await git(root, "commit", "-m", "init");

  try {
    const scan = await scanRepository(root);
    const task = await createTask(scan, "Créer une preuve vérifiable");
    const context = await buildGitContext(root, { taskId: task.id, goal: task.goal }, task);
    const control = await openControlPlane(home);
    const project = registerRepositorySnapshot(control, scan, [task]).project;
    const result = await runManagedProcess({
      projectId: project.id,
      taskId: task.id,
      provider: "codex-cli",
      command: process.execPath,
      args: ["-e", "console.log('receipt-evidence')"],
      cwd: root,
      metadata: {
        mode: "plan",
        contextId: context.manifest.id,
        contextHash: context.manifest.contextHash,
        baseCommit: context.manifest.baseCommit,
      },
    }, control);
    control.close();

    const created = await createRunReceipt(result.runId, home, () => new Date("2026-08-14T23:00:00.000Z"));
    assert.equal(created.receipt.verdict.agentCompleted, true);
    assert.equal(created.receipt.verdict.contextVerified, true);
    assert.equal(created.receipt.verdict.validationState, "not-required");
    assert.equal(created.receipt.verdict.humanApprovalRequired, true);
    assert.equal((await verifyRunReceipt(created.path)).valid, true);

    await writeFile(result.stdoutPath, "tampered\n", "utf8");
    const tampered = await verifyRunReceipt(created.path);
    assert.equal(tampered.valid, false);
    assert.ok(tampered.errors.some((error) => error.includes("stdout")));
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
