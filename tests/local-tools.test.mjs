import test from "node:test";
import assert from "node:assert/strict";
import { localToolCatalog } from "../dist/tools/catalog.js";

test("local tool identifiers are unique", () => {
  const ids = localToolCatalog.map((tool) => tool.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("required local tools stay lightweight", () => {
  const required = localToolCatalog.filter((tool) => tool.status === "required");
  assert.ok(required.length > 0);
  assert.ok(required.every((tool) => tool.lightweight));
});

test("every local tool declares at least one executable candidate", () => {
  assert.ok(localToolCatalog.every((tool) => tool.commandCandidates.length > 0));
});
