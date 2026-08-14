import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const allowedStatuses = new Set(["done", "in_progress", "planned", "blocked", "deferred"]);
const allowedPriorities = new Set(["low", "normal", "high", "critical"]);

test("roadmap tracker has valid identifiers, dependencies and evidence", async () => {
  const roadmap = JSON.parse(await readFile(new URL("../docs/ROADMAP_TRACKER.json", import.meta.url), "utf8"));
  assert.equal(roadmap.schemaVersion, 1);
  assert.match(roadmap.currentVersion, /^\d+\.\d+\.\d+$/);

  const milestoneIds = new Set(roadmap.milestones.map((milestone) => milestone.id));
  assert.equal(milestoneIds.size, roadmap.milestones.length);
  for (const milestone of roadmap.milestones) {
    assert.ok(allowedStatuses.has(milestone.status), `statut milestone invalide: ${milestone.id}`);
  }

  const taskIds = new Set(roadmap.tasks.map((task) => task.id));
  assert.equal(taskIds.size, roadmap.tasks.length);
  for (const task of roadmap.tasks) {
    assert.match(task.id, /^SIA-\d{3}$/);
    assert.ok(milestoneIds.has(task.milestone), `milestone inconnu: ${task.id}`);
    assert.ok(allowedStatuses.has(task.status), `statut invalide: ${task.id}`);
    assert.ok(allowedPriorities.has(task.priority), `priorité invalide: ${task.id}`);
    assert.ok(Array.isArray(task.exitCriteria) && task.exitCriteria.length > 0, `critères manquants: ${task.id}`);
    assert.ok(Array.isArray(task.evidence) && task.evidence.length > 0, `preuves manquantes: ${task.id}`);
    for (const dependency of task.dependencies ?? []) {
      assert.ok(taskIds.has(dependency), `dépendance inconnue ${dependency} pour ${task.id}`);
      assert.notEqual(dependency, task.id, `auto-dépendance: ${task.id}`);
    }
    if (task.status === "blocked") assert.ok(task.blockedBy, `cause de blocage manquante: ${task.id}`);
  }
});
