export type SandboxNetworkMode = "host" | "isolated";
export type SandboxWorkspaceAccess = "read-only" | "read-write";

export interface ManagedSandboxRequest {
  engine: "bubblewrap";
  executable: string;
  network: SandboxNetworkMode;
  workspaceAccess: SandboxWorkspaceAccess;
  statePaths?: string[];
  writablePaths?: string[];
  readOnlyPaths?: string[];
}

export interface SandboxExecutionSummary {
  engine: "bubblewrap";
  active: true;
  network: SandboxNetworkMode;
  workspaceAccess: SandboxWorkspaceAccess;
  ephemeralHome: true;
  statePaths: string[];
  writablePaths: string[];
  readOnlyPaths: string[];
}

export interface ManagedProcessRequest {
  projectId: string;
  taskId?: string;
  provider: string;
  command: string;
  args?: string[];
  cwd: string;
  stdin?: string;
  timeoutMs?: number;
  heartbeatMs?: number;
  terminateGraceMs?: number;
  metadata?: Record<string, unknown>;
  env?: Record<string, string | undefined>;
  allowedEnvKeys?: string[];
  sandbox?: ManagedSandboxRequest;
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
  sandbox?: SandboxExecutionSummary;
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
