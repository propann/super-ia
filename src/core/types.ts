export type ProviderTransport = "cli" | "web-assisted" | "local" | "api";
export type CostProfile = "included" | "free-tier" | "low-cost" | "local" | "paid" | "unknown";
export type AutomationLevel = "full" | "assisted" | "manual";
export type ProviderStatus = "ready" | "planned" | "experimental" | "conditional";

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
