import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function loadCatalog() {
  const raw = await readFile(new URL("../docs/research/RESEARCH_CATALOG.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

test("research catalog is valid and identifiers are unique", async () => {
  const catalog = await loadCatalog();
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.principles.piRole, "control-plane-only");
  assert.equal(catalog.principles.localInferenceRequired, false);
  assert.ok(catalog.projects.length >= 20);

  const ids = catalog.projects.map((project) => project.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every researched project has a decision surface", async () => {
  const catalog = await loadCatalog();
  for (const project of catalog.projects) {
    assert.ok(project.repository);
    assert.ok(project.category);
    assert.ok(project.priority);
    assert.ok(Array.isArray(project.features));
    assert.ok(Array.isArray(project.adopt));
    assert.ok(Array.isArray(project.avoid));
  }
});
