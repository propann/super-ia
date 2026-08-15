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
import { runRepositoryValidations } from "../dist/runtime/validation.js";

const execFileAsync = promisify(execFile);
async function git(cwd, ...args) { await execFileAsync("git", args, { cwd }); }

function processResult(runId, cwd) {
  return { runId, command: "fake-agent", args: [], cwd, exitCode: 0, signal: null, timedOut: false, durationMs: 10, stdoutPath: join(cwd, `${runId}.stdout.log`), stderrPath: join(cwd, `${runId}.stderr.log`), stdoutBytes: 0, stderrBytes: 0, truncated: false, status: "completed" };
}

function context(cwd, id) {
  const directory = join(cwd, ".superia", "contexts", id);
  return {
    directory,
    missionPath: join(directory, "MISSION.md"),
    contextPath: join(directory, "CONTEXT.md"),
    manifestPath: join(directory, "MANIFEST.json"),
    manifest: { schemaVersion: 1, id, repositoryRoot: cwd, repositoryName: "demo", baseCommit: "abc123", dirty: false, taskId: "TASK-0001", createdAt: "2026-08-15T00:00:00.000Z", maxBytes: 1000, includedBytes: 0, contextHash: `hash-${id}`, files: [], excluded: [], instructions: [] },
  };
}

function execution(provider, mode, cwd, id, runId, lastMessagePath) {
  const ctx = context(cwd, id);
  return {
    provider, mode, command: "fake-agent", args: [], cwd, stdinBytes: 10, context: ctx,
    securityPreflight: { status: "passed", scanner: "gitleaks", findings: 0 },
    sandboxPreflight: { status: "active", engine: "bubblewrap", network: "isolated", workspaceAccess: mode === "build" ? "read-write" : "read-only", ephemeralHome: true },
    process: processResult(runId, cwd), lastMessagePath, normalizedEventsPath: join(ctx.directory, "EVENTS.json"), parsedEvents: 1, invalidEventLines: 0,
    changeGuard: { schemaVersion: 1, passed: true, allowedPaths: mode === "build" ? ["src/**"] : [], changedFiles: mode === "build" ? ["src/app.js"] : [], outOfScopeFiles: [], diffPath: join(ctx.directory, "AGENT_CHANGES.patch"), reportPath: join(ctx.directory, "CHANGE_GUARD.json") },
  };
}

test("pipeline enforces independent builder, validations, review and receipt", async () => {
  const previousHome = process.env.SUPERIA_HOME;
  const parent = await mkdtemp(join(tmpdir(), "superia-pipeline-"));
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
    const task = await createTask(await scanRepository(root), "Modifier src/app.js");
    await createWorktree(task);
    await updateTask(root, task.id, { allowedPaths: ["src/**"] });
    const updated = await getTask(root, task.id);
    const order = [];

    const codex = async (_root, _taskId, options) => {
      order.push(`builder:${options.mode}`);
      const ctx = context(updated.worktreePath, "CTX-BUILDER");
      await mkdir(ctx.directory, { recursive: true });
      const message = join(ctx.directory, "CODEX_LAST_MESSAGE.md");
      await writeFile(message, "build complete", "utf8");
      const result = execution("codex-cli", "build", updated.worktreePath, "CTX-BUILDER", "RUN-BUILDER", message);
      await writeFile(result.changeGuard.diffPath, "patch-one\n", "utf8");
      return result;
    };
    const vibe = async (_root, _taskId, options) => {
      order.push(`reviewer:${options.mode}`);
      const ctx = context(updated.worktreePath, "CTX-REVIEWER");
      await mkdir(ctx.directory, { recursive: true });
      const message = join(ctx.directory, "VIBE_OUTPUT.json");
      await writeFile(message, JSON.stringify({ verdict: "approve", findings: [], residualRisks: ["Validation matérielle encore nécessaire"] }), "utf8");
      return execution("mistral-vibe", "review", updated.worktreePath, "CTX-REVIEWER", "RUN-REVIEWER", message);
    };
    const receipt = async (runId) => ({
      path: join(parent, "RECEIPT.json"),
      receipt: {
        schemaVersion: 1, id: "RCP-TEST", createdAt: "2026-08-15T00:00:00.000Z",
        run: { id: runId, projectId: "P", provider: "codex-cli", mode: "build", status: "completed", startedAt: "2026-08-15T00:00:00.000Z" },
        project: { id: "P", name: "demo", root },
        git: { cwd: updated.worktreePath, dirty: true, changedFiles: [], diffSha256: "hash" }, artifacts: [], validations: [],
        verdict: { agentCompleted: true, contextVerified: true, artifactsVerified: true, validationState: "passed", reviewState: "approve", humanApprovalRequired: true }, receiptHash: "hash",
      },
    });

    const result = await runControlledPipeline(root, task.id, { builder: "codex", reviewer: "vibe", timeoutMs: 30_000 }, {
      codex, vibe,
      validate: async (directory, options) => { order.push("validate"); return runRepositoryValidations(directory, options); },
      receipt: async (runId) => { order.push(`receipt:${runId}`); return receipt(runId); },
    });

    assert.equal(result.passed, true);
    assert.equal(result.review.verdict, "approve");
    assert.equal(result.review.structured, true);
    assert.deepEqual(order, ["builder:build", "validate", "reviewer:review", "receipt:RUN-BUILDER"]);
  } finally {
    process.env.SUPERIA_HOME = previousHome;
    await rm(parent, { recursive: true, force: true });
  }
});

test("pipeline refuses the same provider before execution", async () => {
  await assert.rejects(runControlledPipeline(".", "TASK-0001", { builder: "codex", reviewer: "codex" }), /différent/);
});
