import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureControlHome } from "../control/home.js";

export interface NotificationConfig {
  schemaVersion: 1;
  enabled: boolean;
  stdout: boolean;
  notifyRuns: boolean;
  notifyBlockedTasks: boolean;
}

export interface NotificationState {
  schemaVersion: 1;
  lastEventId: number;
}

export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface NotificationRecord {
  schemaVersion: 1;
  id: string;
  key: string;
  createdAt: string;
  level: NotificationLevel;
  kind: "run" | "task";
  title: string;
  message: string;
  projectId?: string;
  taskId?: string;
  runId?: string;
  sourceEventId?: number;
}

export interface NotificationPaths {
  root: string;
  config: string;
  state: string;
  records: string;
}

const DEFAULT_CONFIG: NotificationConfig = {
  schemaVersion: 1,
  enabled: true,
  stdout: false,
  notifyRuns: true,
  notifyBlockedTasks: true,
};

function missing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === "ENOENT";
}

function alreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === "EEXIST";
}

function assertConfig(value: unknown, path: string): NotificationConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Configuration de notifications invalide : ${path}`);
  }
  const input = value as Record<string, unknown>;
  if (input.schemaVersion !== 1
    || typeof input.enabled !== "boolean"
    || typeof input.stdout !== "boolean"
    || typeof input.notifyRuns !== "boolean"
    || typeof input.notifyBlockedTasks !== "boolean") {
    throw new Error(`Configuration de notifications invalide : ${path}`);
  }
  return input as unknown as NotificationConfig;
}

function assertState(value: unknown, path: string): NotificationState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`État de notifications invalide : ${path}`);
  }
  const input = value as Record<string, unknown>;
  if (input.schemaVersion !== 1 || !Number.isInteger(input.lastEventId) || Number(input.lastEventId) < 0) {
    throw new Error(`État de notifications invalide : ${path}`);
  }
  return { schemaVersion: 1, lastEventId: Number(input.lastEventId) };
}

function assertRecord(value: unknown): NotificationRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  if (input.schemaVersion !== 1
    || typeof input.id !== "string"
    || typeof input.key !== "string"
    || typeof input.createdAt !== "string"
    || typeof input.title !== "string"
    || typeof input.message !== "string"
    || !["info", "success", "warning", "error"].includes(String(input.level))
    || !["run", "task"].includes(String(input.kind))) return undefined;
  return input as unknown as NotificationRecord;
}

async function atomicJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(temporary, 0o600);
  await rename(temporary, path);
  await chmod(path, 0o600);
}

export async function notificationPaths(controlHome?: string): Promise<NotificationPaths> {
  const control = await ensureControlHome(controlHome);
  const root = join(control.root, "notifications");
  const records = join(root, "records");
  await Promise.all([mkdir(root, { recursive: true }), mkdir(records, { recursive: true })]);
  return {
    root,
    config: join(root, "config.json"),
    state: join(root, "state.json"),
    records,
  };
}

export async function loadNotificationConfig(controlHome?: string): Promise<NotificationConfig> {
  const paths = await notificationPaths(controlHome);
  try {
    const parsed = JSON.parse(await readFile(paths.config, "utf8")) as unknown;
    await chmod(paths.config, 0o600);
    return assertConfig(parsed, paths.config);
  } catch (error) {
    if (!missing(error)) throw error;
    await atomicJson(paths.config, DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveNotificationConfig(config: NotificationConfig, controlHome?: string): Promise<void> {
  const paths = await notificationPaths(controlHome);
  assertConfig(config, paths.config);
  await atomicJson(paths.config, config);
}

export async function loadNotificationState(initialEventId: number, controlHome?: string): Promise<NotificationState> {
  const paths = await notificationPaths(controlHome);
  try {
    const parsed = JSON.parse(await readFile(paths.state, "utf8")) as unknown;
    await chmod(paths.state, 0o600);
    return assertState(parsed, paths.state);
  } catch (error) {
    if (!missing(error)) throw error;
    const state: NotificationState = { schemaVersion: 1, lastEventId: Math.max(0, Math.floor(initialEventId)) };
    await atomicJson(paths.state, state);
    return state;
  }
}

export async function saveNotificationState(state: NotificationState, controlHome?: string): Promise<void> {
  const paths = await notificationPaths(controlHome);
  assertState(state, paths.state);
  await atomicJson(paths.state, state);
}

function recordFilename(key: string): string {
  return `${createHash("sha256").update(key).digest("hex")}.json`;
}

export async function writeNotificationRecord(record: NotificationRecord, controlHome?: string): Promise<boolean> {
  const paths = await notificationPaths(controlHome);
  const path = join(paths.records, recordFilename(record.key));
  try {
    await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await chmod(path, 0o600);
    return true;
  } catch (error) {
    if (alreadyExists(error)) return false;
    throw error;
  }
}

export async function listNotificationRecords(limit = 100, controlHome?: string): Promise<NotificationRecord[]> {
  const paths = await notificationPaths(controlHome);
  const safeLimit = Math.min(1_000, Math.max(1, Math.floor(limit)));
  const names = (await readdir(paths.records)).filter((name) => name.endsWith(".json"));
  const records: NotificationRecord[] = [];
  for (const name of names) {
    try {
      const record = assertRecord(JSON.parse(await readFile(join(paths.records, name), "utf8")) as unknown);
      if (record) records.push(record);
    } catch {
      // Un reçu isolé invalide ne doit pas rendre les autres notifications illisibles.
    }
  }
  return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, safeLimit);
}
