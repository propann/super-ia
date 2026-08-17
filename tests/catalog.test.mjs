import assert from "node:assert/strict";
import test from "node:test";
import { providerCatalog } from "../dist/providers/catalog.js";
import { defaultConfig } from "../dist/core/config.js";

test("provider identifiers are unique", () => {
  const ids = providerCatalog.map((provider) => provider.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("remote API access is disabled by default", () => {
  assert.equal(defaultConfig.policy.allowApi, false);
  assert.equal(defaultConfig.policy.monthlyApiBudgetEur, 0);
});

test("all providers declare a security-relevant transport", () => {
  const allowed = new Set(["cli", "web-assisted", "local", "api"]);
  for (const provider of providerCatalog) assert.equal(allowed.has(provider.transport), true);
});
