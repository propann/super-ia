import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RepositoryScan, SuperIaTask } from "./types.js";

function taskDirectory(root: string): string {
  return join(root, ".superia", "tasks");
}

function taskPath(root: string, id: string): string {
  return join(taskDirectory(root), `${id}.json`);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "mission";
}

export async function listTasks(root: string): Promise<SuperIaTask[]> {
  await mkdir(taskDirectory(root), { recursive: true });
  const entries = (await readdir(taskDirectory(root))) as string[];
  const tasks = await Promise.all(
    entries
      .filter((file) => /^TASK-\d{4}\.json$/.test(file))
      .map(async (file) => JSON.parse(await readFile(join(taskDirectory(root), file), "utf8")) as SuperIaTask),
  );
  return tasks.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getTask(root: string, id: string): Promise<SuperIaTask> {
  try {
    return JSON.parse(await readFile(taskPath(root, id), "utf8")) as SuperIaTask;
  } catch {
    throw new Error(`Mission introuvable : ${id}`);
  }
}

export async function saveTask(task: SuperIaTask): Promise<void> {
  await mkdir(taskDirectory(task.repositoryRoot), { recursive: true });
  const path = taskPath(task.repositoryRoot, task.id);
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(task, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function createTask(scan: RepositoryScan, goal: string): Promise<SuperIaTask> {
  if (!goal.trim()) throw new Error("La mission doit contenir un objectif.");
  if (!scan.isGitRepository) throw new Error("La création d'une mission exige un dépôt Git.");
  const tasks = await listTasks(scan.root);
  const next = tasks.reduce((max, task) => Math.max(max, Number(task.id.slice(5))), 0) + 1;
  const id = `TASK-${String(next).padStart(4, "0")}`;
  const title = goal.trim().split(/\r?\n/)[0].slice(0, 100);
  const now = new Date().toISOString();
  const task: SuperIaTask = {
    id,
    title,
    goal: goal.trim(),
    status: "planned",
    repositoryRoot: scan.root,
    baseBranch: scan.branch || "main",
    branchName: `agent/${id.toLowerCase()}-${slugify(title)}`,
    createdAt: now,
    updatedAt: now,
    checks: scan.recommendedChecks,
    notes: [],
  };
  await saveTask(task);
  return task;
}
