import { join } from "node:path";
import { executeCodexTask } from "../agents/executor.js";
import { executeVibeTask } from "../agents/vibe-executor.js";
import type { AgentExecutionOptions, AgentExecutionPreview, AgentExecutionResult } from "../agents/types.js";
import { getTask } from "../core/task-store.js";
import { scanRepository } from "../core/repository-scanner.js";
import { createRunReceipt } from "../quality/receipt.js";
import { runRepositoryValidations } from "../runtime/validation.js";
import { assertIndependentProviders, normalizeIndependentReview } from "./review.js";
import type {
  AgentRunner,
  PipelineOptions,
  PipelinePreview,
  PipelineProvider,
  PipelineResult,
} from "./types.js";

export interface PipelineDependencies {
  codex: AgentRunner;
  vibe: AgentRunner;
  validate: typeof runRepositoryValidations;
  receipt: typeof createRunReceipt;
}

const defaults: PipelineDependencies = {
  codex: executeCodexTask,
  vibe: executeVibeTask,
  validate: runRepositoryValidations,
  receipt: createRunReceipt,
};

function isResult(value: AgentExecutionPreview | AgentExecutionResult): value is AgentExecutionResult {
  return "process" in value && Boolean(value.process);
}

function runner(provider: PipelineProvider, dependencies: PipelineDependencies): AgentRunner {
  return provider === "codex" ? dependencies.codex : dependencies.vibe;
}

function agentOptions(input: PipelineOptions, mode: "build" | "review", reviewer = false): AgentExecutionOptions {
  return {
    mode,
    model: reviewer ? input.reviewerModel : input.builderModel,
    timeoutMs: input.timeoutMs,
    maxContextBytes: input.maxContextBytes,
    maxTurns: input.maxTurns,
    maxTokens: input.maxTokens,
    maxPriceUsd: input.maxPriceUsd,
    dryRun: input.dryRun,
    allowWithoutGitleaks: input.allowWithoutGitleaks,
    allowWithoutBubblewrap: input.allowWithoutBubblewrap,
  };
}

async function failureReceipt(runId: string): Promise<string | undefined> {
  try {
    return (await createRunReceipt(runId)).path;
  } catch {
    return undefined;
  }
}

export async function runControlledPipeline(
  repositoryDirectory: string,
  taskId: string,
  options: PipelineOptions,
  dependencies: PipelineDependencies = defaults,
): Promise<PipelinePreview | PipelineResult> {
  assertIndependentProviders(options.builder, options.reviewer);
  const repository = await scanRepository(repositoryDirectory);
  const task = await getTask(repository.root, taskId);
  if (!task.worktreePath) {
    throw new Error(`La mission ${task.id} doit posséder un worktree avant le pipeline.`);
  }
  if (!task.allowedPaths.length) {
    throw new Error(`La mission ${task.id} doit déclarer au moins un --allow-path avant le pipeline.`);
  }

  const build = await runner(options.builder, dependencies)(
    repository.root,
    task.id,
    agentOptions(options, "build"),
  );
  if (options.dryRun) {
    const review = await runner(options.reviewer, dependencies)(
      repository.root,
      task.id,
      agentOptions(options, "review", true),
    );
    if (isResult(build) || isResult(review)) throw new Error("Un dry-run ne doit démarrer aucun processus.");
    return { taskId: task.id, builder: build, reviewer: review, independent: true };
  }
  if (!isResult(build)) throw new Error("Le builder n'a pas produit de résultat exécutable.");
  if (build.process.status !== "completed" || !build.changeGuard.passed) {
    const receiptPath = await failureReceipt(build.process.runId);
    throw new Error(`Builder refusé avant validation.${receiptPath ? ` Receipt : ${receiptPath}` : ""}`);
  }

  const validation = await dependencies.validate(task.worktreePath, {
    timeoutMs: options.timeoutMs,
    taskId: task.id,
  });
  if (!validation.passed) {
    const receiptPath = await dependencies.receipt(build.process.runId).then((item) => item.path).catch(() => undefined);
    throw new Error(`Validations en échec : reviewer non lancé.${receiptPath ? ` Receipt : ${receiptPath}` : ""}`);
  }

  const reviewExecution = await runner(options.reviewer, dependencies)(
    repository.root,
    task.id,
    agentOptions(options, "review", true),
  );
  if (!isResult(reviewExecution)) throw new Error("Le reviewer n'a pas produit de résultat exécutable.");
  if (reviewExecution.process.status !== "completed" || !reviewExecution.changeGuard.passed) {
    const receiptPath = await dependencies.receipt(build.process.runId).then((item) => item.path).catch(() => undefined);
    throw new Error(`Review indépendante invalide ou non strictement read-only.${receiptPath ? ` Receipt : ${receiptPath}` : ""}`);
  }

  const reviewPath = join(build.context.directory, "REVIEW.json");
  const review = await normalizeIndependentReview({
    taskId: task.id,
    builderProvider: options.builder,
    reviewerProvider: options.reviewer,
    builderRunId: build.process.runId,
    reviewerRunId: reviewExecution.process.runId,
    rawResponsePath: reviewExecution.lastMessagePath,
    outputPath: reviewPath,
  });
  const receipt = await dependencies.receipt(build.process.runId);
  return {
    taskId: task.id,
    builder: build,
    validation,
    reviewer: reviewExecution,
    review,
    reviewPath,
    receiptPath: receipt.path,
    receipt: receipt.receipt,
    passed: review.verdict === "approve" && review.structured,
  };
}
