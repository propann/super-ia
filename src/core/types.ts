export type ProviderTransport = "cli" | "web-assisted" | "local" | "api";
export type CostProfile = "included" | "free-tier" | "low-cost" | "local" | "paid" | "unknown";
export type AutomationLevel = "full" | "assisted" | "manual";
export type ProviderStatus = "ready" | "planned" | "experimental" | "conditional";
export type TaskStatus = "planned" | "ready" | "running" | "blocked" | "review" | "done" | "failed" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "critical";
export type LocalToolCategory = "vcs" | "search" | "utility" | "database" | "context" | "agent" | "inference" | "sandbox" | "container" | "backup" | "security";
export type LocalToolStatus = "required" | "recommended" | "optional" | "experimental";

export interface ProviderDefinition {
  id: string;
  name: string;
  command?: string;
  transport: ProviderTransport;
  cost: CostProfile;
  automation: AutomationLevel;
  status: ProviderStatus;
  official: boolean;
  homepage: string;
  notes: string;
  capabilities: {
    readRepository: boolean;
    writeFiles: boolean;
    runCommands: boolean;
    structuredOutput: boolean;
    offline: boolean;
  };
}

export interface ProviderCheck extends ProviderDefinition {
  installed: boolean | null;
  executablePath?: string;
}

export interface LocalToolDefinition {
  id: string;
  name: string;
  commandCandidates: string[];
  category: LocalToolCategory;
  status: LocalToolStatus;
  lightweight: boolean;
  notes: string;
}

export interface LocalToolCheck extends LocalToolDefinition {
  installed: boolean;
  detectedCommand?: string;
  executablePath?: string;
}

export interface SuperIaConfig {
  version: 1;
  policy: {
    defaultMode: "read-only" | "worktree";
    allowApi: boolean;
    monthlyApiBudgetEur: number;
    requireHumanApprovalBeforeMerge: boolean;
    redactSecretsBeforeRemoteSend: boolean;
  };
  preferredProviders: string[];
}

export interface RepositoryScan {
  root: string;
  name: string;
  isGitRepository: boolean;
  branch?: string;
  remote?: string;
  dirty: boolean;
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  manifests: string[];
  languages: string[];
  instructions: string[];
  scripts: Record<string, string>;
  recommendedChecks: string[];
}

export interface SuperIaTask {
  id: string;
  title: string;
  goal: string;
  status: TaskStatus;
  priority: TaskPriority;
  repositoryRoot: string;
  baseBranch: string;
  branchName: string;
  worktreePath?: string;
  provider?: string;
  owner?: string;
  dueDate?: string;
  tags: string[];
  dependencies: string[];
  acceptanceCriteria: string[];
  allowedPaths: string[];
  createdAt: string;
  updatedAt: string;
  checks: string[];
  notes: string[];
}
