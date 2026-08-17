import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { scanRepository } from "../dist/core/repository-scanner.js";
import { createTask, getTask, updateTask } from "../dist/core/task-store.js";
import { createWorktree } from "../dist/core/worktree-manager.js";
import { runControlledPipeline } from "../dist/orchestration/pipeline.js";
import { loadPipelineCheckpoint } from "../dist/orchestration/state.js";

const execFileAsync = promisify(execFile);
async function git(cwd, ...args) { await execFileAsync("git", args, { cwd }); }

function fakeExecution(provider, mode, cwd, contextId, runId, messagePath) {
  const directory = join(cwd, ".superia", "contexts", contextId);
  return {
    provider, mode, command: "fake-agent", args: [], cwd, stdinBytes: 1,
    context: {
      directory, missionPath: join(directory, "MISSION.md"), contextPath: join(directory, "CONTEXT.md"), manifestPath: join(directory, "MANIFEST.json"),
      manifest: { schemaVersion: 1, id: contextId, repositoryRoot: cwd, repositoryName: "demo", baseCommit: "abc", dirty: false, taskId: "TASK-0001", createdAt: "2026-08-15T00:00:00Z", maxBytes: 1, includedBytes: 0, contextHash: `hash-${contextId}`, files: [], excluded: [], instructions: [] },
    },
    securityPreflight: { status: "passed", scanner: "gitleaks", findings: 0 },
    sandboxPreflight: { status: "active", engine: "bubblewrap", network: "isolated", workspaceAccess: mode === "build" ? "read-write" : "read-only", ephemeralHome: true },
    process: { runId, command: "fake-agent", args: [], cwd, exitCode: 0, signal: null, timedOut: false, durationMs: 1, stdoutPath: join(cwd, `${runId}.out`), stderrPath: join(cwd, `${runId}.err`), stdoutBytes: 0, stderrBytes: 0, truncated: false, status: "completed" },
    lastMessagePath: messagePath, normalizedEventsPath: join(directory, "EVENTS.json"), parsedEvents: 1, invalidEventLines: 0,
    changeGuard: { schemaVersion: 1, passed: true, allowedPaths: mode === "build" ? ["src/**"] : [], changedFiles: mode === "build" ? ["src/app.js"] : [], outOfScopeFiles: [], diffPath: join(directory, "AGENT_CHANGES.patch"), reportPath: join(directory, "CHANGE_GUARD.json") },
  };
}

function fakeReceipt(runId, root) {
  return {
    path: join(root, `${runId}.receipt.json`),
    receipt: {
      schemaVersion: 1, id: `RCP-${runId}`, createdAt: "2026-08-15T00:00:00Z",
      run: { id: runId, projectId: "P", provider: "codex-cli", mode: "build", status: "completed", startedAt: "2026-08-15T00:00:00Z" },
      project: { id: "P", name: "demo", root }, git: { cwd: root, dirty: true, changedFiles: [], diffSha256: "hash" }, artifacts: [], validations: [],
      verdict: { agentCompleted: true, contextVerified: true, artifactsVerified: true, validationState: "passed", reviewState: "changes-requested", humanApprovalRequired: true }, receiptHash: "hash",
    },
  };
}

test("retry passes prior review to builder and stops an identical patch loop", async () => {
  const previous = process.env.SUPERIA_HOME;
  const parent = await mkdtemp(join(tmpdir(), "superia-retry-loop-"));
  process.env.SUPERIA_HOME = join(parent, "control");
  const root = join(parent, "demo");
  await git(parent, "init", "-b", "main", root);
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src", "app.js"), "export const ok = true;\n", "utf8");
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node -e \"process.exit(0)\"" } }), "utf8");
  await git(root, "config", "user.email", "test@example.invalid");
  await git(root, "config", "user.name", "Super IA Test");
  await git(root, "add", ".");
  await git(root, "commit", "-m", "init");

  try {
    const task = await createTask(await scanRepository(root), "Corriger src/app.js");
    await createWorktree(task);
    await updateTask(root, task.id, { allowedPaths: ["src/**"] });
    const updated = await getTask(root, task.id);
    let builderCalls = 0;
    let reviewerCalls = 0;
    let correctionFeedback;

    const codex = async (_root, _taskId, options) => {
      builderCalls += 1;
      correctionFeedback = builderCalls === 2 ? options.feedbackPath : correctionFeedback;
      const contextId = `CTX-B${builderCalls}`;
      const directory = join(updated.worktreePath, ".superia", "contexts", contextId);
      await mkdir(directory, { recursive: true });
      const message = join(directory, "builder.txt");
      await writeFile(message, "done", "utf8");
      const result = fakeExecution("codex-cli", "build", updated.worktreePath, contextId, `RUN-B${builderCalls}`, message);
      await writeFile(result.changeGuard.diffPath, "identical-patch\n", "utf8");
      return result;
    };
    const vibe = async () => {
      reviewerCalls += 1;
      const directory = join(updated.worktreePath, ".superia", "contexts", `CTX-R${reviewerCalls}`);
      await mkdir(directory, { recursive: true });
      const message = join(directory, "review.json");
      await writeFile(message, JSON.stringify({
        verdict: "changes-requested",
        findings: [{ severity: "high", category: "test", summary: "Correction insuffisante", evidence: "Le comportement reste inchangé", recommendation: "Modifier la logique" }],
        residualRisks: [],
      }), "utf8");
      return fakeExecution("mistral-vibe", "review", updated.worktreePath, `CTX-R${reviewerCalls}`, `RUN-R${reviewerCalls}`, message);
    };
    const dependencies = {
      codex, vibe,
      validate: async () => ({ projectId: "P", repositoryRoot: updated.worktreePath, passed: true, checks: [] }),
      receipt: async (runId) => fakeReceipt(runId, root),
    };

    const first = await runControlledPipeline(root, task.id, {
      builder: "codex", reviewer: "vibe", maxAttempts: 3, maxPriceUsd: 0.25, maxTotalPriceUsd: 0.75,
    }, dependencies);
    assert.equal(first.passed, false);
    let state = await loadPipelineCheckpoint(root, task.id);
    assert.equal(state.stopReason, "changes-requested");
    assert.equal(state.attempts.length, 1);
    assert.equal(state.reservedPriceCeilingUsd, 0.25);

    await assert.rejects(runControlledPipeline(root, task.id, {
      builder: "codex", reviewer: "vibe", retry: true,
    }, dependencies), /Boucle détectée/);

    state = await loadPipelineCheckpoint(root, task.id);
    assert.equal(builderCalls, 2);
    assert.equal(reviewerCalls, 1);
    assert.equal(correctionFeedback, first.reviewPath);
    assert.equal(state.stopReason, "loop-detected");
    assert.equal(state.attempts.length, 2);
    assert.equal(state.reservedPriceCeilingUsd, 0.5);
  } finally {
    process.env.SUPERIA_HOME = previous;
    await rm(parent, { recursive: true, force: true });
  }
});
