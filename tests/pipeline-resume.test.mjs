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

async function setup(prefix) {
  const parent = await mkdtemp(join(tmpdir(), prefix));
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
  const task = await createTask(await scanRepository(root), "Modifier src/app.js");
  await createWorktree(task);
  await updateTask(root, task.id, { allowedPaths: ["src/**"] });
  return { parent, root, task: await getTask(root, task.id) };
}

function execution(provider, mode, cwd, contextId, runId, lastMessagePath) {
  const directory = join(cwd, ".superia", "contexts", contextId);
  return {
    provider,
    mode,
    command: "fake-agent",
    args: [],
    cwd,
    stdinBytes: 1,
    context: {
      directory,
      missionPath: join(directory, "MISSION.md"),
      contextPath: join(directory, "CONTEXT.md"),
      manifestPath: join(directory, "MANIFEST.json"),
      manifest: {
        schemaVersion: 1, id: contextId, repositoryRoot: cwd, repositoryName: "demo", baseCommit: "abc",
        dirty: false, taskId: "TASK-0001", createdAt: "2026-08-15T00:00:00Z", maxBytes: 1,
        includedBytes: 0, contextHash: `hash-${contextId}`, files: [], excluded: [], instructions: [],
      },
    },
    securityPreflight: { status: "passed", scanner: "gitleaks", findings: 0 },
    sandboxPreflight: { status: "active", engine: "bubblewrap", network: "isolated", workspaceAccess: mode === "build" ? "read-write" : "read-only", ephemeralHome: true },
    process: {
      runId, command: "fake-agent", args: [], cwd, exitCode: 0, signal: null, timedOut: false,
      durationMs: 1, stdoutPath: join(cwd, `${runId}.out`), stderrPath: join(cwd, `${runId}.err`),
      stdoutBytes: 0, stderrBytes: 0, truncated: false, status: "completed",
    },
    lastMessagePath,
    normalizedEventsPath: join(directory, "EVENTS.json"),
    parsedEvents: 1,
    invalidEventLines: 0,
    changeGuard: {
      schemaVersion: 1, passed: true, allowedPaths: mode === "build" ? ["src/**"] : [], changedFiles: [],
      outOfScopeFiles: [], diffPath: join(directory, "AGENT_CHANGES.patch"), reportPath: join(directory, "CHANGE_GUARD.json"),
    },
  };
}

function fakeReceipt(runId, root) {
  return {
    path: join(root, "RECEIPT.json"),
    receipt: {
      schemaVersion: 1, id: "RCP-TEST", createdAt: "2026-08-15T00:00:00Z",
      run: { id: runId, projectId: "P", provider: "codex-cli", mode: "build", status: "completed", startedAt: "2026-08-15T00:00:00Z" },
      project: { id: "P", name: "demo", root },
      git: { cwd: root, dirty: true, changedFiles: [], diffSha256: "hash" }, artifacts: [], validations: [],
      verdict: { agentCompleted: true, contextVerified: true, artifactsVerified: true, validationState: "passed", reviewState: "approve", humanApprovalRequired: true },
      receiptHash: "hash",
    },
  };
}

async function builder(task, calls) {
  calls.push("builder");
  const directory = join(task.worktreePath, ".superia", "contexts", "CTX-B");
  await mkdir(directory, { recursive: true });
  const message = join(directory, "builder.txt");
  await writeFile(message, "done", "utf8");
  return execution("codex-cli", "build", task.worktreePath, "CTX-B", "RUN-B", message);
}

async function reviewer(task, calls) {
  calls.push("reviewer");
  const directory = join(task.worktreePath, ".superia", "contexts", "CTX-R");
  await mkdir(directory, { recursive: true });
  const message = join(directory, "review.json");
  await writeFile(message, JSON.stringify({ verdict: "approve", findings: [], residualRisks: [] }), "utf8");
  return execution("mistral-vibe", "review", task.worktreePath, "CTX-R", "RUN-R", message);
}

test("pipeline resumes after a completed builder without rerunning it", async () => {
  const previous = process.env.SUPERIA_HOME;
  const env = await setup("superia-resume-builder-");
  const calls = [];
  try {
    await assert.rejects(runControlledPipeline(env.root, env.task.id, { builder: "codex", reviewer: "vibe" }, {
      codex: () => builder(env.task, calls),
      vibe: () => reviewer(env.task, calls),
      validate: async () => { calls.push("validate-crash"); throw new Error("simulated crash"); },
      receipt: async (id) => fakeReceipt(id, env.root),
    }), /simulated crash/);
    const failed = await loadPipelineCheckpoint(env.root, env.task.id);
    assert.equal(failed.stage, "builder-completed");
    assert.equal(failed.status, "failed");

    calls.length = 0;
    const result = await runControlledPipeline(env.root, env.task.id, { builder: "codex", reviewer: "vibe", resume: true }, {
      codex: async () => { throw new Error("builder must not rerun"); },
      vibe: () => reviewer(env.task, calls),
      validate: async () => { calls.push("validate"); return { projectId: "P", repositoryRoot: env.task.worktreePath, passed: true, checks: [] }; },
      receipt: async (id) => { calls.push("receipt"); return fakeReceipt(id, env.root); },
    });
    assert.equal(result.passed, true);
    assert.deepEqual(calls, ["validate", "reviewer", "receipt"]);
  } finally {
    process.env.SUPERIA_HOME = previous;
    await rm(env.parent, { recursive: true, force: true });
  }
});

test("pipeline resumes after review and only recreates the receipt", async () => {
  const previous = process.env.SUPERIA_HOME;
  const env = await setup("superia-resume-review-");
  const calls = [];
  try {
    await assert.rejects(runControlledPipeline(env.root, env.task.id, { builder: "codex", reviewer: "vibe" }, {
      codex: () => builder(env.task, calls),
      vibe: () => reviewer(env.task, calls),
      validate: async () => ({ projectId: "P", repositoryRoot: env.task.worktreePath, passed: true, checks: [] }),
      receipt: async () => { throw new Error("receipt crash"); },
    }), /receipt crash/);
    const failed = await loadPipelineCheckpoint(env.root, env.task.id);
    assert.equal(failed.stage, "review-completed");

    calls.length = 0;
    const result = await runControlledPipeline(env.root, env.task.id, { builder: "codex", reviewer: "vibe", resume: true }, {
      codex: async () => { throw new Error("builder must not rerun"); },
      vibe: async () => { throw new Error("reviewer must not rerun"); },
      validate: async () => { throw new Error("validation must not rerun"); },
      receipt: async (id) => { calls.push("receipt"); return fakeReceipt(id, env.root); },
    });
    assert.equal(result.passed, true);
    assert.deepEqual(calls, ["receipt"]);
  } finally {
    process.env.SUPERIA_HOME = previous;
    await rm(env.parent, { recursive: true, force: true });
  }
});
