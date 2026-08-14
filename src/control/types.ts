export type ProjectStatus = "active" | "archived";
export type RunStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";

export interface ControlPaths {
  root: string;
  database: string;
  events: string;
  eventJournal: string;
  backups: string;
}

export interface ProjectRecord {
  id: string;
  root: string;
  name: string;
  remote?: string;
  defaultBranch?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  lastScan: Record<string, unknown>;
}

export interface ProjectTaskRecord {
  projectId: string;
  id: string;
  title: string;
  goal: string;
  status: string;
  branchName: string;
  worktreePath?: string;
  provider?: string;
  checks: string[];
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RunRecord {
  id: string;
  projectId: string;
  taskId?: string;
  provider: string;
  status: RunStatus;
  pid?: number;
  startedAt: string;
  updatedAt: string;
  heartbeatAt: string;
  finishedAt?: string;
  metadata: Record<string, unknown>;
}

export interface EventRecord {
  id: number;
  aggregateType: string;
  aggregateId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ControlStatus {
  schemaVersion: number;
  journalMode: string;
  projects: number;
  tasks: number;
  runs: number;
  activeRuns: number;
  events: number;
  pendingJournalEvents: number;
}
