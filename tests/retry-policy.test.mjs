import test from "node:test";
import assert from "node:assert/strict";
import { appendAttempt, detectRepeatedPatch, prepareRetry, retryBudget } from "../dist/orchestration/retry-policy.js";

function checkpoint(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: "TASK-0001",
    repositoryRoot: "/repo",
    worktreePath: "/worktree",
    builderProvider: "codex",
    reviewerProvider: "vibe",
    status: "completed",
    stage: "receipt-created",
    startedAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:10:00.000Z",
    maxAttempts: 2,
    maxTotalPriceUsd: 0.5,
    reservedPerAttemptUsd: 0.25,
    reservedPriceCeilingUsd: 0.25,
    attempts: [{
      number: 1,
      builderRunId: "RUN-1",
      reviewerRunId: "REVIEW-1",
      patchSha256: "patch-a",
      verdict: "changes-requested",
      reviewPath: "/review-1.json",
      reservedPriceCeilingUsd: 0.25,
      completedAt: "2026-08-15T00:10:00.000Z",
    }],
    review: {
      schemaVersion: 1,
      taskId: "TASK-0001",
      builderProvider: "codex",
      reviewerProvider: "vibe",
      builderRunId: "RUN-1",
      reviewerRunId: "REVIEW-1",
      verdict: "changes-requested",
      findings: [],
      residualRisks: [],
      structured: true,
      rawResponsePath: "/raw.json",
      createdAt: "2026-08-15T00:10:00.000Z",
    },
    reviewPath: "/review-1.json",
    ...overrides,
  };
}

test("retry budget has bounded safe defaults", () => {
  assert.deepEqual(retryBudget({ builder: "codex", reviewer: "vibe" }), {
    maxAttempts: 3,
    maxTotalPriceUsd: 0.75,
    reservedPerAttemptUsd: 0.25,
  });
  assert.throws(() => retryBudget({ builder: "codex", reviewer: "vibe", maxAttempts: 0 }), /maxAttempts/);
  assert.throws(() => retryBudget({ builder: "codex", reviewer: "vibe", maxTotalPriceUsd: 100 }), /maxTotalPriceUsd/);
});

test("retry consumes the immutable attempt and price ceilings", () => {
  const state = checkpoint();
  const prepared = prepareRetry(state, { builder: "codex", reviewer: "vibe", maxAttempts: 9, maxTotalPriceUsd: 20 });
  assert.equal(prepared.attemptNumber, 2);
  assert.equal(prepared.feedbackPath, "/review-1.json");
  assert.equal(prepared.reservedPerAttemptUsd, 0.25);

  appendAttempt(state, {
    number: 2,
    builderRunId: "RUN-2",
    patchSha256: "patch-b",
    reservedPriceCeilingUsd: 0.25,
    completedAt: "2026-08-15T00:20:00.000Z",
  });
  assert.equal(state.reservedPriceCeilingUsd, 0.5);
  assert.throws(() => prepareRetry(state, { builder: "codex", reviewer: "vibe" }), /épuisé/);
  assert.equal(state.stopReason, "retry-limit");
});

test("retry stops at the reserved price ceiling", () => {
  const state = checkpoint({ maxAttempts: 3, maxTotalPriceUsd: 0.25 });
  assert.throws(() => prepareRetry(state, { builder: "codex", reviewer: "vibe" }), /Plafond de prix/);
  assert.equal(state.stopReason, "price-limit");
});

test("identical patch hashes are recognized as loops", () => {
  const attempts = checkpoint().attempts;
  assert.equal(detectRepeatedPatch(attempts, "patch-a").number, 1);
  assert.equal(detectRepeatedPatch(attempts, "patch-new"), undefined);
});
