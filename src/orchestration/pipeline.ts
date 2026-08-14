import { join } from "node:path";
import { executeCodexTask } from "../agents/executor.js";
import { executeVibeTask } from "../agents/vibe-executor.js";
import type { AgentExecutionOptions, AgentExecutionPreview, AgentExecutionResult } from "../agents/types.js";
import { getTask, updateTask } from "../core/task-store.js";
import { scanRepository } from "../core/repository-scanner.js";
import { createRunReceipt } from "../quality/receipt.js";
import { runRepositoryValidations } from "../runtime/validation.js";
import { assertIndependentProviders, normalizeIndependentReview } from "./review.js";
import {
  appendAttempt,
  checkpointBudget,
  detectRepeatedPatch,
  fileSha256,
  prepareRetry,
  retryBudget,
} from "./retry-policy.js";
import { loadPipelineCheckpoint, savePipelineCheckpoint } from "./state.js";
import type {
  AgentRunner,
  PipelineCheckpoint,
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

function agentOptions(
  input: PipelineOptions,
  mode: "build" | "review",
  reviewer = false,
  feedbackPath?: string,
): AgentExecutionOptions {
  return {
    mode,
    model: reviewer ? input.reviewerModel : input.builderModel,
    timeoutMs: input.timeoutMs,
    maxContextBytes: input.maxContextBytes,
    maxTurns: input.maxTurns,
    maxTokens: input.maxTokens,
    maxPriceUsd: input.maxPriceUsd,
    feedbackPath: reviewer ? undefined : feedbackPath,
    dryRun: input.dryRun,
    allowWithoutGitleaks: input.allowWithoutGitleaks,
    allowWithoutBubblewrap: input.allowWithoutBubblewrap,
  };
}

function now(): string {
  return new Date().toISOString();
}

function assertCheckpointMatches(checkpoint: PipelineCheckpoint, options: PipelineOptions, worktreePath: string): void {
  if (checkpoint.builderProvider !== options.builder || checkpoint.reviewerProvider !== options.reviewer) {
    throw new Error("Les fournisseurs du checkpoint ne correspondent pas à la demande.");
  }
  if (checkpoint.worktreePath !== worktreePath) {
    throw new Error("Le worktree du checkpoint ne correspond plus à la mission.");
  }
}

function completedResult(checkpoint: PipelineCheckpoint): PipelineResult | undefined {
  if (
    checkpoint.status === "completed" &&
    checkpoint.builder &&
    checkpoint.validation &&
    checkpoint.reviewer &&
    checkpoint.review &&
    checkpoint.reviewPath &&
    checkpoint.receiptPath &&
    checkpoint.receipt
  ) {
    return {
      taskId: checkpoint.taskId,
      builder: checkpoint.builder,
      validation: checkpoint.validation,
      reviewer: checkpoint.reviewer,
      review: checkpoint.review,
      reviewPath: checkpoint.reviewPath,
      receiptPath: checkpoint.receiptPath,
      receipt: checkpoint.receipt,
      passed: checkpoint.review.structured && checkpoint.review.verdict === "approve",
    };
  }
  return undefined;
}

function clearCurrentAttempt(checkpoint: PipelineCheckpoint, feedbackPath: string): void {
  checkpoint.status = "running";
  checkpoint.stage = "initialized";
  checkpoint.feedbackPath = feedbackPath;
  checkpoint.stopReason = undefined;
  checkpoint.builder = undefined;
  checkpoint.validation = undefined;
  checkpoint.reviewer = undefined;
  checkpoint.review = undefined;
  checkpoint.reviewPath = undefined;
  checkpoint.receiptPath = undefined;
  checkpoint.receipt = undefined;
  checkpoint.error = undefined;
  checkpoint.updatedAt = now();
}

async function recordLegacyCompletedAttempt(checkpoint: PipelineCheckpoint, options: PipelineOptions): Promise<void> {
  if ((checkpoint.attempts?.length ?? 0) > 0 || !checkpoint.builder || !checkpoint.review) return;
  const budget = checkpointBudget(checkpoint, options);
  appendAttempt(checkpoint, {
    number: 1,
    builderRunId: checkpoint.builder.process.runId,
    reviewerRunId: checkpoint.reviewer?.process.runId,
    patchSha256: await fileSha256(checkpoint.builder.changeGuard.diffPath),
    verdict: checkpoint.review.verdict,
    reviewPath: checkpoint.reviewPath,
    reservedPriceCeilingUsd: budget.reservedPerAttemptUsd,
    completedAt: checkpoint.updatedAt,
  });
}

export async function runControlledPipeline(
  repositoryDirectory: string,
  taskId: string,
  options: PipelineOptions,
  dependencies: PipelineDependencies = defaults,
): Promise<PipelinePreview | PipelineResult> {
  assertIndependentProviders(options.builder, options.reviewer);
  if (options.resume && options.retry) throw new Error("--resume et --retry sont incompatibles.");
  const repository = await scanRepository(repositoryDirectory);
  const task = await getTask(repository.root, taskId);
  if (!task.worktreePath) throw new Error(`La mission ${task.id} doit posséder un worktree avant le pipeline.`);
  if (!task.allowedPaths.length) throw new Error(`La mission ${task.id} doit déclarer au moins un --allow-path avant le pipeline.`);

  const existing = await loadPipelineCheckpoint(repository.root, task.id);
  let feedbackPath: string | undefined;
  if (options.retry) {
    if (!existing) throw new Error(`Aucun pipeline précédent disponible pour corriger ${task.id}.`);
    assertCheckpointMatches(existing, options, task.worktreePath);
    await recordLegacyCompletedAttempt(existing, options);
    const retry = prepareRetry(existing, options);
    feedbackPath = retry.feedbackPath;
  }

  if (options.dryRun) {
    const build = await runner(options.builder, dependencies)(repository.root, task.id, agentOptions(options, "build", false, feedbackPath));
    const review = await runner(options.reviewer, dependencies)(repository.root, task.id, agentOptions(options, "review", true));
    if (isResult(build) || isResult(review)) throw new Error("Un dry-run ne doit démarrer aucun processus.");
    return { taskId: task.id, builder: build, reviewer: review, independent: true };
  }

  let checkpoint: PipelineCheckpoint;
  if (options.retry) {
    checkpoint = existing as PipelineCheckpoint;
    const retry = prepareRetry(checkpoint, options);
    clearCurrentAttempt(checkpoint, retry.feedbackPath);
    await savePipelineCheckpoint(checkpoint);
  } else if (options.resume) {
    if (!existing) throw new Error(`Aucun checkpoint disponible pour ${task.id}.`);
    checkpoint = existing;
    assertCheckpointMatches(checkpoint, options, task.worktreePath);
    const completed = completedResult(checkpoint);
    if (completed) return completed;
    if (!checkpoint.builder) {
      throw new Error("Reprise refusée : aucun checkpoint builder complet. Inspecter ou réinitialiser le worktree manuellement.");
    }
  } else {
    if (existing) {
      throw new Error(`Un état de pipeline existe déjà pour ${task.id}. Utiliser --resume ou --retry.`);
    }
    const timestamp = now();
    const budget = retryBudget(options);
    if (budget.reservedPerAttemptUsd > budget.maxTotalPriceUsd) {
      throw new Error("Le plafond total est inférieur au prix réservé d'une tentative.");
    }
    checkpoint = {
      schemaVersion: 1,
      taskId: task.id,
      repositoryRoot: repository.root,
      worktreePath: task.worktreePath,
      builderProvider: options.builder,
      reviewerProvider: options.reviewer,
      status: "running",
      stage: "initialized",
      startedAt: timestamp,
      updatedAt: timestamp,
      maxAttempts: budget.maxAttempts,
      maxTotalPriceUsd: budget.maxTotalPriceUsd,
      reservedPerAttemptUsd: budget.reservedPerAttemptUsd,
      reservedPriceCeilingUsd: 0,
      attempts: [],
    };
    await savePipelineCheckpoint(checkpoint);
  }

  await updateTask(repository.root, task.id, { status: "running" });
  try {
    const budget = checkpointBudget(checkpoint, options);
    let build = checkpoint.builder;
    if (!build) {
      const execution = await runner(options.builder, dependencies)(
        repository.root,
        task.id,
        agentOptions(options, "build", false, checkpoint.feedbackPath),
      );
      if (!isResult(execution)) throw new Error("Le builder n'a pas produit de résultat exécutable.");
      build = execution;
      checkpoint.builder = build;
      checkpoint.stage = "builder-completed";
      checkpoint.updatedAt = now();
      await savePipelineCheckpoint(checkpoint);
    }
    if (build.process.status !== "completed" || !build.changeGuard.passed) {
      const receiptPath = await dependencies.receipt(build.process.runId).then((item) => item.path).catch(() => undefined);
      throw new Error(`Builder refusé avant validation.${receiptPath ? ` Receipt : ${receiptPath}` : ""}`);
    }

    const patchSha256 = await fileSha256(build.changeGuard.diffPath);
    const repeated = detectRepeatedPatch(checkpoint.attempts ?? [], patchSha256);
    if (repeated) {
      appendAttempt(checkpoint, {
        number: (checkpoint.attempts?.length ?? 0) + 1,
        builderRunId: build.process.runId,
        patchSha256,
        reservedPriceCeilingUsd: budget.reservedPerAttemptUsd,
        completedAt: now(),
      });
      checkpoint.status = "completed";
      checkpoint.stopReason = "loop-detected";
      checkpoint.error = `Patch identique à la tentative ${repeated.number}.`;
      checkpoint.updatedAt = now();
      await savePipelineCheckpoint(checkpoint);
      await updateTask(repository.root, task.id, { status: "blocked" });
      await dependencies.receipt(build.process.runId).catch(() => undefined);
      throw new Error(`Boucle détectée : le patch est identique à la tentative ${repeated.number}.`);
    }

    let validation = checkpoint.validation;
    if (!validation?.passed) {
      validation = await dependencies.validate(task.worktreePath, { timeoutMs: options.timeoutMs, taskId: task.id });
      checkpoint.validation = validation;
      checkpoint.stage = "validation-completed";
      checkpoint.updatedAt = now();
      await savePipelineCheckpoint(checkpoint);
    }
    if (!validation.passed) {
      const receiptPath = await dependencies.receipt(build.process.runId).then((item) => item.path).catch(() => undefined);
      throw new Error(`Validations en échec : reviewer non lancé.${receiptPath ? ` Receipt : ${receiptPath}` : ""}`);
    }

    await updateTask(repository.root, task.id, { status: "review" });
    let reviewExecution = checkpoint.reviewer;
    if (!reviewExecution) {
      const execution = await runner(options.reviewer, dependencies)(repository.root, task.id, agentOptions(options, "review", true));
      if (!isResult(execution)) throw new Error("Le reviewer n'a pas produit de résultat exécutable.");
      reviewExecution = execution;
      checkpoint.reviewer = reviewExecution;
    }
    if (reviewExecution.process.status !== "completed" || !reviewExecution.changeGuard.passed) {
      const receiptPath = await dependencies.receipt(build.process.runId).then((item) => item.path).catch(() => undefined);
      throw new Error(`Review indépendante invalide ou non strictement read-only.${receiptPath ? ` Receipt : ${receiptPath}` : ""}`);
    }

    const reviewPath = checkpoint.reviewPath ?? join(build.context.directory, "REVIEW.json");
    const review = checkpoint.review ?? await normalizeIndependentReview({
      taskId: task.id,
      builderProvider: options.builder,
      reviewerProvider: options.reviewer,
      builderRunId: build.process.runId,
      reviewerRunId: reviewExecution.process.runId,
      rawResponsePath: reviewExecution.lastMessagePath,
      outputPath: reviewPath,
    });
    checkpoint.review = review;
    checkpoint.reviewPath = reviewPath;
    checkpoint.stage = "review-completed";
    checkpoint.updatedAt = now();

    if (!(checkpoint.attempts ?? []).some((attempt) => attempt.builderRunId === build.process.runId)) {
      appendAttempt(checkpoint, {
        number: (checkpoint.attempts?.length ?? 0) + 1,
        builderRunId: build.process.runId,
        reviewerRunId: reviewExecution.process.runId,
        patchSha256,
        verdict: review.verdict,
        reviewPath,
        reservedPriceCeilingUsd: budget.reservedPerAttemptUsd,
        completedAt: now(),
      });
    }
    checkpoint.stopReason = review.verdict === "approve"
      ? "approved"
      : review.verdict === "blocked"
        ? "review-blocked"
        : (checkpoint.attempts?.length ?? 0) >= budget.maxAttempts
          ? "retry-limit"
          : "changes-requested";
    await savePipelineCheckpoint(checkpoint);

    let receiptPath = checkpoint.receiptPath;
    let receipt = checkpoint.receipt;
    if (!receiptPath || !receipt) {
      const created = await dependencies.receipt(build.process.runId);
      receiptPath = created.path;
      receipt = created.receipt;
      checkpoint.receiptPath = receiptPath;
      checkpoint.receipt = receipt;
      checkpoint.stage = "receipt-created";
    }
    checkpoint.status = "completed";
    checkpoint.error = undefined;
    checkpoint.updatedAt = now();
    await savePipelineCheckpoint(checkpoint);

    const passed = review.verdict === "approve" && review.structured;
    await updateTask(repository.root, task.id, { status: passed ? "review" : "blocked" });
    return {
      taskId: task.id,
      builder: build,
      validation,
      reviewer: reviewExecution,
      review,
      reviewPath,
      receiptPath,
      receipt,
      passed,
    };
  } catch (error) {
    if (checkpoint.status !== "completed") {
      checkpoint.status = "failed";
      checkpoint.stopReason = "technical-failure";
      checkpoint.error = error instanceof Error ? error.message : String(error);
      checkpoint.updatedAt = now();
      await savePipelineCheckpoint(checkpoint);
      await updateTask(repository.root, task.id, { status: "failed" });
    }
    throw error;
  }
}
