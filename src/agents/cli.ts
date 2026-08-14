import { executeCodexTask } from "./executor.js";
import { executeVibeTask } from "./vibe-executor.js";
import type { AgentExecutionOptions, AgentMode } from "./types.js";

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function positionals(args: string[]): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value.startsWith("--")) {
      if (!["--dry-run", "--json"].includes(value)) index += 1;
      continue;
    }
    values.push(value);
  }
  return values;
}

function numberOption(args: string[], flag: string, minimum: number, maximum: number): number | undefined {
  const raw = flagValue(args, flag);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${flag} doit être compris entre ${minimum} et ${maximum}.`);
  }
  return value;
}

export async function handleAgentCommand(
  command: string,
  args: string[],
  asJson: boolean,
  cwd: string,
): Promise<boolean> {
  if (command !== "agent") return false;
  const [action, provider, taskId] = positionals(args);
  if (action !== "run" || !["codex", "vibe"].includes(provider ?? "") || !taskId) {
    throw new Error("Usage : superia agent run codex|vibe <TASK-ID> [--mode plan|build|review] [--dry-run]");
  }
  const mode = (flagValue(args, "--mode") ?? "plan") as AgentMode;
  if (!(["plan", "build", "review"] as string[]).includes(mode)) {
    throw new Error("--mode doit être plan, build ou review.");
  }
  const timeoutMinutes = numberOption(args, "--timeout-minutes", 0.1, 240) ?? 60;
  const maxContextBytes = numberOption(args, "--max-context-bytes", 1, 2_000_000);
  const options: AgentExecutionOptions = {
    mode,
    model: flagValue(args, "--model"),
    timeoutMs: timeoutMinutes * 60_000,
    maxContextBytes,
    dryRun: args.includes("--dry-run"),
  };
  if (provider === "vibe") {
    options.maxTurns = numberOption(args, "--max-turns", 1, 50);
    options.maxTokens = numberOption(args, "--max-tokens", 1, 500_000);
    options.maxPriceUsd = numberOption(args, "--max-price", 0.01, 5);
  }

  const result = provider === "codex"
    ? await executeCodexTask(cwd, taskId, options)
    : await executeVibeTask(cwd, taskId, options);

  if (asJson) console.log(JSON.stringify(result, null, 2));
  else if (!("process" in result)) {
    console.log(`PRÉVISUALISATION ${result.provider.toUpperCase()}`);
    console.log(`Mode       ${result.mode}`);
    console.log(`Dossier    ${result.cwd}`);
    console.log(`Commande   ${result.command} ${result.args.join(" ")}`);
    console.log(`Contexte   ${result.context.manifest.id}`);
    console.log(`Prompt     ${result.stdinBytes} octets transmis par stdin`);
  } else {
    console.log(result.process.status === "completed" ? "AGENT TERMINÉ" : "AGENT EN ÉCHEC");
    console.log(`Provider   ${result.provider}`);
    console.log(`Run        ${result.process.runId}`);
    console.log(`Contexte   ${result.context.manifest.id}`);
    console.log(`Événements ${result.parsedEvents}`);
    console.log(`Réponse    ${result.lastMessagePath}`);
    console.log(`Logs       ${result.process.stdoutPath}`);
    if (result.process.status !== "completed") process.exitCode = 1;
  }
  return true;
}
