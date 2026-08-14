import { createHash, randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import type { RepositoryScan, SuperIaTask } from "../core/types.js";
import { ensureControlHome } from "./home.js";
import type {
  ControlPaths,
  ControlStatus,
  EventRecord,
  ProjectRecord,
  ProjectTaskRecord,
  RunRecord,
  RunStatus,
} from "./types.js";

const SCHEMA_VERSION = 1;

const MIGRATION_1 = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  root TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  remote TEXT,
  default_branch TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_scan_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_tasks (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  worktree_path TEXT,
  provider TEXT,
  checks_json TEXT NOT NULL,
  notes_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (project_id, id)
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  pid INTEGER,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  heartbeat_at TEXT NOT NULL,
  finished_at TEXT,
  metadata_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  journaled INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_runs_status_heartbeat ON runs(status, heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_runs_project ON runs(project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_aggregate ON events(aggregate_type, aggregate_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON project_tasks(project_id, status);
`;

export interface ControlPlaneOptions {
  now?: () => Date;
}

export interface CreateRunInput {
  projectId: string;
  taskId?: string;
  provider: string;
  pid?: number;
  metadata?: Record<string, unknown>;
}

function json(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function parseObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function parseArray(value: unknown): string[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length ? value : undefined;
}

function projectId(root: string): string {
  return createHash("sha256").update(root).digest("hex").slice(0, 20);
}

function mapProject(row: Record<string, unknown>): ProjectRecord {
  return {
    id: String(row.id),
    root: String(row.root),
    name: String(row.name),
    remote: optionalString(row.remote),
    defaultBranch: optionalString(row.default_branch),
    status: row.status === "archived" ? "archived" : "active",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastScan: parseObject(row.last_scan_json),
  };
}

function mapTask(row: Record<string, unknown>): ProjectTaskRecord {
  return {
    projectId: String(row.project_id),
    id: String(row.id),
    title: String(row.title),
    goal: String(row.goal),
    status: String(row.status),
    branchName: String(row.branch_name),
    worktreePath: optionalString(row.worktree_path),
    provider: optionalString(row.provider),
    checks: parseArray(row.checks_json),
    notes: parseArray(row.notes_json),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRun(row: Record<string, unknown>): RunRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    taskId: optionalString(row.task_id),
    provider: String(row.provider),
    status: String(row.status) as RunStatus,
    pid: typeof row.pid === "number" ? row.pid : undefined,
    startedAt: String(row.started_at),
    updatedAt: String(row.updated_at),
    heartbeatAt: String(row.heartbeat_at),
    finishedAt: optionalString(row.finished_at),
    metadata: parseObject(row.metadata_json),
  };
}

function mapEvent(row: Record<string, unknown>): EventRecord {
  return {
    id: Number(row.id),
    aggregateType: String(row.aggregate_type),
    aggregateId: String(row.aggregate_id),
    type: String(row.type),
    payload: parseObject(row.payload_json),
    createdAt: String(row.created_at),
  };
}

export class ControlPlane {
  private readonly now: () => Date;

  constructor(
    readonly paths: ControlPaths,
    private readonly database: DatabaseSync,
    options: ControlPlaneOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.configure();
    this.migrate();
    this.flushEventJournal();
  }

  private configure(): void {
    this.database.exec(
      "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL;",
    );
  }

  private migrate(): void {
    this.database.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);",
    );
    const row = this.database.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get();
    const current = Number(row?.version ?? 0);
    if (current > SCHEMA_VERSION) {
      throw new Error(`Base Super IA trop récente : schéma ${current}, binaire ${SCHEMA_VERSION}.`);
    }
    if (current < 1) {
      this.database.exec("BEGIN IMMEDIATE;");
      try {
        this.database.exec(MIGRATION_1);
        this.database.prepare("INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)")
          .run(1, this.isoNow());
        this.database.exec("COMMIT;");
      } catch (error) {
        this.database.exec("ROLLBACK;");
        throw error;
      }
    }
  }

  private isoNow(): string {
    return this.now().toISOString();
  }

  close(): void {
    this.database.close();
  }

  status(): ControlStatus {
    const journal = this.database.prepare("PRAGMA journal_mode").get();
    const migration = this.database.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get();
    const count = (table: string, where = ""): number => {
      const row = this.database.prepare(`SELECT COUNT(*) AS count FROM ${table} ${where}`).get();
      return Number(row?.count ?? 0);
    };
    return {
      schemaVersion: Number(migration?.version ?? 0),
      journalMode: String(journal?.journal_mode ?? "unknown"),
      projects: count("projects"),
      tasks: count("project_tasks"),
      runs: count("runs"),
      activeRuns: count("runs", "WHERE status IN ('queued', 'running')"),
      events: count("events"),
      pendingJournalEvents: count("events", "WHERE journaled = 0"),
    };
  }

  registerProject(scan: RepositoryScan): ProjectRecord {
    if (!scan.isGitRepository) throw new Error("Un projet Super IA doit être un dépôt Git.");
    const id = projectId(scan.root);
    const now = this.isoNow();
    this.database.prepare(`
      INSERT INTO projects(id, root, name, remote, default_branch, status, created_at, updated_at, last_scan_json)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
      ON CONFLICT(root) DO UPDATE SET
        name=excluded.name,
        remote=excluded.remote,
        default_branch=excluded.default_branch,
        status='active',
        updated_at=excluded.updated_at,
        last_scan_json=excluded.last_scan_json
    `).run(id, scan.root, scan.name, scan.remote ?? null, scan.branch ?? null, now, now, json(scan));
    const project = this.getProject(id);
    this.appendEvent("project", id, "project.registered", {
      root: scan.root,
      branch: scan.branch ?? null,
    });
    return project;
  }

  getProject(id: string): ProjectRecord {
    const row = this.database.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    if (!row) throw new Error(`Projet introuvable : ${id}`);
    return mapProject(row);
  }

  getProjectByRoot(root: string): ProjectRecord | undefined {
    const row = this.database.prepare("SELECT * FROM projects WHERE root = ?").get(root);
    return row ? mapProject(row) : undefined;
  }

  listProjects(): ProjectRecord[] {
    return this.database.prepare("SELECT * FROM projects ORDER BY updated_at DESC, name ASC").all().map(mapProject);
  }

  syncTasks(projectIdValue: string, tasks: SuperIaTask[]): number {
    this.getProject(projectIdValue);
    const statement = this.database.prepare(`
      INSERT INTO project_tasks(project_id, id, title, goal, status, branch_name, worktree_path, provider, checks_json, notes_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, id) DO UPDATE SET
        title=excluded.title,
        goal=excluded.goal,
        status=excluded.status,
        branch_name=excluded.branch_name,
        worktree_path=excluded.worktree_path,
        provider=excluded.provider,
        checks_json=excluded.checks_json,
        notes_json=excluded.notes_json,
        updated_at=excluded.updated_at
    `);
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      for (const task of tasks) {
        statement.run(
          projectIdValue,
          task.id,
          task.title,
          task.goal,
          task.status,
          task.branchName,
          task.worktreePath ?? null,
          task.provider ?? null,
          json(task.checks),
          json(task.notes),
          task.createdAt,
          task.updatedAt,
        );
      }
      this.database.exec("COMMIT;");
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
    this.appendEvent("project", projectIdValue, "tasks.synced", { count: tasks.length });
    return tasks.length;
  }

  listProjectTasks(projectIdValue: string): ProjectTaskRecord[] {
    return this.database.prepare("SELECT * FROM project_tasks WHERE project_id = ? ORDER BY id")
      .all(projectIdValue)
      .map(mapTask);
  }

  createRun(input: CreateRunInput): RunRecord {
    this.getProject(input.projectId);
    const id = randomUUID();
    const now = this.isoNow();
    this.database.prepare(`
      INSERT INTO runs(id, project_id, task_id, provider, status, pid, started_at, updated_at, heartbeat_at, metadata_json)
      VALUES (?, ?, ?, ?, 'running', ?, ?, ?, ?, ?)
    `).run(
      id,
      input.projectId,
      input.taskId ?? null,
      input.provider,
      input.pid ?? null,
      now,
      now,
      now,
      json(input.metadata),
    );
    this.appendEvent("run", id, "run.started", {
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      provider: input.provider,
    });
    return this.getRun(id);
  }

  getRun(id: string): RunRecord {
    const row = this.database.prepare("SELECT * FROM runs WHERE id = ?").get(id);
    if (!row) throw new Error(`Run introuvable : ${id}`);
    return mapRun(row);
  }

  listRuns(projectIdValue?: string): RunRecord[] {
    const rows = projectIdValue
      ? this.database.prepare("SELECT * FROM runs WHERE project_id = ? ORDER BY started_at DESC").all(projectIdValue)
      : this.database.prepare("SELECT * FROM runs ORDER BY started_at DESC").all();
    return rows.map(mapRun);
  }

  heartbeatRun(id: string, pid?: number): RunRecord {
    const current = this.getRun(id);
    if (!(["queued", "running"] as RunStatus[]).includes(current.status)) return current;
    const now = this.isoNow();
    this.database.prepare(
      "UPDATE runs SET status='running', pid=COALESCE(?, pid), heartbeat_at=?, updated_at=? WHERE id=?",
    ).run(pid ?? null, now, now, id);
    return this.getRun(id);
  }

  finishRun(
    id: string,
    status: Extract<RunStatus, "completed" | "failed" | "cancelled">,
    metadata: Record<string, unknown> = {},
  ): RunRecord {
    const current = this.getRun(id);
    const now = this.isoNow();
    const merged = { ...current.metadata, ...metadata };
    this.database.prepare(
      "UPDATE runs SET status=?, updated_at=?, heartbeat_at=?, finished_at=?, metadata_json=? WHERE id=?",
    ).run(status, now, now, now, json(merged), id);
    this.appendEvent("run", id, `run.${status}`, merged);
    return this.getRun(id);
  }

  reconcileStaleRuns(staleAfterMs = 5 * 60_000): RunRecord[] {
    const cutoff = new Date(this.now().getTime() - Math.max(0, staleAfterMs)).toISOString();
    const stale = this.database.prepare(
      "SELECT * FROM runs WHERE status IN ('queued', 'running') AND heartbeat_at < ?",
    ).all(cutoff).map(mapRun);
    if (!stale.length) return [];
    const now = this.isoNow();
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      const update = this.database.prepare(
        "UPDATE runs SET status='interrupted', updated_at=?, finished_at=? WHERE id=?",
      );
      for (const run of stale) update.run(now, now, run.id);
      this.database.exec("COMMIT;");
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
    for (const run of stale) {
      this.appendEvent("run", run.id, "run.interrupted", {
        previousHeartbeat: run.heartbeatAt,
        cutoff,
      });
    }
    return stale.map((run) => this.getRun(run.id));
  }

  appendEvent(
    aggregateType: string,
    aggregateId: string,
    type: string,
    payload: Record<string, unknown> = {},
  ): EventRecord {
    const createdAt = this.isoNow();
    const result = this.database.prepare(`
      INSERT INTO events(aggregate_type, aggregate_id, type, payload_json, created_at, journaled)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(aggregateType, aggregateId, type, json(payload), createdAt);
    const row = this.database.prepare("SELECT * FROM events WHERE id = ?")
      .get(Number(result.lastInsertRowid));
    if (!row) throw new Error("Événement non persisté.");
    this.flushEventJournal();
    return mapEvent(row);
  }

  flushEventJournal(limit = 1_000): number {
    const pending = this.database.prepare(
      "SELECT * FROM events WHERE journaled = 0 ORDER BY id LIMIT ?",
    ).all(Math.min(10_000, Math.max(1, Math.floor(limit))));
    let flushed = 0;
    const mark = this.database.prepare("UPDATE events SET journaled = 1 WHERE id = ?");
    for (const row of pending) {
      const event = mapEvent(row);
      try {
        appendFileSync(this.paths.eventJournal, `${JSON.stringify(event)}\n`, "utf8");
        mark.run(event.id);
        flushed += 1;
      } catch {
        break;
      }
    }
    return flushed;
  }

  listEvents(limit = 100, aggregateId?: string): EventRecord[] {
    const safeLimit = Math.min(1_000, Math.max(1, Math.floor(limit)));
    const rows = aggregateId
      ? this.database.prepare(
        "SELECT * FROM events WHERE aggregate_id = ? ORDER BY id DESC LIMIT ?",
      ).all(aggregateId, safeLimit)
      : this.database.prepare("SELECT * FROM events ORDER BY id DESC LIMIT ?").all(safeLimit);
    return rows.map(mapEvent);
  }
}

export async function openControlPlane(
  root?: string,
  options: ControlPlaneOptions = {},
): Promise<ControlPlane> {
  const paths = await ensureControlHome(root);
  return new ControlPlane(paths, new DatabaseSync(paths.database), options);
}
