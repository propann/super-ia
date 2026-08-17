import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { runCommand } from "../utils/command.js";

export const DEFAULT_MAX_CHANGED_FILES = 50;
export const DEFAULT_MAX_DIFF_BYTES = 1_000_000;

export const DEFAULT_FORBIDDEN_PATHS = [
  ".env",
  ".env.*",
  "**/.env",
  "**/.env.*",
  ".npmrc",
  "**/.npmrc",
  ".pypirc",
  "**/.pypirc",
  "*.pem",
  "**/*.pem",
  "*.key",
  "**/*.key",
  "id_rsa",
  "**/id_rsa",
  "id_ed25519",
  "**/id_ed25519",
  ".git-credentials",
  "**/.git-credentials",
] as const;

export interface GitWorkspaceSnapshot {
  root: string;
  files: Record<string, { status: string; sha256: string }>;
}

export interface ChangeGuardReport {
  schemaVersion: 1;
  passed: boolean;
  allowedPaths: string[];
  forbiddenPatterns: string[];
  changedFiles: string[];
  outOfScopeFiles: string[];
  forbiddenFiles: string[];
  limits: {
    maxChangedFiles: number;
    maxDiffBytes: number;
    changedFiles: number;
    diffBytes: number;
  };
  limitViolations: string[];
  diffPath: string;
  reportPath: string;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseStatus(output: string): Array<{ path: string; status: string }> {
  const entries = output.split("\u0000").filter(Boolean);
  const result: Array<{ path: string; status: string }> = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.startsWith("? ")) {
      const path = entry.slice(2);
      if (!path.startsWith(".superia/")) result.push({ path, status: "??" });
      continue;
    }
    if (entry.startsWith("1 ")) {
      const fields = entry.split(" ");
      const path = fields.slice(8).join(" ");
      if (path && !path.startsWith(".superia/")) result.push({ path, status: fields[1] ?? ".." });
      continue;
    }
    if (entry.startsWith("2 ")) {
      const fields = entry.split(" ");
      const path = fields.slice(9).join(" ");
      index += 1;
      if (path && !path.startsWith(".superia/")) result.push({ path, status: fields[1] ?? "R." });
    }
  }
  return result;
}

async function fingerprint(root: string, path: string): Promise<string> {
  const absolute = join(root, path);
  try {
    await access(absolute);
    return hash(await readFile(absolute, "utf8"));
  } catch {
    return "missing";
  }
}

async function fileBytes(root: string, path: string): Promise<number> {
  try {
    return (await readFile(join(root, path))).byteLength;
  } catch {
    return 0;
  }
}

export async function captureGitWorkspace(root: string): Promise<GitWorkspaceSnapshot> {
  const resolved = resolve(root);
  const status = await runCommand("git", ["status", "--porcelain=v2", "-z", "--untracked-files=all"], {
    cwd: resolved,
    timeoutMs: 30_000,
  });
  const files: GitWorkspaceSnapshot["files"] = {};
  for (const entry of parseStatus(status.stdout)) {
    files[entry.path] = {
      status: entry.status,
      sha256: await fingerprint(resolved, entry.path),
    };
  }
  return { root: resolved, files };
}

function globPattern(pattern: string): RegExp {
  const normalized = pattern.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error(`Motif de chemin invalide : ${pattern}`);
  }
  const escaped = normalized
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "::DOUBLE_STAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DOUBLE_STAR::/g, ".*");
  return new RegExp(`^${escaped}(?:/.*)?$`);
}

function normalizedPath(path: string): string {
  return path.replaceAll(sep, "/").replace(/^\.\//, "");
}

export function pathMatches(path: string, patterns: string[]): boolean {
  const normalized = normalizedPath(path);
  return patterns.some((pattern) => globPattern(pattern).test(normalized));
}

export function pathIsAllowed(path: string, allowedPaths: string[]): boolean {
  return pathMatches(path, allowedPaths);
}

function positiveLimit(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1) {
    throw new Error(`${label} doit être un entier supérieur ou égal à 1.`);
  }
  return resolved;
}

export async function enforceGitChangeScope(input: {
  before: GitWorkspaceSnapshot;
  afterRoot: string;
  allowedPaths: string[];
  artifactDirectory: string;
  forbiddenPaths?: string[];
  maxChangedFiles?: number;
  maxDiffBytes?: number;
}): Promise<ChangeGuardReport> {
  const after = await captureGitWorkspace(input.afterRoot);
  if (after.root !== input.before.root) throw new Error("Les snapshots Git ne concernent pas le même workspace.");
  const candidates = new Set([...Object.keys(input.before.files), ...Object.keys(after.files)]);
  const changedFiles = [...candidates].filter((path) => {
    const previous = input.before.files[path];
    const current = after.files[path];
    if (!previous || !current) return true;
    return previous.status !== current.status || previous.sha256 !== current.sha256;
  }).sort();

  const allowedPaths = [...new Set(input.allowedPaths.map((path) => path.trim()).filter(Boolean))];
  const forbiddenPatterns = [...new Set([
    ...DEFAULT_FORBIDDEN_PATHS,
    ...(input.forbiddenPaths ?? []),
  ].map((path) => path.trim()).filter(Boolean))];
  for (const pattern of [...allowedPaths, ...forbiddenPatterns]) globPattern(pattern);

  const outOfScopeFiles = changedFiles.filter((path) => !pathIsAllowed(path, allowedPaths));
  const forbiddenFiles = changedFiles.filter((path) => pathMatches(path, forbiddenPatterns));
  const maxChangedFiles = positiveLimit(input.maxChangedFiles, DEFAULT_MAX_CHANGED_FILES, "maxChangedFiles");
  const maxDiffBytes = positiveLimit(input.maxDiffBytes, DEFAULT_MAX_DIFF_BYTES, "maxDiffBytes");

  const directory = resolve(input.artifactDirectory);
  await mkdir(directory, { recursive: true });
  const diffPath = join(directory, "AGENT_CHANGES.patch");
  const reportPath = join(directory, "CHANGE_GUARD.json");
  const diff = await runCommand("git", ["diff", "--binary", "HEAD", "--"], {
    cwd: after.root,
    timeoutMs: 30_000,
  });
  const untracked = changedFiles.filter((path) => after.files[path]?.status === "??");
  const untrackedBytes = (await Promise.all(untracked.map((path) => fileBytes(after.root, path))))
    .reduce((total, bytes) => total + bytes, 0);
  const appendix = untracked.length ? `\n# Untracked files\n${untracked.join("\n")}\n` : "";
  const patch = `${diff.stdout}${appendix}`;
  await writeFile(diffPath, patch, "utf8");
  const diffBytes = Buffer.byteLength(patch, "utf8") + untrackedBytes;
  const limitViolations: string[] = [];
  if (changedFiles.length > maxChangedFiles) {
    limitViolations.push(`too-many-files:${changedFiles.length}>${maxChangedFiles}`);
  }
  if (diffBytes > maxDiffBytes) {
    limitViolations.push(`diff-too-large:${diffBytes}>${maxDiffBytes}`);
  }

  const report: ChangeGuardReport = {
    schemaVersion: 1,
    passed: outOfScopeFiles.length === 0 && forbiddenFiles.length === 0 && limitViolations.length === 0,
    allowedPaths,
    forbiddenPatterns,
    changedFiles,
    outOfScopeFiles,
    forbiddenFiles,
    limits: {
      maxChangedFiles,
      maxDiffBytes,
      changedFiles: changedFiles.length,
      diffBytes,
    },
    limitViolations,
    diffPath,
    reportPath,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
