import type { AgentExecutionPreview, AgentExecutionResult, AgentExecutionOptions } from "../agents/types.js";
import type { ValidationReport } from "../runtime/types.js";
import type { RunReceipt } from "../quality/types.js";

export type PipelineProvider = "codex" | "vibe";
export type ReviewSeverity = "critical" | "high" | "medium" | "low";
export type ReviewVerdict = "approve" | "changes-requested" | "blocked";
export type PipelineStage = "initialized" | "builder-completed" | "validation-completed" | "review-completed" | "receipt-created";
export type PipelineStatus = "running" | "completed" | "failed";

export interface ReviewFinding {
  severity: ReviewSeverity;
  category: string;
  summary: string;
  evidence: string;
  recommendation: string;
  file?: string;
  line?: number;
}

export interface IndependentReviewReport {
  schemaVersion: 1;
  taskId: string;
  builderProvider: PipelineProvider;
  reviewerProvider: PipelineProvider;
  builderRunId: string;
  reviewerRunId: string;
  verdict: ReviewVerdict;
  findings: ReviewFinding[];
  residualRisks: string[];
  structured: boolean;
  rawResponsePath: string;
  createdAt: string;
}

export interface PipelineOptions {
  builder: PipelineProvider;
  reviewer: PipelineProvider;
  dryRun?: boolean;
  resume?: boolean;
  builderModel?: string;
  reviewerModel?: string;
  timeoutMs?: number;
  maxContextBytes?: number;
  maxTurns?: number;
  maxTokens?: number;
  maxPriceUsd?: number;
  allowWithoutGitleaks?: boolean;
  allowWithoutBubblewrap?: boolean;
}

export interface PipelinePreview {
  taskId: string;
  builder: AgentExecutionPreview;
  reviewer: AgentExecutionPreview;
  independent: true;
}

export interface PipelineResult {
  taskId: string;
  builder: AgentExecutionResult;
  validation: ValidationReport;
  reviewer: AgentExecutionResult;
  review: IndependentReviewReport;
  reviewPath: string;
  receiptPath: string;
  receipt: RunReceipt;
  passed: boolean;
}

export interface PipelineCheckpoint {
  schemaVersion: 1;
  taskId: string;
  repositoryRoot: string;
  worktreePath: string;
  builderProvider: PipelineProvider;
  reviewerProvider: PipelineProvider;
  status: PipelineStatus;
  stage: PipelineStage;
  startedAt: string;
  updatedAt: string;
  builder?: AgentExecutionResult;
  validation?: ValidationReport;
  reviewer?: AgentExecutionResult;
  review?: IndependentReviewReport;
  reviewPath?: string;
  receiptPath?: string;
  receipt?: RunReceipt;
  error?: string;
}

export type AgentRunner = (
  repositoryDirectory: string,
  taskId: string,
  options: AgentExecutionOptions,
) => Promise<AgentExecutionPreview | AgentExecutionResult>;
