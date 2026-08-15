import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { scanRepository } from "../dist/core/repository-scanner.js";
import { createTask, getTask, getTaskGraph, updateTask } from "../dist/core/task-store.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  await execFileAsync("git", args, { cwd });
}

test("mission DAG rejects cycles and automatically releases dependency-managed tasks", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-dag-"));
  try {
    await git(root, "init", "-b", "main");
    await git(root, "config", "user.email", "test@example.invalid");
    await git(root, "config", "user.name", "Super IA Test");
    await writeFile(join(root, "README.md"), "# DAG\n");
    await git(root, "add", ".");
    await git(root, "commit", "-m", "init");

    const scan = await scanRepository(root);
    const foundation = await createTask(scan, "Fondation");
    const build = await createTask(scan, "Construction");
    const review = await createTask(scan, "Revue");

    const blockedBuild = await updateTask(root, build.id, { dependencies: [foundation.id] });
    assert.equal(blockedBuild.status, "blocked");
    assert.equal(blockedBuild.blockedByDependencies, true);

    const blockedReview = await updateTask(root, review.id, { dependencies: [build.id] });
    assert.equal(blockedReview.status, "blocked");
    assert.equal(blockedReview.blockedByDependencies, true);

    await assert.rejects(
      () => updateTask(root, foundation.id, { dependencies: [review.id] }),
      /Cycle de missions refusé/,
    );
    await assert.rejects(
      () => updateTask(root, build.id, { status: "running" }),
      /Dépendances non terminées/,
    );

    await updateTask(root, foundation.id, { status: "done" });
    const releasedBuild = await getTask(root, build.id);
    const stillBlockedReview = await getTask(root, review.id);
    assert.equal(releasedBuild.status, "ready");
    assert.equal(releasedBuild.blockedByDependencies, false);
    assert.equal(stillBlockedReview.status, "blocked");

    await updateTask(root, build.id, { status: "done" });
    const releasedReview = await getTask(root, review.id);
    assert.equal(releasedReview.status, "ready");
    assert.equal(releasedReview.blockedByDependencies, false);

    const graph = await getTaskGraph(root);
    assert.equal(graph.valid, true);
    assert.deepEqual(graph.order, [foundation.id, build.id, review.id]);
    assert.deepEqual(graph.cycles, []);
    assert.deepEqual(graph.missingDependencies, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("manual blocking is not cleared by DAG reconciliation", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-dag-manual-"));
  try {
    await git(root, "init", "-b", "main");
    await git(root, "config", "user.email", "test@example.invalid");
    await git(root, "config", "user.name", "Super IA Test");
    await writeFile(join(root, "README.md"), "# manual block\n");
    await git(root, "add", ".");
    await git(root, "commit", "-m", "init");

    const scan = await scanRepository(root);
    const task = await createTask(scan, "Attente matérielle");
    await updateTask(root, task.id, { status: "blocked" });
    const loaded = await getTask(root, task.id);
    assert.equal(loaded.status, "blocked");
    assert.equal(loaded.blockedByDependencies, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
