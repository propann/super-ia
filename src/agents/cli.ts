import { executeCodexTask } from "./executor.js";
import type { AgentMode } from "./types.js";

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

export async function handleAgentCommand(
  command: string,
  args: string[],
  asJson: boolean,
  cwd: string,
): Promise<boolean> {
  if (command !== "agent") return false;
  const [action, provider, taskId] = positionals(args);
  if (action !== "run" || provider !== "codex" || !taskId) {
    throw new Error("Usage : superia agent run codex <TASK-ID> [--mode plan|build|review] [--dry-run]");
  }
  const mode = (flagValue(args, "--mode") ?? "plan") as AgentMode;
  if (!(["plan", "build", "review"] as string[]).includes(mode)) {
    throw new Error("--mode doit être plan, build ou review.");
  }
  const timeoutRaw = flagValue(args, "--timeout-minutes");
  const timeoutMinutes = timeoutRaw ? Number(timeoutRaw) : 60;
  if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0 || timeoutMinutes > 240) {
    throw new Error("--timeout-minutes doit être compris entre 0 et 240.");
  }
  const contextBytesRaw = flagValue(args, "--max-context-bytes");
  const maxContextBytes = contextBytesRaw ? Number(contextBytesRaw) : undefined;
  if (contextBytesRaw && (!Number.isFinite(maxContextBytes) || Number(maxContextBytes) <= 0)) {
    throw new Error("--max-context-bytes doit être positif.");
  }

  const result = await executeCodexTask(cwd, taskId, {
    mode,
    model: flagValue(args, "--model"),
    timeoutMs: timeoutMinutes * 60_000,
    maxContextBytes,
    dryRun: args.includes("--dry-run"),
  });

  if (asJson) console.log(JSON.stringify(result, null, 2));
  else if (!("process" in result)) {
    console.log("PRÉVISUALISATION CODEX");
    console.log(`Mode       ${result.mode}`);
    console.log(`Dossier    ${result.cwd}`);
    console.log(`Commande   ${result.command} ${result.args.join(" ")}`);
    console.log(`Contexte   ${result.context.manifest.id}`);
    console.log(`Prompt     ${result.stdinBytes} octets transmis par stdin`);
  } else {
    console.log(result.process.status === "completed" ? "AGENT TERMINÉ" : "AGENT EN ÉCHEC");
    console.log(`Run        ${result.process.runId}`);
    console.log(`Contexte   ${result.context.manifest.id}`);
    console.log(`Événements ${result.parsedEvents}`);
    console.log(`Réponse    ${result.lastMessagePath}`);
    console.log(`Logs       ${result.process.stdoutPath}`);
    if (result.process.status !== "completed") process.exitCode = 1;
  }
  return true;
}
