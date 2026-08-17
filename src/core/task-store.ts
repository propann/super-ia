import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { analyzeTaskGraph, assertValidTaskGraph, reconcileDependencyStatuses, type TaskGraphAnalysis, type TaskGraphReconciliation } from "./task-graph.js";
import type { RepositoryScan, SuperIaTask, TaskPriority, TaskStatus } from "./types.js";

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

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

function normalizeTask(raw: Partial<SuperIaTask>): SuperIaTask {
  if (!raw.id || !raw.title || !raw.goal || !raw.repositoryRoot || !raw.baseBranch || !raw.branchName) {
    throw new Error("Fichier de mission incomplet.");
  }
  const now = new Date().toISOString();
  return {
    id: raw.id,
    title: raw.title,
    goal: raw.goal,
    status: raw.status ?? "planned",
    priority: raw.priority ?? "normal",
    repositoryRoot: raw.repositoryRoot,
    baseBranch: raw.baseBranch,
    branchName: raw.branchName,
    worktreePath: raw.worktreePath,
    provider: raw.provider,
    owner: raw.owner,
    dueDate: raw.dueDate,
    tags: stringArray(raw.tags),
    dependencies: stringArray(raw.dependencies),
    blockedByDependencies: raw.blockedByDependencies === true,
    acceptanceCriteria: stringArray(raw.acceptanceCriteria),
    allowedPaths: stringArray(raw.allowedPaths),
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? now,
    checks: stringArray(raw.checks),
    notes: stringArray(raw.notes),
  };
}

export async function listTasks(root: string): Promise<SuperIaTask[]> {
  await mkdir(taskDirectory(root), { recursive: true });
  const entries = (await readdir(taskDirectory(root))) as string[];
  const tasks = await Promise.all(
    entries
      .filter((file) => /^TASK-\d{4}\.json$/.test(file))
      .map(async (file) => normalizeTask(JSON.parse(await readFile(join(taskDirectory(root), file), "utf8")) as Partial<SuperIaTask>)),
  );
  return tasks.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getTask(root: string, id: string): Promise<SuperIaTask> {
  try {
    return normalizeTask(JSON.parse(await readFile(taskPath(root, id), "utf8")) as Partial<SuperIaTask>);
  } catch {
    throw new Error(`Mission introuvable : ${id}`);
  }
}

export async function saveTask(task: SuperIaTask): Promise<void> {
  await mkdir(taskDirectory(task.repositoryRoot), { recursive: true });
  const path = taskPath(task.repositoryRoot, task.id);
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(normalizeTask(task), null, 2)}\n`, "utf8");
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
    priority: "normal",
    repositoryRoot: scan.root,
    baseBranch: scan.branch || "main",
    branchName: `agent/${id.toLowerCase()}-${slugify(title)}`,
    createdAt: now,
    updatedAt: now,
    checks: scan.recommendedChecks,
    notes: [],
    tags: [],
    dependencies: [],
    blockedByDependencies: false,
    acceptanceCriteria: [],
    allowedPaths: [],
  };
  await saveTask(task);
  return task;
}

export interface TaskUpdate {
  status?: TaskStatus;
  priority?: TaskPriority;
  provider?: string;
  owner?: string;
  dueDate?: string;
  tags?: string[];
  dependencies?: string[];
  acceptanceCriteria?: string[];
  allowedPaths?: string[];
}

function applyTaskUpdate(task: SuperIaTask, update: TaskUpdate): SuperIaTask {
  const next = normalizeTask(task);
  if (update.status) {
    next.status = update.status;
    next.blockedByDependencies = false;
  }
  if (update.priority) next.priority = update.priority;
  if (update.provider !== undefined) next.provider = update.provider || undefined;
  if (update.owner !== undefined) next.owner = update.owner || undefined;
  if (update.dueDate !== undefined) next.dueDate = update.dueDate || undefined;
  if (update.tags) next.tags = stringArray(update.tags);
  if (update.dependencies) next.dependencies = stringArray(update.dependencies);
  if (update.acceptanceCriteria) next.acceptanceCriteria = stringArray(update.acceptanceCriteria);
  if (update.allowedPaths) next.allowedPaths = stringArray(update.allowedPaths);
  return next;
}

export async function getTaskGraph(root: string): Promise<TaskGraphAnalysis> {
  return analyzeTaskGraph(await listTasks(root));
}

export async function reconcileTaskGraph(root: string): Promise<TaskGraphReconciliation> {
  const current = await listTasks(root);
  const result = reconcileDependencyStatuses(current);
  if (!result.changedIds.length) return result;
  const now = new Date().toISOString();
  const changed = new Set(result.changedIds);
  for (const task of result.tasks) {
    if (!changed.has(task.id)) continue;
    task.updatedAt = now;
    await saveTask(task);
  }
  return result;
}

export async function updateTask(root: string, id: string, update: TaskUpdate): Promise<SuperIaTask> {
  const tasks = await listTasks(root);
  const existing = tasks.find((task) => task.id === id);
  if (!existing) throw new Error(`Mission introuvable : ${id}`);
  if (update.dependencies?.includes(id)) throw new Error("Une mission ne peut pas dépendre d'elle-même.");

  const updated = applyTaskUpdate(existing, update);
  const candidates = tasks.map((task) => task.id === id ? updated : task);
  assertValidTaskGraph(candidates);

  const byId = new Map(candidates.map((task) => [task.id, task]));
  const waitingFor = updated.dependencies.filter((dependencyId) => byId.get(dependencyId)?.status !== "done");
  if (update.status && ["ready", "running", "review", "done"].includes(update.status) && waitingFor.length) {
    throw new Error(`Dépendances non terminées pour ${id} : ${waitingFor.join(", ")}.`);
  }

  const reconciled = reconcileDependencyStatuses(candidates);
  const changed = new Set([...reconciled.changedIds, id]);
  const now = new Date().toISOString();
  for (const task of reconciled.tasks) {
    if (!changed.has(task.id)) continue;
    task.updatedAt = now;
    await saveTask(task);
  }
  return reconciled.tasks.find((task) => task.id === id) as SuperIaTask;
}

export async function addTaskNote(root: string, id: string, note: string): Promise<SuperIaTask> {
  if (!note.trim()) throw new Error("La note ne peut pas être vide.");
  const task = await getTask(root, id);
  task.notes.push(`${new Date().toISOString()} — ${note.trim()}`);
  task.updatedAt = new Date().toISOString();
  await saveTask(task);
  return task;
}

export function taskCompletion(tasks: SuperIaTask[]): { total: number; done: number; active: number; blocked: number; percent: number } {
  const done = tasks.filter((task) => task.status === "done").length;
  const blocked = tasks.filter((task) => task.status === "blocked").length;
  const active = tasks.filter((task) => !["done", "cancelled"].includes(task.status)).length;
  return {
    total: tasks.length,
    done,
    active,
    blocked,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}
