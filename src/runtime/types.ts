export interface ManagedProcessRequest {
  projectId: string;
  taskId?: string;
  provider: string;
  command: string;
  args?: string[];
  cwd: string;
  timeoutMs?: number;
  heartbeatMs?: number;
  terminateGraceMs?: number;
  metadata?: Record<string, unknown>;
  env?: Record<string, string | undefined>;
  allowedEnvKeys?: string[];
}

export interface ManagedProcessResult {
  runId: string;
  command: string;
  args: string[];
  cwd: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  durationMs: number;
  stdoutPath: string;
  stderrPath: string;
  stdoutBytes: number;
  stderrBytes: number;
  truncated: boolean;
  status: "completed" | "failed";
}

export interface ValidationResult {
  command: string;
  result: ManagedProcessResult;
}

export interface ValidationReport {
  projectId: string;
  repositoryRoot: string;
  passed: boolean;
  checks: ValidationResult[];
}
