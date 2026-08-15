import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openControlPlane } from "../dist/control/control-plane.js";
import { registerRepositorySnapshot } from "../dist/control/repository-registry.js";

function scan(root, name) {
  return {
    root,
    name,
    isGitRepository: true,
    branch: "main",
    remote: `https://example.invalid/${name}.git`,
    dirty: false,
    manifests: ["package.json"],
    languages: ["TypeScript"],
    instructions: ["AGENTS.md"],
    scripts: { test: "node --test" },
    recommendedChecks: ["npm run test"],
  };
}

function task(root, id = "TASK-0001") {
  return {
    id,
    title: "Tester le plan de contrôle",
    goal: "Valider la persistance globale",
    status: "planned",
    repositoryRoot: root,
    baseBranch: "main",
    branchName: `agent/${id.toLowerCase()}`,
    createdAt: "2026-08-14T20:00:00.000Z",
    updatedAt: "2026-08-14T20:00:00.000Z",
    checks: ["npm run test"],
    notes: [],
  };
}

test("SQLite WAL persists projects and imports legacy JSON tasks", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-control-"));
  try {
    const control = await openControlPlane(home);
    const first = registerRepositorySnapshot(
      control,
      scan("/srv/git/alpha", "alpha"),
      [task("/srv/git/alpha")],
    );
    registerRepositorySnapshot(control, scan("/srv/git/beta", "beta"), []);
    assert.equal(control.status().journalMode, "wal");
    assert.equal(control.status().schemaVersion, 1);
    assert.equal(control.listProjects().length, 2);
    assert.equal(control.listProjectTasks(first.project.id).length, 1);
    assert.equal(control.status().pendingJournalEvents, 0);
    control.close();

    const reopened = await openControlPlane(home);
    assert.equal(reopened.listProjects().length, 2);
    assert.equal(reopened.listProjectTasks(first.project.id)[0].id, "TASK-0001");
    reopened.close();
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("stale runs are recovered and every event is mirrored to JSONL", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-recovery-"));
  let now = new Date("2026-08-14T20:00:00.000Z");
  try {
    const control = await openControlPlane(home, { now: () => now });
    const project = control.registerProject(scan("/srv/git/recovery", "recovery"));
    const run = control.createRun({
      projectId: project.id,
      provider: "codex-cli",
      taskId: "TASK-0001",
    });
    now = new Date("2026-08-14T20:10:00.000Z");
    const recovered = control.reconcileStaleRuns(60_000);
    assert.equal(recovered.length, 1);
    assert.equal(control.getRun(run.id).status, "interrupted");
    assert.equal(control.status().activeRuns, 0);
    assert.equal(control.status().pendingJournalEvents, 0);

    const journal = await readFile(control.paths.eventJournal, "utf8");
    const lines = journal.trim().split("\n").map((line) => JSON.parse(line));
    assert.ok(lines.some((event) => event.type === "run.started"));
    assert.ok(lines.some((event) => event.type === "run.interrupted"));
    control.close();
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
