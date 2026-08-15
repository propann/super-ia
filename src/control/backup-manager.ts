import { createHash, randomUUID } from "node:crypto";
import { chmod, copyFile, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadBenchmarkStore } from "../providers/benchmark-store.js";
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

export interface RestoreReceipt {
  schemaVersion: 1;
  backupId: string;
  restoredAt: string;
  sourceDirectory: string;
  targetHome: string;
  manifestSha256: string;
  files: BackupFileRecord[];
}

export interface RestoreResult {
  targetHome: string;
  receiptPath: string;
  receipt: RestoreReceipt;
}

const REQUIRED_BACKUP_FILES = new Set(["control.sqlite", "events.jsonl"]);
const ALLOWED_BACKUP_FILES = new Set([
  ...REQUIRED_BACKUP_FILES,
  "emergency-stop.json",
  "notifications-config.json",
  "notifications-state.json",
  "provider-benchmarks.json",
]);

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

function manifestShapeErrors(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["MANIFEST.json: objet invalide"];
  const manifest = value as Record<string, unknown>;
  const errors: string[] = [];
  if (manifest.schemaVersion !== 1) errors.push("MANIFEST.json: schemaVersion invalide");
  if (typeof manifest.id !== "string" || !/^backup-[0-9]{14}$/.test(manifest.id)) errors.push("MANIFEST.json: identifiant invalide");
  if (typeof manifest.createdAt !== "string" || !Number.isFinite(Date.parse(manifest.createdAt))) errors.push("MANIFEST.json: date invalide");
  if (typeof manifest.sourceHome !== "string" || !manifest.sourceHome.trim()) errors.push("MANIFEST.json: sourceHome invalide");
  if (!Array.isArray(manifest.files)) return [...errors, "MANIFEST.json: liste de fichiers invalide"];

  const names = new Set<string>();
  for (const entry of manifest.files) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push("MANIFEST.json: entrée de fichier invalide");
      continue;
    }
    const file = entry as Record<string, unknown>;
    if (typeof file.name !== "string" || basename(file.name) !== file.name || !ALLOWED_BACKUP_FILES.has(file.name)) {
      errors.push(`MANIFEST.json: fichier interdit ${String(file.name)}`);
      continue;
    }
    if (names.has(file.name)) errors.push(`MANIFEST.json: fichier dupliqué ${file.name}`);
    names.add(file.name);
    if (!Number.isInteger(file.bytes) || Number(file.bytes) < 0) errors.push(`${file.name}: taille invalide`);
    if (typeof file.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(file.sha256)) errors.push(`${file.name}: SHA-256 invalide`);
  }
  for (const required of REQUIRED_BACKUP_FILES) {
    if (!names.has(required)) errors.push(`MANIFEST.json: fichier requis absent ${required}`);
  }
  return errors;
}

async function readManifest(directory: string): Promise<{ manifest: BackupManifest; raw: string }> {
  const raw = await readFile(join(directory, "MANIFEST.json"), "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("MANIFEST.json invalide : JSON illisible.");
  }
  const errors = manifestShapeErrors(parsed);
  if (errors.length) throw new Error(errors.join("\n"));
  return { manifest: parsed as BackupManifest, raw };
}

function restoreDestination(root: string, name: string): string {
  if (name === "control.sqlite") return join(root, "control.sqlite");
  if (name === "events.jsonl") return join(root, "events", "events.jsonl");
  if (name === "emergency-stop.json") return join(root, "safety", "emergency-stop.json");
  if (name === "notifications-config.json") return join(root, "notifications", "config.json");
  if (name === "notifications-state.json") return join(root, "notifications", "state.json");
  if (name === "provider-benchmarks.json") return join(root, "providers", "benchmarks.json");
  throw new Error(`Fichier de sauvegarde non pris en charge : ${name}`);
}

function assertDatabaseIntegrity(path: string): void {
  const database = new DatabaseSync(path);
  try {
    const rows = database.prepare("PRAGMA integrity_check;").all();
    const results = rows.flatMap((row) => Object.values(row).map(String));
    if (!results.length || results.some((value) => value.toLowerCase() !== "ok")) {
      throw new Error(`Base SQLite invalide : ${results.join(", ") || "aucun résultat"}`);
    }
  } finally {
    database.close();
  }
}

async function assertEventJournal(path: string): Promise<void> {
  const content = await readFile(path, "utf8");
  const lines = content.split("\n").filter((line) => line.trim());
  for (let index = 0; index < lines.length; index += 1) {
    try {
      JSON.parse(lines[index]);
    } catch {
      throw new Error(`Journal JSONL invalide à la ligne ${index + 1}.`);
    }
  }
}

async function assertTargetAbsent(path: string): Promise<void> {
  try {
    await lstat(path);
    throw new Error(`La cible existe déjà : ${path}`);
  } catch (error) {
    if (missing(error)) return;
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
    copyOptionalPrivateFile(
      join(paths.root, "providers", "benchmarks.json"),
      join(directory, "provider-benchmarks.json"),
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
  const resolved = resolve(directory);
  const { manifest } = await readManifest(resolved);
  const errors: string[] = [];
  for (const expected of manifest.files) {
    try {
      const actual = await fileRecord(join(resolved, expected.name));
      if (actual.bytes !== expected.bytes) errors.push(`${expected.name}: taille différente`);
      if (actual.sha256 !== expected.sha256) errors.push(`${expected.name}: empreinte différente`);
    } catch {
      errors.push(`${expected.name}: fichier absent`);
    }
  }
  return { valid: errors.length === 0, manifest, errors };
}

export async function restoreControlBackup(
  directory: string,
  targetHome: string,
  now: () => Date = () => new Date(),
): Promise<RestoreResult> {
  const source = resolve(directory);
  const target = resolve(targetHome);
  await assertTargetAbsent(target);

  const verification = await verifyControlBackup(source);
  if (!verification.valid) throw new Error(`Sauvegarde invalide :\n${verification.errors.join("\n")}`);
  const { raw: manifestRaw } = await readManifest(source);

  const parent = dirname(target);
  const staging = join(parent, `.${basename(target)}.restore-${randomUUID()}`);
  await mkdir(parent, { recursive: true });
  await mkdir(staging, { recursive: false });
  try {
    await Promise.all([
      mkdir(join(staging, "events"), { recursive: true }),
      mkdir(join(staging, "runs"), { recursive: true }),
      mkdir(join(staging, "backups"), { recursive: true }),
      mkdir(join(staging, "safety"), { recursive: true }),
      mkdir(join(staging, "notifications", "records"), { recursive: true }),
      mkdir(join(staging, "providers"), { recursive: true }),
    ]);

    for (const expected of verification.manifest.files) {
      const destination = restoreDestination(staging, expected.name);
      await copyFile(join(source, expected.name), destination);
      await chmod(destination, 0o600);
    }

    assertDatabaseIntegrity(join(staging, "control.sqlite"));
    await assertEventJournal(join(staging, "events", "events.jsonl"));
    if (verification.manifest.files.some((file) => file.name === "provider-benchmarks.json")) {
      await loadBenchmarkStore(staging);
    }

    const receipt: RestoreReceipt = {
      schemaVersion: 1,
      backupId: verification.manifest.id,
      restoredAt: now().toISOString(),
      sourceDirectory: source,
      targetHome: target,
      manifestSha256: digest(manifestRaw),
      files: verification.manifest.files,
    };
    const receiptPath = join(staging, "restore-receipt.json");
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await chmod(receiptPath, 0o600);

    await rename(staging, target);
    return {
      targetHome: target,
      receiptPath: join(target, "restore-receipt.json"),
      receipt,
    };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}
