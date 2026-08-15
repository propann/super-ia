import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getTask } from "../core/task-store.js";
import { scanRepository } from "../core/repository-scanner.js";
import { openControlPlane } from "../control/control-plane.js";
import { openLeaseManager } from "../control/lease-manager.js";
import { syncRepositoryToGlobalControl } from "../control/repository-sync.js";
import { buildGitContext } from "../context/builder.js";
import { captureGitWorkspace, enforceGitChangeScope, type ChangeGuardReport } from "../quality/change-guard.js";
import { runManagedProcess } from "../runtime/process-runner.js";
import { assertExecutionAllowed } from "../safety/store.js";
import { findExecutable } from "../utils/command.js";
import { assertSafeCodexInvocation, buildCodexInvocation } from "./codex-adapter.js";
import { prepareAgentSandbox } from "./sandbox-preflight.js";
import { runAgentSecurityPreflight } from "./security-preflight.js";
import type { AgentExecutionOptions, AgentExecutionPreview, AgentExecutionResult, AgentMode } from "./types.js";

function parseJsonLines(content: string): { events: unknown[]; invalid: number } {
  const events: unknown[] = [];
  let invalid = 0;
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { invalid += 1; }
  }
  return { events, invalid };
}

function resolveMode(value?: AgentMode): AgentMode { return value ?? "plan"; }

export async function executeCodexTask(repositoryDirectory: string, taskId: string, options: AgentExecutionOptions = {}): Promise<AgentExecutionPreview | AgentExecutionResult> {
  if (!options.dryRun) await assertExecutionAllowed();
  const repository = await scanRepository(repositoryDirectory);
  const task = await getTask(repository.root, taskId);
  const mode = resolveMode(options.mode);
  if (mode === "build" && !task.worktreePath) throw new Error(`La mission ${task.id} doit posséder un worktree avant le mode build.`);
  if (mode === "build" && !task.allowedPaths.length) throw new Error(`La mission ${task.id} doit déclarer au moins un --allow-path avant le mode build.`);
  const cwd = task.worktreePath ?? repository.root;
  const synchronized = await syncRepositoryToGlobalControl(repository.root);
  const context = await buildGitContext(cwd, { taskId: task.id, goal: task.goal, query: task.title, maxBytes: options.maxContextBytes }, task);
  const codex = await findExecutable("codex");
  if (!codex && !options.dryRun) throw new Error("Codex CLI est absent du PATH. Exécuter `superia doctor` après son installation.");
  const invocation = await buildCodexInvocation({
    command: codex ?? "codex",
    task,
    context,
    cwd,
    mode,
    model: options.model,
    feedbackPath: options.feedbackPath,
  });
  assertSafeCodexInvocation(invocation);
  if (!options.dryRun) await writeFile(invocation.lastMessagePath, "", "utf8");
  const securityPreflight = await runAgentSecurityPreflight({ cwd, projectId: synchronized.project.id, taskId: task.id, provider: invocation.provider, dryRun: options.dryRun, allowWithoutGitleaks: options.allowWithoutGitleaks });
  const sandbox = await prepareAgentSandbox({ projectId: synchronized.project.id, taskId: task.id, provider: invocation.provider, mode, workspaceRoot: cwd, writablePaths: options.dryRun ? undefined : [invocation.lastMessagePath], dryRun: options.dryRun, allowWithoutBubblewrap: options.allowWithoutBubblewrap });
  invocation.metadata.securityPreflight = securityPreflight;
  invocation.metadata.sandboxPreflight = sandbox.preflight;
  invocation.metadata.allowedPaths = mode === "build" ? task.allowedPaths : [];
  const preview: AgentExecutionPreview = { provider: invocation.provider, mode, command: invocation.command, args: invocation.args, cwd, stdinBytes: Buffer.byteLength(invocation.stdin, "utf8"), context, securityPreflight, sandboxPreflight: sandbox.preflight };
  if (options.dryRun) return preview;

  const before = await captureGitWorkspace(cwd);
  const lease = await openLeaseManager();
  const holder = `superia:${process.pid}:${randomUUID()}`;
  const resourceKey = `agent:${synchronized.project.id}:${task.id}`;
  const timeoutMs = options.timeoutMs ?? 60 * 60_000;
  if (!lease.acquire(resourceKey, holder, timeoutMs + 5 * 60_000)) { lease.close(); throw new Error(`Une autre exécution possède déjà la mission ${task.id}.`); }

  const control = await openControlPlane();
  try {
    const processResult = await runManagedProcess({ projectId: synchronized.project.id, taskId: task.id, provider: invocation.provider, command: invocation.command, args: invocation.args, cwd: invocation.cwd, stdin: invocation.stdin, timeoutMs, metadata: invocation.metadata, env: sandbox.env, allowedEnvKeys: ["CODEX_HOME", ...sandbox.allowedEnvKeys], sandbox: sandbox.sandbox }, control);
    let changeGuard: ChangeGuardReport;
    try {
      changeGuard = await enforceGitChangeScope({ before, afterRoot: cwd, allowedPaths: mode === "build" ? task.allowedPaths : [], artifactDirectory: context.directory });
    } catch (error) {
      control.finishRun(processResult.runId, "failed", { changeGuardError: error instanceof Error ? error.message : String(error) });
      throw error;
    }
    const finalProcess = changeGuard.passed ? processResult : { ...processResult, status: "failed" as const };
    if (!changeGuard.passed) control.finishRun(processResult.runId, "failed", { changeGuard });
    const stdout = await readFile(processResult.stdoutPath, "utf8");
    const parsed = parseJsonLines(stdout);
    const normalizedEventsPath = join(context.directory, "CODEX_EVENTS.json");
    const resultPath = join(context.directory, "AGENT_RESULT.json");
    await writeFile(normalizedEventsPath, `${JSON.stringify(parsed.events, null, 2)}\n`, "utf8");
    const result: AgentExecutionResult = { ...preview, process: finalProcess, lastMessagePath: invocation.lastMessagePath, normalizedEventsPath, parsedEvents: parsed.events.length, invalidEventLines: parsed.invalid, changeGuard };
    await writeFile(resultPath, `${JSON.stringify({ provider: result.provider, mode: result.mode, taskId: task.id, runId: result.process.runId, status: result.process.status, contextId: context.manifest.id, contextHash: context.manifest.contextHash, baseCommit: context.manifest.baseCommit, feedbackPath: options.feedbackPath ?? null, securityPreflight, sandboxPreflight: sandbox.preflight, sandboxExecution: processResult.sandbox ?? null, changeGuard, parsedEvents: result.parsedEvents, invalidEventLines: result.invalidEventLines, lastMessagePath: result.lastMessagePath, normalizedEventsPath: result.normalizedEventsPath }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    control.close();
    lease.release(resourceKey, holder);
    lease.close();
  }
}
