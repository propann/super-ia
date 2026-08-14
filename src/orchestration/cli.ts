import { runControlledPipeline } from "./pipeline.js";
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

export async function handlePipelineCommand(
  command: string,
  args: string[],
  asJson: boolean,
  cwd: string,
): Promise<boolean> {
  if (command !== "pipeline") return false;
  const action = args.find((value) => !value.startsWith("--"));
  const positional = args.filter((value, index) => {
    if (value.startsWith("--")) return false;
    if (index > 0 && args[index - 1]?.startsWith("--")) return false;
    return true;
  });
  const taskId = positional[1];
  if (action !== "run" || !taskId) {
    throw new Error("Usage : superia pipeline run <TASK-ID> --builder codex|vibe --reviewer codex|vibe");
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
    maxPriceUsd: numberOption(args, "--max-price", 0.01, 5),
    dryRun: args.includes("--dry-run"),
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
  console.log(`Mission    ${result.taskId}`);
  console.log(`Builder    ${result.builder.provider} · ${result.builder.process.runId}`);
  console.log(`Validations ${result.validation.passed ? "réussies" : "échouées"}`);
  console.log(`Reviewer   ${result.reviewer.provider} · ${result.reviewer.process.runId}`);
  console.log(`Verdict    ${result.review.verdict}`);
  console.log(`Findings   ${result.review.findings.length}`);
  console.log(`Review     ${result.reviewPath}`);
  console.log(`Receipt    ${result.receiptPath}`);
  if (!result.passed) process.exitCode = 1;
  return true;
}
