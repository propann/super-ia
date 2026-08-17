import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { scanRepository } from "../core/repository-scanner.js";
import { listTasks } from "../core/task-store.js";
import { openControlPlane } from "../control/control-plane.js";
import { ensureControlHome } from "../control/home.js";
import { registerRepositorySnapshot } from "../control/repository-registry.js";
import { runManagedProcess } from "../runtime/process-runner.js";
import type { ManagedProcessResult } from "../runtime/types.js";
import { findExecutable } from "../utils/command.js";

export interface GitleaksFinding {
  Description?: string;
  RuleID?: string;
  File?: string;
  StartLine?: number;
  Fingerprint?: string;
  [key: string]: unknown;
}

export interface GitleaksReport {
  available: boolean;
  passed: boolean;
  required: boolean;
  repositoryRoot: string;
  reportPath?: string;
  findings: GitleaksFinding[];
  process?: ManagedProcessResult;
  reason?: string;
}

export interface GitleaksOptions {
  required?: boolean;
  timeoutMs?: number;
  command?: string;
  mode?: "dir" | "git";
}

async function readFindings(path: string): Promise<GitleaksFinding[]> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is GitleaksFinding => Boolean(item) && typeof item === "object") : [];
  } catch {
    return [];
  }
}

export async function runGitleaksScan(directory: string, options: GitleaksOptions = {}): Promise<GitleaksReport> {
  const scan = await scanRepository(directory);
  const command = options.command ?? await findExecutable("gitleaks");
  const required = options.required ?? false;
  if (!command) {
    if (required) throw new Error("Gitleaks est requis mais absent du PATH.");
    return {
      available: false,
      passed: true,
      required,
      repositoryRoot: scan.root,
      findings: [],
      reason: "Gitleaks absent : scan externe ignoré.",
    };
  }

  const home = await ensureControlHome();
  const securityDirectory = join(home.root, "security");
  await mkdir(securityDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const reportPath = join(securityDirectory, `gitleaks-${stamp}-${process.pid}.json`);
  const mode = options.mode ?? "dir";
  const tasks = await listTasks(scan.root);
  const control = await openControlPlane();
  try {
    const project = registerRepositorySnapshot(control, scan, tasks).project;
    const args = [
      mode,
      "--no-banner",
      "--redact",
      "--report-format",
      "json",
      "--report-path",
      reportPath,
      scan.root,
    ];
    const processResult = await runManagedProcess({
      projectId: project.id,
      provider: "gitleaks",
      command,
      args,
      cwd: scan.root,
      timeoutMs: options.timeoutMs ?? 5 * 60_000,
      metadata: { securityScan: "gitleaks", mode, reportPath, required },
    }, control);
    const findings = await readFindings(reportPath);
    return {
      available: true,
      passed: processResult.status === "completed" && findings.length === 0,
      required,
      repositoryRoot: scan.root,
      reportPath,
      findings,
      process: processResult,
      reason: findings.length ? `${findings.length} secret(s) potentiel(s) détecté(s).` : undefined,
    };
  } finally {
    control.close();
  }
}
