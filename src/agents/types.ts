import type { ContextBuildResult } from "../context/types.js";
import type { ChangeGuardReport } from "../quality/change-guard.js";
import type {
  ManagedProcessResult,
  SandboxNetworkMode,
  SandboxWorkspaceAccess,
} from "../runtime/types.js";

export type AgentMode = "plan" | "build" | "review";
export type SecurityPreflightStatus = "passed" | "waived" | "not-run-dry-run";
export type SandboxPreflightStatus = "active" | "waived" | "not-run-dry-run";

export interface SecurityPreflightResult {
  status: SecurityPreflightStatus;
  scanner: "gitleaks";
  reportPath?: string;
  runId?: string;
  findings: number;
  reason?: string;
}

export interface SandboxPreflightResult {
  status: SandboxPreflightStatus;
  engine: "bubblewrap";
  network: SandboxNetworkMode;
  workspaceAccess: SandboxWorkspaceAccess;
  ephemeralHome: true;
  reason?: string;
}

export interface AgentInvocation {
  provider: string;
  command: string;
  args: string[];
  stdin: string;
  cwd: string;
  lastMessagePath: string;
  metadata: Record<string, unknown>;
}

export interface AgentExecutionOptions {
  mode?: AgentMode;
  model?: string;
  timeoutMs?: number;
  maxContextBytes?: number;
  maxTurns?: number;
  maxTokens?: number;
  maxPriceUsd?: number;
  feedbackPath?: string;
  dryRun?: boolean;
  allowWithoutGitleaks?: boolean;
  allowWithoutBubblewrap?: boolean;
}

export interface AgentExecutionPreview {
  provider: string;
  mode: AgentMode;
  command: string;
  args: string[];
  cwd: string;
  stdinBytes: number;
  context: ContextBuildResult;
  securityPreflight: SecurityPreflightResult;
  sandboxPreflight: SandboxPreflightResult;
}

export interface AgentExecutionResult extends AgentExecutionPreview {
  process: ManagedProcessResult;
  lastMessagePath: string;
  normalizedEventsPath: string;
  parsedEvents: number;
  invalidEventLines: number;
  changeGuard: ChangeGuardReport;
}
