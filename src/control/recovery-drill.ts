import { randomUUID } from "node:crypto";
import { chmod, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createControlBackup, restoreControlBackup } from "./backup-manager.js";
import { ensureControlHome } from "./home.js";

export interface RecoveryCounts {
  projects: number;
  tasks: number;
  runs: number;
  events: number;
  journalLines: number;
}

export interface RecoveryDrillReport {
  schemaVersion: 1;
  backupId: string;
  createdAt: string;
  sourceHome: string;
  restoredHome: string;
  kept: boolean;
  source: RecoveryCounts;
  restored: RecoveryCounts;
  passed: boolean;
}

export interface RecoveryDrillResult {
  backupDirectory: string;
  reportPath: string;
  report: RecoveryDrillReport;
}

function tableCount(database: DatabaseSync, table: string): number {
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table};`).get();
  const count = Number(row?.count ?? Number.NaN);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error(`Comptage SQLite invalide pour ${table}.`);
  return count;
}

async function journalLineCount(path: string): Promise<number> {
  const content = await readFile(path, "utf8");
  return content.split("\n").filter((line) => line.trim()).length;
}

async function recoveryCounts(databasePath: string, journalPath: string): Promise<RecoveryCounts> {
  const database = new DatabaseSync(databasePath);
  try {
    return {
      projects: tableCount(database, "projects"),
      tasks: tableCount(database, "project_tasks"),
      runs: tableCount(database, "runs"),
      events: tableCount(database, "events"),
      journalLines: await journalLineCount(journalPath),
    };
  } finally {
    database.close();
  }
}

function sameCounts(left: RecoveryCounts, right: RecoveryCounts): boolean {
  return left.projects === right.projects
    && left.tasks === right.tasks
    && left.runs === right.runs
    && left.events === right.events
    && left.journalLines === right.journalLines;
}

export async function runControlRecoveryDrill(
  root?: string,
  keepRestoredCopy = false,
  now: () => Date = () => new Date(),
): Promise<RecoveryDrillResult> {
  const paths = await ensureControlHome(root);
  const backup = await createControlBackup(paths.root, now);
  const restoredHome = join(backup.directory, `.drill-restored-${randomUUID()}`);

  try {
    await restoreControlBackup(backup.directory, restoredHome, now);
    const source = await recoveryCounts(
      join(backup.directory, "control.sqlite"),
      join(backup.directory, "events.jsonl"),
    );
    const restored = await recoveryCounts(
      join(restoredHome, "control.sqlite"),
      join(restoredHome, "events", "events.jsonl"),
    );
    const report: RecoveryDrillReport = {
      schemaVersion: 1,
      backupId: backup.manifest.id,
      createdAt: now().toISOString(),
      sourceHome: paths.root,
      restoredHome,
      kept: keepRestoredCopy,
      source,
      restored,
      passed: sameCounts(source, restored),
    };
    const reportPath = join(backup.directory, "DRILL.json");
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await chmod(reportPath, 0o600);
    if (!report.passed) throw new Error(`Drill de restauration incohérent : ${reportPath}`);
    return { backupDirectory: backup.directory, reportPath, report };
  } finally {
    if (!keepRestoredCopy) await rm(restoredHome, { recursive: true, force: true });
  }
}
