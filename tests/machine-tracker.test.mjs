import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("machine preparation tracker has stable tasks and valid dependencies", async () => {
  const tracker = JSON.parse(await readFile("docs/MACHINE_TRACKER.json", "utf8"));
  assert.equal(tracker.schemaVersion, 1);
  assert.equal(tracker.targetProfile, "standard");
  const ids = tracker.tasks.map((task) => task.id);
  assert.equal(new Set(ids).size, ids.length);
  const known = new Set(ids);
  for (const task of tracker.tasks) {
    assert.match(task.id, /^MCH-\d{3}$/);
    assert.ok(["done", "planned", "blocked"].includes(task.status));
    for (const dependency of task.dependencies ?? []) assert.equal(known.has(dependency), true, `${task.id} -> ${dependency}`);
  }
  assert.equal(tracker.tasks.filter((task) => task.status === "done").length, 9);
  assert.equal(tracker.releaseGate.automaticMerge, false);
  for (const required of tracker.releaseGate.required) assert.equal(known.has(required), true);
});
