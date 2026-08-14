import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve, sep } from "node:path";
import { openControlPlane, type ControlPlane } from "../control/control-plane.js";
import type { ManagedProcessRequest, ManagedProcessResult } from "./types.js";

const defaultEnvKeys = [
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TMPDIR",
  "TEMP",
  "TMP",
  "LANG",
  "LC_ALL",
  "TERM",
  "XDG_CONFIG_HOME",
  "XDG_CACHE_HOME",
  "XDG_DATA_HOME",
  "CODEX_HOME",
];

function safeEnvironment(request: ManagedProcessRequest): Record<string, string> {
  const allowed = new Set([...defaultEnvKeys, ...(request.allowedEnvKeys ?? [])]);
  const env: Record<string, string> = {};
  for (const key of allowed) {
    const value = request.env?.[key] ?? process.env[key];
    if (typeof value === "string") env[key] = value;
  }
  env.SUPERIA_RUN = "1";
  return env;
}

function allowedWorkingDirectory(control: ControlPlane, request: ManagedProcessRequest): boolean {
  const cwd = resolve(request.cwd);
  const project = control.getProject(request.projectId);
  const projectRoot = resolve(project.root);
  if (cwd === projectRoot || cwd.startsWith(`${projectRoot}${sep}`)) return true;
  if (!request.taskId) return false;
  const task = control.listProjectTasks(request.projectId).find((candidate) => candidate.id === request.taskId);
  if (!task?.worktreePath) return false;
  const worktree = resolve(task.worktreePath);
  return cwd === worktree || cwd.startsWith(`${worktree}${sep}`);
}

function appendLimited(
  current: string,
  chunk: unknown,
  maximumBytes: number,
): { value: string; bytes: number; truncated: boolean } {
  const text = String(chunk);
  const currentBytes = Buffer.byteLength(current, "utf8");
  if (currentBytes >= maximumBytes) return { value: current, bytes: currentBytes, truncated: true };
  const remaining = maximumBytes - currentBytes;
  const candidate = Buffer.from(text, "utf8");
  if (candidate.byteLength <= remaining) {
    const value = current + text;
    return { value, bytes: Buffer.byteLength(value, "utf8"), truncated: false };
  }
  const clipped = candidate.subarray(0, remaining).toString("utf8");
  const value = current + clipped;
  return { value, bytes: Buffer.byteLength(value, "utf8"), truncated: true };
}

function killProcessTree(child: any, signal: string): void {
  const pid = typeof child.pid === "number" ? child.pid : undefined;
  if (!pid) return;
  if (process.platform !== "win32") {
    try {
      process.kill(-pid, signal);
      return;
    } catch {
      // Fall back to the direct child.
    }
  }
  try {
    child.kill(signal);
  } catch {
    // The process may already have exited.
  }
}

export async function runManagedProcess(
  request: ManagedProcessRequest,
  existingControl?: ControlPlane,
): Promise<ManagedProcessResult> {
  if (!request.command.trim()) throw new Error("La commande du runner est vide.");
  const control = existingControl ?? await openControlPlane();
  const closeControl = !existingControl;
  try {
    if (!allowedWorkingDirectory(control, request)) {
      throw new Error("Le dossier de travail doit appartenir au projet ou à son worktree déclaré.");
    }

    const args = request.args ?? [];
    const startedAt = Date.now();
    const run = control.createRun({
      projectId: request.projectId,
      taskId: request.taskId,
      provider: request.provider,
      metadata: {
        command: request.command,
        args,
        cwd: resolve(request.cwd),
        stdinBytes: request.stdin ? Buffer.byteLength(request.stdin, "utf8") : 0,
        ...request.metadata,
      },
    });
    const artifactDirectory = join(control.paths.runs, run.id);
    await mkdir(artifactDirectory, { recursive: true });
    const stdoutPath = join(artifactDirectory, "stdout.log");
    const stderrPath = join(artifactDirectory, "stderr.log");
    const maximumOutputBytes = 4 * 1024 * 1024;

    return await new Promise<ManagedProcessResult>((resolvePromise, rejectPromise) => {
      let stdout = "";
      let stderr = "";
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let truncated = false;
      let timedOut = false;
      let settled = false;
      let killTimer: ReturnType<typeof setTimeout> | undefined;

      const child = spawn(request.command, args, {
        cwd: resolve(request.cwd),
        env: safeEnvironment(request),
        detached: process.platform !== "win32",
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      });
      if (typeof child.pid === "number") control.heartbeatRun(run.id, child.pid);
      if (request.stdin) child.stdin?.end(request.stdin, "utf8");
      else child.stdin?.end();

      child.stdout?.on("data", (chunk: unknown) => {
        const appended = appendLimited(stdout, chunk, maximumOutputBytes);
        stdout = appended.value;
        stdoutBytes = appended.bytes;
        truncated ||= appended.truncated;
      });
      child.stderr?.on("data", (chunk: unknown) => {
        const appended = appendLimited(stderr, chunk, maximumOutputBytes);
        stderr = appended.value;
        stderrBytes = appended.bytes;
        truncated ||= appended.truncated;
      });

      const heartbeat = setInterval(() => {
        try {
          control.heartbeatRun(run.id, child.pid);
        } catch {
          // A heartbeat failure must not orphan the child process silently.
        }
      }, Math.max(1_000, request.heartbeatMs ?? 10_000));

      const timeout = setTimeout(() => {
        timedOut = true;
        killProcessTree(child, "SIGTERM");
        killTimer = setTimeout(() => killProcessTree(child, "SIGKILL"), Math.max(500, request.terminateGraceMs ?? 3_000));
      }, Math.max(1_000, request.timeoutMs ?? 15 * 60_000));

      const finish = async (exitCode: number | null, signal: string | null, spawnError?: unknown): Promise<void> => {
        if (settled) return;
        settled = true;
        clearInterval(heartbeat);
        clearTimeout(timeout);
        if (killTimer) clearTimeout(killTimer);
        try {
          await Promise.all([
            writeFile(stdoutPath, stdout, "utf8"),
            writeFile(stderrPath, stderr, "utf8"),
          ]);
          const succeeded = exitCode === 0 && !timedOut && !spawnError;
          const status = succeeded ? "completed" : "failed";
          const result: ManagedProcessResult = {
            runId: run.id,
            command: basename(request.command),
            args,
            cwd: resolve(request.cwd),
            exitCode,
            signal,
            timedOut,
            durationMs: Date.now() - startedAt,
            stdoutPath,
            stderrPath,
            stdoutBytes,
            stderrBytes,
            truncated,
            status,
          };
          control.finishRun(run.id, status, {
            exitCode,
            signal,
            timedOut,
            durationMs: result.durationMs,
            stdoutPath,
            stderrPath,
            stdoutBytes,
            stderrBytes,
            truncated,
            spawnError: spawnError instanceof Error ? spawnError.message : spawnError ? String(spawnError) : undefined,
          });
          resolvePromise(result);
        } catch (error) {
          rejectPromise(error);
        }
      };

      child.on("error", (error: unknown) => {
        void finish(null, null, error);
      });
      child.on("close", (code: number | null, signal: string | null) => {
        void finish(code, signal);
      });
    });
  } finally {
    if (closeControl) control.close();
  }
}
