import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getTask } from "../core/task-store.js";
import { scanRepository } from "../core/repository-scanner.js";
import { openControlPlane } from "../control/control-plane.js";
import { openLeaseManager } from "../control/lease-manager.js";
import { syncRepositoryToGlobalControl } from "../control/repository-sync.js";
import { buildGitContext } from "../context/builder.js";
import { runManagedProcess } from "../runtime/process-runner.js";
import { findExecutable } from "../utils/command.js";
import { prepareAgentSandbox } from "./sandbox-preflight.js";
import type { AgentExecutionOptions, AgentExecutionPreview, AgentExecutionResult, AgentMode } from "./types.js";
import { assertSafeVibeInvocation, buildVibeInvocation } from "./vibe-adapter.js";
import { runAgentSecurityPreflight } from "./security-preflight.js";

function parseJsonLines(content: string): { events: unknown[]; invalid: number } {
  const events: unknown[] = [];
  let invalid = 0;
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      invalid += 1;
    }
  }
  return { events, invalid };
}

function positiveInteger(value: number | undefined, fallback: number, maximum: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved <= 0 || resolved > maximum) {
    throw new Error(`${label} doit être compris entre 1 et ${maximum}.`);
  }
  return resolved;
}

function resolveMode(value?: AgentMode): AgentMode {
  return value ?? "plan";
}

export async function executeVibeTask(
  repositoryDirectory: string,
  taskId: string,
  options: AgentExecutionOptions = {},
): Promise<AgentExecutionPreview | AgentExecutionResult> {
  const repository = await scanRepository(repositoryDirectory);
  const task = await getTask(repository.root, taskId);
  const mode = resolveMode(options.mode);
  if (mode === "build" && !task.worktreePath) {
    throw new Error(`La mission ${task.id} doit posséder un worktree avant le mode build.`);
  }
  const maxPriceUsd = options.maxPriceUsd ?? 0.25;
  if (!Number.isFinite(maxPriceUsd) || maxPriceUsd <= 0 || maxPriceUsd > 5) {
    throw new Error("Le budget Vibe doit être supérieur à 0 et inférieur ou égal à 5 USD.");
  }
  const budget = {
    maxTurns: positiveInteger(options.maxTurns, 8, 50, "maxTurns"),
    maxTokens: positiveInteger(options.maxTokens, 50_000, 500_000, "maxTokens"),
    maxPriceUsd,
  };
  const cwd = task.worktreePath ?? repository.root;
  const synchronized = await syncRepositoryToGlobalControl(repository.root);
  const context = await buildGitContext(cwd, {
    taskId: task.id,
    goal: task.goal,
    query: task.title,
    maxBytes: options.maxContextBytes,
  }, task);
  const vibe = await findExecutable("vibe");
  if (!vibe && !options.dryRun) {
    throw new Error("Mistral Vibe est absent du PATH. Exécuter `superia doctor` après son installation.");
  }
  const invocation = await buildVibeInvocation({
    command: vibe ?? "vibe",
    task,
    context,
    cwd,
    mode,
    model: options.model,
    budget,
  });
  assertSafeVibeInvocation(invocation);
  const securityPreflight = await runAgentSecurityPreflight({
    cwd,
    projectId: synchronized.project.id,
    taskId: task.id,
    provider: invocation.provider,
    dryRun: options.dryRun,
    allowWithoutGitleaks: options.allowWithoutGitleaks,
  });
  const sandbox = await prepareAgentSandbox({
    projectId: synchronized.project.id,
    taskId: task.id,
    provider: invocation.provider,
    mode,
    dryRun: options.dryRun,
    allowWithoutBubblewrap: options.allowWithoutBubblewrap,
  });
  invocation.metadata.securityPreflight = securityPreflight;
  invocation.metadata.sandboxPreflight = sandbox.preflight;
  const preview: AgentExecutionPreview = {
    provider: invocation.provider,
    mode,
    command: invocation.command,
    args: invocation.args,
    cwd,
    stdinBytes: Buffer.byteLength(invocation.stdin, "utf8"),
    context,
    securityPreflight,
    sandboxPreflight: sandbox.preflight,
  };
  if (options.dryRun) return preview;

  const lease = await openLeaseManager();
  const holder = `superia:${process.pid}:${randomUUID()}`;
  const resourceKey = `agent:${synchronized.project.id}:${task.id}`;
  const timeoutMs = options.timeoutMs ?? 60 * 60_000;
  if (!lease.acquire(resourceKey, holder, timeoutMs + 5 * 60_000)) {
    lease.close();
    throw new Error(`Une autre exécution possède déjà la mission ${task.id}.`);
  }

  const control = await openControlPlane();
  try {
    const processResult = await runManagedProcess({
      projectId: synchronized.project.id,
      taskId: task.id,
      provider: invocation.provider,
      command: invocation.command,
      args: invocation.args,
      cwd: invocation.cwd,
      stdin: invocation.stdin,
      timeoutMs,
      metadata: invocation.metadata,
      env: {
        ...sandbox.env,
        ...(options.model ? { VIBE_ACTIVE_MODEL: options.model } : {}),
      },
      allowedEnvKeys: ["MISTRAL_API_KEY", "VIBE_HOME", "VIBE_ACTIVE_MODEL", ...sandbox.allowedEnvKeys],
      sandbox: sandbox.sandbox,
    }, control);
    const stdout = await readFile(processResult.stdoutPath, "utf8");
    const parsed = parseJsonLines(stdout);
    const normalizedEventsPath = join(context.directory, "VIBE_EVENTS.json");
    const lastMessagePath = invocation.lastMessagePath;
    await Promise.all([
      writeFile(normalizedEventsPath, `${JSON.stringify(parsed.events, null, 2)}\n`, "utf8"),
      writeFile(lastMessagePath, `${JSON.stringify(parsed.events.at(-1) ?? {}, null, 2)}\n`, "utf8"),
    ]);
    const result: AgentExecutionResult = {
      ...preview,
      process: processResult,
      lastMessagePath,
      normalizedEventsPath,
      parsedEvents: parsed.events.length,
      invalidEventLines: parsed.invalid,
    };
    await writeFile(join(context.directory, "AGENT_RESULT.json"), `${JSON.stringify({
      provider: result.provider,
      mode: result.mode,
      taskId: task.id,
      runId: result.process.runId,
      status: result.process.status,
      contextId: context.manifest.id,
      contextHash: context.manifest.contextHash,
      baseCommit: context.manifest.baseCommit,
      securityPreflight,
      sandboxPreflight: sandbox.preflight,
      sandboxExecution: processResult.sandbox ?? null,
      parsedEvents: result.parsedEvents,
      invalidEventLines: result.invalidEventLines,
      budget,
      model: options.model ?? null,
      lastMessagePath: result.lastMessagePath,
      normalizedEventsPath: result.normalizedEventsPath,
    }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    control.close();
    lease.release(resourceKey, holder);
    lease.close();
  }
}
