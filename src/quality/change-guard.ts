import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { runCommand } from "../utils/command.js";

export interface GitWorkspaceSnapshot {
  root: string;
  files: Record<string, { status: string; sha256: string }>;
}

export interface ChangeGuardReport {
  schemaVersion: 1;
  passed: boolean;
  allowedPaths: string[];
  changedFiles: string[];
  outOfScopeFiles: string[];
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
    const status = entry.slice(0, 2);
    let path = entry.slice(3);
    if (status.includes("R") || status.includes("C")) path = entries[++index] ?? path;
    if (path && !path.startsWith(".superia/")) result.push({ path, status });
  }
  return result;
}

async function fingerprint(root: string, path: string): Promise<string> {
  const absolute = join(root, path);
  try {
    await access(absolute);
    return hash(await readFile(absolute));
  } catch {
    return "missing";
  }
}

export async function captureGitWorkspace(root: string): Promise<GitWorkspaceSnapshot> {
  const resolved = resolve(root);
  const status = await runCommand("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: resolved,
    timeoutMs: 30_000,
  });
  const files: GitWorkspaceSnapshot["files"] = {};
  for (const entry of parseStatus(status.stdout)) {
    files[entry.path] = { status: entry.status, sha256: await fingerprint(resolved, entry.path) };
  }
  return { root: resolved, files };
}

function globPattern(pattern: string): RegExp {
  const normalized = pattern.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "::DOUBLE_STAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DOUBLE_STAR::/g, ".*");
  return new RegExp(`^${escaped}(?:/.*)?$`);
}

export function pathIsAllowed(path: string, allowedPaths: string[]): boolean {
  const normalized = path.replaceAll(sep, "/").replace(/^\.\//, "");
  return allowedPaths.some((pattern) => globPattern(pattern).test(normalized));
}

export async function enforceGitChangeScope(input: {
  before: GitWorkspaceSnapshot;
  afterRoot: string;
  allowedPaths: string[];
  artifactDirectory: string;
}): Promise<ChangeGuardReport> {
  const after = await captureGitWorkspace(input.afterRoot);
  const changedFiles = Object.keys(after.files).filter((path) => {
    const previous = input.before.files[path];
    const current = after.files[path];
    return !previous || previous.status !== current.status || previous.sha256 !== current.sha256;
  }).sort();
  const outOfScopeFiles = changedFiles.filter((path) => !pathIsAllowed(path, input.allowedPaths));
  const directory = resolve(input.artifactDirectory);
  await mkdir(directory, { recursive: true });
  const diffPath = join(directory, "AGENT_CHANGES.patch");
  const reportPath = join(directory, "CHANGE_GUARD.json");
  const diff = await runCommand("git", ["diff", "--binary", "HEAD", "--"], { cwd: after.root, timeoutMs: 30_000 });
  const untracked = changedFiles.filter((path) => after.files[path]?.status === "??");
  const appendix = untracked.length ? `\n# Untracked files\n${untracked.join("\n")}\n` : "";
  await writeFile(diffPath, `${diff.stdout}${appendix}`, "utf8");
  const report: ChangeGuardReport = {
    schemaVersion: 1,
    passed: outOfScopeFiles.length === 0,
    allowedPaths: [...input.allowedPaths],
    changedFiles,
    outOfScopeFiles,
    diffPath,
    reportPath,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
