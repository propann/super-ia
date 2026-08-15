import test from "node:test";
import assert from "node:assert/strict";
import { providerCatalog } from "../dist/providers/catalog.js";
import { routeProvider } from "../dist/providers/router.js";

function checks(installed = {}) {
  return providerCatalog.map((provider) => ({
    ...provider,
    installed: installed[provider.id] ?? false,
    executablePath: installed[provider.id] ? `/usr/bin/${provider.command ?? provider.id}` : undefined,
  }));
}

function request(overrides = {}) {
  return {
    mode: "plan",
    budget: "zero",
    requireCommands: false,
    allowApi: false,
    preferredProviders: ["codex-cli", "mistral-vibe"],
    readyForRealAgents: true,
    readinessBlockers: [],
    ...overrides,
  };
}

function summary(providerId, overrides = {}) {
  return {
    providerId,
    mode: "plan",
    sampleCount: 3,
    successCount: 3,
    successRate: 1,
    medianDurationMs: 10_000,
    averageCostEur: 0,
    qualitySampleCount: 3,
    averageQualityScore: 100,
    trustedForRouting: true,
    ...overrides,
  };
}

test("zero-budget routing prefers an installed included provider", () => {
  const decision = routeProvider(
    checks({ "codex-cli": true, "mistral-vibe": true }),
    request(),
  );
  assert.equal(decision.recommendedProviderId, "codex-cli");
  assert.equal(decision.launchAllowed, true);
  assert.equal(decision.candidates.find((item) => item.id === "mistral-vibe").eligible, false);
  assert.ok(decision.candidates.find((item) => item.id === "mistral-vibe").rejectedBy.some((reason) => reason.includes("hors budget")));
});

test("low budget selects Vibe when Codex is unavailable", () => {
  const decision = routeProvider(
    checks({ "mistral-vibe": true }),
    request({ budget: "low" }),
  );
  assert.equal(decision.recommendedProviderId, "mistral-vibe");
  assert.equal(decision.launchAllowed, true);
});

test("build requiring commands excludes Vibe and every non-ready adapter", () => {
  const decision = routeProvider(
    checks({ "mistral-vibe": true, "claude-code": true }),
    request({ mode: "build", budget: "any", requireCommands: true }),
  );
  assert.equal(decision.recommendedProviderId, undefined);
  assert.equal(decision.launchAllowed, false);
  assert.ok(decision.candidates.find((item) => item.id === "mistral-vibe").rejectedBy.some((reason) => reason.includes("commandes")));
  assert.ok(decision.candidates.find((item) => item.id === "claude-code").rejectedBy.some((reason) => reason.includes("adaptateur planned")));
});

test("readiness can block launch without falsifying the provider recommendation", () => {
  const decision = routeProvider(
    checks({ "codex-cli": true }),
    request({
      readyForRealAgents: false,
      readinessBlockers: ["Preuve Bubblewrap: absente"],
    }),
  );
  assert.equal(decision.recommendedProviderId, "codex-cli");
  assert.equal(decision.launchAllowed, false);
  assert.deepEqual(decision.launchBlockedBy, ["Preuve Bubblewrap: absente"]);
});

test("trusted local measurements can reorder eligible providers as a bounded secondary signal", () => {
  const benchmarks = {
    "codex-cli:plan": summary("codex-cli", {
      successCount: 0,
      successRate: 0,
      medianDurationMs: 600_000,
      averageQualityScore: 0,
    }),
    "mistral-vibe:plan": summary("mistral-vibe", {
      averageCostEur: 0.1,
    }),
  };
  const decision = routeProvider(
    checks({ "codex-cli": true, "mistral-vibe": true }),
    request({ budget: "low", benchmarks }),
  );
  assert.equal(decision.recommendedProviderId, "mistral-vibe");
  assert.ok(decision.candidates.find((item) => item.id === "mistral-vibe").benchmarkScore > 0);
  assert.ok(decision.candidates.find((item) => item.id === "codex-cli").benchmarkScore < 0);
});

test("insufficient measurements are visible but ignored", () => {
  const decision = routeProvider(
    checks({ "codex-cli": true }),
    request({
      benchmarks: {
        "codex-cli:plan": summary("codex-cli", {
          sampleCount: 2,
          successCount: 2,
          trustedForRouting: false,
        }),
      },
    }),
  );
  const candidate = decision.candidates.find((item) => item.id === "codex-cli");
  assert.equal(candidate.benchmarkScore, 0);
  assert.ok(candidate.reasons.some((reason) => reason.includes("2/3")));
});

test("benchmarks never make a forbidden provider eligible", () => {
  const decision = routeProvider(
    checks({ "claude-code": true }),
    request({
      budget: "any",
      benchmarks: {
        "claude-code:plan": summary("claude-code"),
      },
    }),
  );
  const candidate = decision.candidates.find((item) => item.id === "claude-code");
  assert.equal(candidate.eligible, false);
  assert.equal(candidate.score, 0);
  assert.ok(candidate.rejectedBy.some((reason) => reason.includes("adaptateur planned")));
});
