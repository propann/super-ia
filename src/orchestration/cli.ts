import { scanRepository } from "../core/repository-scanner.js";
import { runControlledPipeline } from "./pipeline.js";
import { loadPipelineCheckpoint, pipelineStatePath } from "./state.js";
import type { PipelineOptions, PipelineProvider, PipelineResult } from "./types.js";

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
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

function provider(value: string | undefined, flag: string): PipelineProvider {
  if (value !== "codex" && value !== "vibe") throw new Error(`${flag} doit être codex ou vibe.`);
  return value;
}

function isResult(value: Awaited<ReturnType<typeof runControlledPipeline>>): value is PipelineResult {
  return "receipt" in value;
}

function positionals(args: string[]): string[] {
  const valueFlags = new Set([
    "--builder", "--reviewer", "--builder-model", "--reviewer-model", "--timeout-minutes",
    "--max-context-bytes", "--max-turns", "--max-tokens", "--max-price", "--max-attempts",
    "--max-total-price",
  ]);
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index].startsWith("--")) {
      if (valueFlags.has(args[index])) index += 1;
      continue;
    }
    values.push(args[index]);
  }
  return values;
}

export async function handlePipelineCommand(
  command: string,
  args: string[],
  asJson: boolean,
  cwd: string,
): Promise<boolean> {
  if (command !== "pipeline") return false;
  const [action, taskId] = positionals(args);
  if (action === "status" && taskId) {
    const repository = await scanRepository(cwd);
    const checkpoint = await loadPipelineCheckpoint(repository.root, taskId);
    if (!checkpoint) throw new Error(`Aucun checkpoint disponible pour ${taskId}.`);
    if (asJson) console.log(JSON.stringify(checkpoint, null, 2));
    else {
      console.log(`PIPELINE ${checkpoint.taskId}`);
      console.log(`État       ${checkpoint.status}`);
      console.log(`Étape      ${checkpoint.stage}`);
      console.log(`Arrêt      ${checkpoint.stopReason ?? "-"}`);
      console.log(`Tentatives ${(checkpoint.attempts?.length ?? 0)}/${checkpoint.maxAttempts ?? "-"}`);
      console.log(`Prix réservé ${(checkpoint.reservedPriceCeilingUsd ?? 0).toFixed(2)}/${checkpoint.maxTotalPriceUsd?.toFixed(2) ?? "-"} USD`);
      console.log(`Builder    ${checkpoint.builderProvider}${checkpoint.builder ? ` · ${checkpoint.builder.process.runId}` : ""}`);
      console.log(`Reviewer   ${checkpoint.reviewerProvider}${checkpoint.reviewer ? ` · ${checkpoint.reviewer.process.runId}` : ""}`);
      console.log(`Mis à jour ${checkpoint.updatedAt}`);
      console.log(`Fichier    ${pipelineStatePath(repository.root, taskId)}`);
      if (checkpoint.error) console.log(`Erreur     ${checkpoint.error}`);
    }
    return true;
  }
  if (action !== "run" || !taskId) {
    throw new Error("Usage : superia pipeline run <TASK-ID> --builder codex|vibe --reviewer codex|vibe [--resume|--retry]");
  }

  const dryRun = args.includes("--dry-run");
  const maxPriceUsd = numberOption(args, "--max-price", 0.01, 5);
  const maxTotalPriceUsd = numberOption(args, "--max-total-price", 0.01, 50);
  if (!dryRun && maxPriceUsd === undefined) {
    throw new Error("Un pipeline réel utilisant Vibe exige un plafond explicite --max-price.");
  }
  if (!dryRun && maxTotalPriceUsd === undefined) {
    throw new Error("Un pipeline réel exige un plafond cumulé explicite --max-total-price.");
  }

  const options: PipelineOptions = {
    builder: provider(flagValue(args, "--builder"), "--builder"),
    reviewer: provider(flagValue(args, "--reviewer"), "--reviewer"),
    builderModel: flagValue(args, "--builder-model"),
    reviewerModel: flagValue(args, "--reviewer-model"),
    timeoutMs: (numberOption(args, "--timeout-minutes", 0.1, 240) ?? 60) * 60_000,
    maxContextBytes: numberOption(args, "--max-context-bytes", 1, 2_000_000),
    maxTurns: numberOption(args, "--max-turns", 1, 50),
    maxTokens: numberOption(args, "--max-tokens", 1, 500_000),
    maxPriceUsd,
    maxAttempts: numberOption(args, "--max-attempts", 1, 10),
    maxTotalPriceUsd,
    dryRun,
    resume: args.includes("--resume"),
    retry: args.includes("--retry"),
    allowWithoutGitleaks: args.includes("--allow-without-gitleaks"),
    allowWithoutBubblewrap: args.includes("--allow-without-bwrap"),
  };
  const result = await runControlledPipeline(cwd, taskId, options);
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return true;
  }
  if (!isResult(result)) {
    console.log("PIPELINE — PRÉVISUALISATION");
    console.log(`Mission    ${result.taskId}`);
    console.log(`Builder    ${result.builder.provider}`);
    console.log(`Reviewer   ${result.reviewer.provider}`);
    console.log("Indépendant oui");
    return true;
  }
  console.log(result.passed ? "PIPELINE VALIDÉ" : "PIPELINE À CORRIGER");
  console.log(`Mission     ${result.taskId}`);
  console.log(`Builder     ${result.builder.provider} · ${result.builder.process.runId}`);
  console.log(`Validations ${result.validation.passed ? "réussies" : "échouées"}`);
  console.log(`Reviewer    ${result.reviewer.provider} · ${result.reviewer.process.runId}`);
  console.log(`Verdict     ${result.review.verdict}`);
  console.log(`Findings    ${result.review.findings.length}`);
  console.log(`Review      ${result.reviewPath}`);
  console.log(`Receipt     ${result.receiptPath}`);
  if (!result.passed) process.exitCode = 1;
  return true;
}
