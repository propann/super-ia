import { access, mkdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type { SuperIaTask } from "./types.js";
import { runCommand } from "../utils/command.js";
import { saveTask } from "./task-store.js";

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function defaultWorktreePath(task: SuperIaTask): string {
  return join(dirname(task.repositoryRoot), `${basename(task.repositoryRoot)}.superia-worktrees`, task.id);
}

export async function createWorktree(task: SuperIaTask, dryRun = false): Promise<{ path: string; command: string[] }> {
  const path = task.worktreePath ?? defaultWorktreePath(task);
  const command = ["worktree", "add", "-b", task.branchName, path, task.baseBranch];
  if (await pathExists(path)) throw new Error(`Le chemin du worktree existe déjà : ${path}`);
  if (dryRun) return { path, command: ["git", ...command] };

  await mkdir(dirname(path), { recursive: true });
  await runCommand("git", command, { cwd: task.repositoryRoot, timeoutMs: 60_000 });
  task.worktreePath = path;
  task.status = "ready";
  task.updatedAt = new Date().toISOString();
  await saveTask(task);
  return { path, command: ["git", ...command] };
}
