import { access, chmod, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { findExecutable, runCommand, type CommandResult } from "../utils/command.js";
import { createControlBackup } from "./backup-manager.js";
import { ensureControlHome } from "./home.js";

export interface ResticConfig {
  schemaVersion: 1;
  repositoryEnv: "RESTIC_REPOSITORY";
  passwordFileEnv: "RESTIC_PASSWORD_FILE";
  tag: string;
  retention: { daily: number; weekly: number; monthly: number; yearly: number };
  checkDataSubset: string;
}

export interface ResticInvocation {
  command: "restic";
  args: string[];
  requiresNetwork: true;
  destructive: false;
  requiredEnvironment: string[];
}

export interface ResticInspection {
  configPath: string;
  executablePath?: string;
  installed: boolean;
  repositoryReferencePresent: boolean;
  passwordFileReferencePresent: boolean;
  ready: boolean;
  secretValuesRead: false;
}

export interface ResticResult {
  operation: "backup" | "retention-preview" | "check";
  executed: boolean;
  localBackupDirectory?: string;
  invocation: ResticInvocation;
  process?: CommandResult;
  secretValuesRead: false;
}

export type ResticExecutor = (command: string, args: string[], options?: { timeoutMs?: number }) => Promise<CommandResult>;

export const defaultResticConfig: ResticConfig = {
  schemaVersion: 1,
  repositoryEnv: "RESTIC_REPOSITORY",
  passwordFileEnv: "RESTIC_PASSWORD_FILE",
  tag: "superia-control",
  retention: { daily: 7, weekly: 5, monthly: 12, yearly: 3 },
  checkDataSubset: "5%",
};

function resticConfigPath(root: string): string {
  return join(root, "restic.json");
}

function retentionValue(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 10_000) throw new Error(`${label} doit être un entier compris entre 0 et 10000.`);
  return Number(value);
}

export function validateResticConfig(config: ResticConfig): ResticConfig {
  if (config.schemaVersion !== 1) throw new Error("Version de configuration Restic incompatible.");
  if (config.repositoryEnv !== "RESTIC_REPOSITORY") throw new Error("Le dépôt doit être référencé par RESTIC_REPOSITORY.");
  if (config.passwordFileEnv !== "RESTIC_PASSWORD_FILE") throw new Error("Le secret doit être fourni par RESTIC_PASSWORD_FILE.");
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(config.tag)) throw new Error("Tag Restic invalide.");
  if (!/^(?:[1-9]\d?|100)%$/.test(config.checkDataSubset)) throw new Error("checkDataSubset doit être compris entre 1% et 100%.");
  return {
    ...config,
    retention: {
      daily: retentionValue(config.retention.daily, "retention.daily"),
      weekly: retentionValue(config.retention.weekly, "retention.weekly"),
      monthly: retentionValue(config.retention.monthly, "retention.monthly"),
      yearly: retentionValue(config.retention.yearly, "retention.yearly"),
    },
  };
}

export async function ensureResticConfig(root?: string): Promise<{ path: string; config: ResticConfig; created: boolean }> {
  const home = await ensureControlHome(root);
  const path = resticConfigPath(home.root);
  try {
    await access(path);
    return { path, config: await loadResticConfig(root), created: false };
  } catch {
    await writeFile(path, `${JSON.stringify(defaultResticConfig, null, 2)}\n`, "utf8");
    await chmod(path, 0o600);
    return { path, config: defaultResticConfig, created: true };
  }
}

export async function loadResticConfig(root?: string): Promise<ResticConfig> {
  const home = await ensureControlHome(root);
  return validateResticConfig(JSON.parse(await readFile(resticConfigPath(home.root), "utf8")) as ResticConfig);
}

export async function inspectRestic(
  root?: string,
  env: Record<string, string | undefined> = process.env,
  executableResolver: (command: string) => Promise<string | undefined> = findExecutable,
): Promise<ResticInspection> {
  const { path, config } = await ensureResticConfig(root);
  const executablePath = await executableResolver("restic");
  const repositoryReferencePresent = Boolean(env[config.repositoryEnv]?.trim());
  const passwordFileReferencePresent = Boolean(env[config.passwordFileEnv]?.trim());
  return {
    configPath: path,
    executablePath,
    installed: Boolean(executablePath),
    repositoryReferencePresent,
    passwordFileReferencePresent,
    ready: Boolean(executablePath) && repositoryReferencePresent && passwordFileReferencePresent,
    secretValuesRead: false,
  };
}

