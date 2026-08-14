import type { ContextBuildResult } from "../context/types.js";
import type { ManagedProcessResult } from "../runtime/types.js";

export type AgentMode = "plan" | "build" | "review";

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
  dryRun?: boolean;
}

export interface AgentExecutionPreview {
  provider: string;
  mode: AgentMode;
  command: string;
  args: string[];
  cwd: string;
  stdinBytes: number;
  context: ContextBuildResult;
}

export interface AgentExecutionResult extends AgentExecutionPreview {
  process: ManagedProcessResult;
  lastMessagePath: string;
  normalizedEventsPath: string;
  parsedEvents: number;
  invalidEventLines: number;
}
