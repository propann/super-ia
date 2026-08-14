import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { PipelineAttempt, PipelineCheckpoint, PipelineOptions } from "./types.js";

function positiveInteger(value: number | undefined, fallback: number, maximum: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > maximum) {
    throw new Error(`${label} doit être compris entre 1 et ${maximum}.`);
  }
  return resolved;
}

function positiveMoney(value: number | undefined, fallback: number, maximum: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0 || resolved > maximum) {
    throw new Error(`${label} doit être supérieur à 0 et inférieur ou égal à ${maximum}.`);
  }
  return Math.round(resolved * 100) / 100;
}

export function retryBudget(options: PipelineOptions): {
  maxAttempts: number;
  maxTotalPriceUsd: number;
  reservedPerAttemptUsd: number;
} {
  const maxAttempts = positiveInteger(options.maxAttempts, 3, 10, "maxAttempts");
  const reservedPerAttemptUsd = positiveMoney(options.maxPriceUsd, 0.25, 5, "maxPriceUsd");
  const maxTotalPriceUsd = positiveMoney(
    options.maxTotalPriceUsd,
    Math.round(reservedPerAttemptUsd * maxAttempts * 100) / 100,
    50,
    "maxTotalPriceUsd",
  );
  return { maxAttempts, maxTotalPriceUsd, reservedPerAttemptUsd };
}

export async function fileSha256(path: string): Promise<string> {
  const data = await readFile(path);
  return createHash("sha256").update(data).digest("hex");
}

export function prepareRetry(checkpoint: PipelineCheckpoint, options: PipelineOptions): {
  attemptNumber: number;
  feedbackPath?: string;
  reservedPerAttemptUsd: number;
} {
  const budget = retryBudget(options);
  const attempts = checkpoint.attempts ?? [];
  if (!checkpoint.review || checkpoint.review.verdict !== "changes-requested") {
    throw new Error("Une correction exige une review structurée avec verdict changes-requested.");
  }
  if (!checkpoint.reviewPath) throw new Error("Le rapport de review précédent est absent.");
  if (attempts.length >= budget.maxAttempts) {
    checkpoint.stopReason = "retry-limit";
    throw new Error(`Budget de tentatives épuisé : ${attempts.length}/${budget.maxAttempts}.`);
  }
  const reserved = checkpoint.reservedPriceCeilingUsd ?? 0;
  if (reserved + budget.reservedPerAttemptUsd > budget.maxTotalPriceUsd + Number.EPSILON) {
    checkpoint.stopReason = "price-limit";
    throw new Error(`Plafond de prix réservé dépassé : ${(reserved + budget.reservedPerAttemptUsd).toFixed(2)} USD > ${budget.maxTotalPriceUsd.toFixed(2)} USD.`);
  }
  return {
    attemptNumber: attempts.length + 1,
    feedbackPath: checkpoint.reviewPath,
    reservedPerAttemptUsd: budget.reservedPerAttemptUsd,
  };
}

export function detectRepeatedPatch(attempts: PipelineAttempt[], patchSha256: string): PipelineAttempt | undefined {
  return attempts.find((attempt) => attempt.patchSha256 === patchSha256);
}

export function appendAttempt(checkpoint: PipelineCheckpoint, attempt: PipelineAttempt): void {
  checkpoint.attempts = [...(checkpoint.attempts ?? []), attempt];
  checkpoint.reservedPriceCeilingUsd = Math.round(
    ((checkpoint.reservedPriceCeilingUsd ?? 0) + attempt.reservedPriceCeilingUsd) * 100,
  ) / 100;
}
