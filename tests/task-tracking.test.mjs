import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanRepository } from "../dist/core/repository-scanner.js";
import { addTaskNote, createTask, getTask, listTasks, taskCompletion, updateTask } from "../dist/core/task-store.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  await execFileAsync("git", args, { cwd });
}

test("tasks support priorities, dependencies, blocking and progress", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-tasks-"));
  try {
    await git(root, "init", "-b", "main");
    await git(root, "config", "user.email", "test@example.invalid");
    await git(root, "config", "user.name", "Super IA Test");
    await writeFile(join(root, "README.md"), "# task tracking\n");
    await git(root, "add", ".");
    await git(root, "commit", "-m", "init");

    const scan = await scanRepository(root);
    const foundation = await createTask(scan, "Préparer le socle");
    const security = await createTask(scan, "Ajouter la sécurité");
    await updateTask(root, foundation.id, { status: "done", priority: "high" });
    await updateTask(root, security.id, {
      status: "blocked",
      priority: "critical",
      owner: "max",
      provider: "codex-cli",
      dueDate: "2026-08-20",
      tags: ["security", "pi"],
      dependencies: [foundation.id],
      acceptanceCriteria: ["Gitleaks passe", "Receipt vérifié"],
    });
    await addTaskNote(root, security.id, "Attente de validation matérielle.");

    const loaded = await getTask(root, security.id);
    assert.equal(loaded.status, "blocked");
    assert.equal(loaded.priority, "critical");
    assert.equal(loaded.owner, "max");
    assert.deepEqual(loaded.dependencies, [foundation.id]);
    assert.deepEqual(loaded.tags, ["security", "pi"]);
    assert.equal(loaded.notes.length, 1);

    const tasks = await listTasks(root);
    assert.deepEqual(taskCompletion(tasks), { total: 2, done: 1, active: 1, blocked: 1, percent: 50 });
    await assert.rejects(() => updateTask(root, security.id, { dependencies: [security.id] }), /elle-même/);
    await assert.rejects(() => updateTask(root, security.id, { dependencies: ["TASK-9999"] }), /introuvable/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
