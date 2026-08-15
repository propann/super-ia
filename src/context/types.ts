export type ContextFileMode = "full" | "metadata";

export interface SecretFinding {
  path: string;
  rule: string;
  line?: number;
  severity: "high" | "medium";
  message: string;
}

export interface ContextFileEntry {
  path: string;
  sha256: string;
  bytes: number;
  mode: ContextFileMode;
  reasons: string[];
}

export interface ExcludedContextFile {
  path: string;
  reason: string;
  findings?: SecretFinding[];
}

export interface ContextManifest {
  schemaVersion: 1;
  id: string;
  repositoryRoot: string;
  repositoryName: string;
  baseCommit: string;
  dirty: boolean;
  taskId?: string;
  goal?: string;
  query?: string;
  createdAt: string;
  maxBytes: number;
  includedBytes: number;
  contextHash: string;
  files: ContextFileEntry[];
  excluded: ExcludedContextFile[];
  instructions: string[];
}

export interface BuildContextOptions {
  taskId?: string;
  goal?: string;
  query?: string;
  maxBytes?: number;
  outputRoot?: string;
  now?: () => Date;
}

export interface ContextBuildResult {
  directory: string;
  missionPath: string;
  contextPath: string;
  manifestPath: string;
  manifest: ContextManifest;
}
