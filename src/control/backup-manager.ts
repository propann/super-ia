import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ensureControlHome } from "./home.js";

export interface BackupFileRecord {
  name: string;
  bytes: number;
  sha256: string;
}

export interface BackupManifest {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  sourceHome: string;
  files: BackupFileRecord[];
}

export interface BackupResult {
  directory: string;
  manifestPath: string;
  manifest: BackupManifest;
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function digest(data: unknown): string {
  return createHash("sha256").update(data).digest("hex");
}

function missing(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "ENOENT";
}

async function fileRecord(path: string): Promise<BackupFileRecord> {
  const data = await readFile(path);
  return {
    name: basename(path),
    bytes: data.byteLength,
    sha256: digest(data),
  };
}

async function copyOptionalPrivateFile(
  source: string,
  destination: string,
): Promise<BackupFileRecord | undefined> {
  try {
    const content = await readFile(source, "utf8");
    await writeFile(destination, content, { encoding: "utf8", mode: 0o600 });
    await chmod(destination, 0o600);
    return await fileRecord(destination);
  } catch (error) {
    if (missing(error)) return undefined;
    throw error;
  }
}

export async function createControlBackup(
  root?: string,
  now: () => Date = () => new Date(),
): Promise<BackupResult> {
  const paths = await ensureControlHome(root);
  const createdAt = now().toISOString();
  const id = `backup-${safeTimestamp(new Date(createdAt))}`;
  const directory = join(paths.backups, id);
  await mkdir(directory, { recursive: false });
  const databasePath = join(directory, "control.sqlite");
  const eventsPath = join(directory, "events.jsonl");
  const manifestPath = join(directory, "MANIFEST.json");

  const database = new DatabaseSync(paths.database);
  try {
    database.exec("PRAGMA busy_timeout=5000; PRAGMA wal_checkpoint(PASSIVE);");
    database.exec(`VACUUM INTO ${sqlString(databasePath)};`);
  } finally {
    database.close();
  }

  try {
    const events = await readFile(paths.eventJournal, "utf8");
    await writeFile(eventsPath, events, { encoding: "utf8", mode: 0o600 });
  } catch {
    await writeFile(eventsPath, "", { encoding: "utf8", mode: 0o600 });
  }
  await Promise.all([chmod(databasePath, 0o600), chmod(eventsPath, 0o600)]);

  const files: BackupFileRecord[] = [
    await fileRecord(databasePath),
    await fileRecord(eventsPath),
  ];
  const optional = await Promise.all([
    copyOptionalPrivateFile(
      join(paths.root, "safety", "emergency-stop.json"),
      join(directory, "emergency-stop.json"),
    ),
    copyOptionalPrivateFile(
      join(paths.root, "notifications", "config.json"),
      join(directory, "notifications-config.json"),
    ),
    copyOptionalPrivateFile(
      join(paths.root, "notifications", "state.json"),
      join(directory, "notifications-state.json"),
    ),
  ]);
  for (const record of optional) if (record) files.push(record);

  const manifest: BackupManifest = {
    schemaVersion: 1,
    id,
    createdAt,
    sourceHome: paths.root,
    files,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(manifestPath, 0o600);
  return { directory, manifestPath, manifest };
}

export async function listControlBackups(root?: string): Promise<string[]> {
  const paths = await ensureControlHome(root);
  const entries = await readdir(paths.backups);
  return entries.filter((entry) => entry.startsWith("backup-")).sort().reverse();
}

export async function verifyControlBackup(directory: string): Promise<{
  valid: boolean;
  manifest: BackupManifest;
  errors: string[];
}> {
  const manifest = JSON.parse(await readFile(join(directory, "MANIFEST.json"), "utf8")) as BackupManifest;
  const errors: string[] = [];
  for (const expected of manifest.files) {
    try {
      const actual = await fileRecord(join(directory, expected.name));
      if (actual.bytes !== expected.bytes) errors.push(`${expected.name}: taille différente`);
      if (actual.sha256 !== expected.sha256) errors.push(`${expected.name}: empreinte différente`);
    } catch {
      errors.push(`${expected.name}: fichier absent`);
    }
  }
  return { valid: errors.length === 0, manifest, errors };
}
