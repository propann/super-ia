export type ConnectionKind =
  | "cli-session"
  | "api-key-env"
  | "openai-compatible"
  | "cloud-identity"
  | "mcp-stdio"
  | "mcp-http"
  | "acp-stdio"
  | "a2a-http"
  | "ssh-cli"
  | "web-assisted"
  | "local-endpoint";

export type ConnectionAuthMode = "session" | "environment" | "manual" | "none";
export type ConnectionState = "disabled" | "ready" | "configured" | "needs-auth" | "missing-command" | "invalid" | "manual";

export interface AiConnection {
  id: string;
  label: string;
  kind: ConnectionKind;
  providerId?: string;
  enabled: boolean;
  authMode: ConnectionAuthMode;
  command?: string;
  args: string[];
  baseUrl?: string;
  host?: string;
  requiredEnv: string[];
  protocolVersion?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionStore {
  schemaVersion: 1;
  updatedAt: string;
  connections: AiConnection[];
}

export interface ConnectionCheck extends AiConnection {
  state: ConnectionState;
  ready: boolean;
  reasons: string[];
  executablePath?: string;
  environmentPresent: string[];
  environmentMissing: string[];
  networkChecked: false;
}