export function buildResticBackupInvocation(config: ResticConfig, source: string): ResticInvocation {
  return {
    command: "restic",
    args: ["backup", source, "--tag", config.tag, "--json"],
    requiresNetwork: true,
    destructive: false,
    requiredEnvironment: [config.repositoryEnv, config.passwordFileEnv],
  };
}

export function buildResticRetentionPreview(config: ResticConfig): ResticInvocation {
  return {
    command: "restic",
    args: [
      "forget", "--dry-run", "--tag", config.tag,
      "--keep-daily", String(config.retention.daily),
      "--keep-weekly", String(config.retention.weekly),
      "--keep-monthly", String(config.retention.monthly),
      "--keep-yearly", String(config.retention.yearly),
    ],
    requiresNetwork: true,
    destructive: false,
    requiredEnvironment: [config.repositoryEnv, config.passwordFileEnv],
  };
}

export function buildResticCheckInvocation(config: ResticConfig): ResticInvocation {
  return {
    command: "restic",
    args: ["check", `--read-data-subset=${config.checkDataSubset}`],
    requiresNetwork: true,
    destructive: false,
    requiredEnvironment: [config.repositoryEnv, config.passwordFileEnv],
  };
}

async function executeRestic(
  root: string | undefined,
  invocation: ResticInvocation,
  network: boolean,
  env: Record<string, string | undefined>,
  executor: ResticExecutor,
  timeoutMs: number,
): Promise<CommandResult> {
  if (!network) throw new Error("Une opération Restic réelle exige --network.");
  const inspection = await inspectRestic(root, env);
  if (!inspection.installed) throw new Error("Restic est absent du PATH.");
  const missing = invocation.requiredEnvironment.filter((name) => !env[name]?.trim());
  if (missing.length) throw new Error(`Références Restic absentes : ${missing.join(", ")}.`);
  return executor(invocation.command, invocation.args, { timeoutMs });
}

export async function runResticBackup(options: {
  root?: string;
  network?: boolean;
  execute?: boolean;
  env?: Record<string, string | undefined>;
  executor?: ResticExecutor;
} = {}): Promise<ResticResult> {
  const { config } = await ensureResticConfig(options.root);
  const localBackup = await createControlBackup(options.root);
  const invocation = buildResticBackupInvocation(config, localBackup.directory);
  const processResult = options.execute
    ? await executeRestic(options.root, invocation, Boolean(options.network), options.env ?? process.env, options.executor ?? runCommand, 30 * 60_000)
    : undefined;
  return {
    operation: "backup",
    executed: Boolean(processResult),
    localBackupDirectory: localBackup.directory,
    invocation,
    process: processResult,
    secretValuesRead: false,
  };
}

export async function runResticRetentionPreview(options: {
  root?: string;
  network?: boolean;
  execute?: boolean;
  env?: Record<string, string | undefined>;
  executor?: ResticExecutor;
} = {}): Promise<ResticResult> {
  const { config } = await ensureResticConfig(options.root);
  const invocation = buildResticRetentionPreview(config);
  const processResult = options.execute
    ? await executeRestic(options.root, invocation, Boolean(options.network), options.env ?? process.env, options.executor ?? runCommand, 30 * 60_000)
    : undefined;
  return { operation: "retention-preview", executed: Boolean(processResult), invocation, process: processResult, secretValuesRead: false };
}

export async function runResticCheck(options: {
  root?: string;
  network?: boolean;
  execute?: boolean;
  env?: Record<string, string | undefined>;
  executor?: ResticExecutor;
} = {}): Promise<ResticResult> {
  const { config } = await ensureResticConfig(options.root);
  const invocation = buildResticCheckInvocation(config);
  const processResult = options.execute
    ? await executeRestic(options.root, invocation, Boolean(options.network), options.env ?? process.env, options.executor ?? runCommand, 60 * 60_000)
    : undefined;
  return { operation: "check", executed: Boolean(processResult), invocation, process: processResult, secretValuesRead: false };
}
