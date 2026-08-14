import { scanRepository } from "./repository-scanner.js";
import { addTaskNote, createTask, getTask, listTasks, taskCompletion, updateTask } from "./task-store.js";
import type { SuperIaTask, TaskPriority, TaskStatus } from "./types.js";
import { syncRepositoryToGlobalControl } from "../control/repository-sync.js";

const statuses: TaskStatus[] = ["planned", "ready", "running", "blocked", "review", "done", "failed", "cancelled"];
const priorities: TaskPriority[] = ["low", "normal", "high", "critical"];

function flagValues(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1] && !args[index + 1].startsWith("--")) values.push(args[index + 1]);
  }
  return values;
}

function optionalFlagValues(args: string[], name: string): string[] | undefined {
  return args.includes(name) ? flagValues(args, name) : undefined;
}

function flagValue(args: string[], name: string): string | undefined {
  return flagValues(args, name).at(-1);
}

function positionals(args: string[]): string[] {
  const values: string[] = [];
  const valueFlags = new Set(["--status", "--priority", "--provider", "--owner", "--due", "--tag", "--depends", "--accept", "--allow-path"]);
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value.startsWith("--")) {
      if (valueFlags.has(value)) index += 1;
      continue;
    }
    values.push(value);
  }
  return values;
}

function validateDate(value: string | undefined): string | undefined {
  if (value === undefined || value === "") return value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error("--due doit utiliser le format YYYY-MM-DD.");
  }
  return value;
}

function compactTask(task: SuperIaTask): Record<string, unknown> {
  return {
    id: task.id,
    status: task.status,
    priority: task.priority,
    title: task.title,
    provider: task.provider ?? null,
    owner: task.owner ?? null,
    dueDate: task.dueDate ?? null,
    dependencies: task.dependencies,
    tags: task.tags,
    allowedPaths: task.allowedPaths,
    updatedAt: task.updatedAt,
  };
}

function printTask(task: SuperIaTask): void {
  console.log(`${task.id} — ${task.title}`);
  console.log(`Statut      ${task.status}`);
  console.log(`Priorité    ${task.priority}`);
  console.log(`Responsable ${task.owner ?? "-"}`);
  console.log(`Provider    ${task.provider ?? "-"}`);
  console.log(`Échéance    ${task.dueDate ?? "-"}`);
  console.log(`Branche     ${task.branchName}`);
  console.log(`Worktree    ${task.worktreePath ?? "non créé"}`);
  console.log(`Dépendances ${task.dependencies.join(", ") || "-"}`);
  console.log(`Tags        ${task.tags.join(", ") || "-"}`);
  console.log(`Chemins     ${task.allowedPaths.join(", ") || "aucune écriture autorisée"}`);
  console.log(`Critères    ${task.acceptanceCriteria.join(" ; ") || "-"}`);
  console.log(`Checks      ${task.checks.join(" ; ") || "-"}`);
  console.log(`Notes       ${task.notes.length}`);
}

function printBoard(tasks: SuperIaTask[]): void {
  const progress = taskCompletion(tasks);
  console.log(`SUPER IA — SUIVI DES TÂCHES  ${progress.done}/${progress.total} terminées (${progress.percent} %)  ${progress.blocked} bloquée(s)\n`);
  for (const status of statuses) {
    const group = tasks.filter((task) => task.status === status);
    if (!group.length) continue;
    console.log(`[${status.toUpperCase()}]`);
    for (const task of group) {
      const due = task.dueDate ? ` · ${task.dueDate}` : "";
      const owner = task.owner ? ` · ${task.owner}` : "";
      console.log(`  ${task.id}  ${task.priority.padEnd(8)} ${task.title}${owner}${due}`);
    }
    console.log("");
  }
}

export async function handleTaskCommand(command: string, args: string[], asJson: boolean, cwd: string): Promise<boolean> {
  if (command !== "task") return false;
  const [action, id, ...rest] = positionals(args);
  const scan = await scanRepository(cwd);

  if (action === "create") {
    const goal = [id, ...rest].filter(Boolean).join(" ");
    const task = await createTask(scan, goal);
    await syncRepositoryToGlobalControl(scan.root);
    console.log(asJson ? JSON.stringify(task, null, 2) : `${task.id} créée sur ${task.branchName}`);
    return true;
  }
  if (action === "list") {
    const tasks = await listTasks(scan.root);
    if (asJson) console.log(JSON.stringify(tasks.map(compactTask), null, 2));
    else if (!tasks.length) console.log("Aucune mission.");
    else for (const task of tasks) console.log(`${task.id.padEnd(10)} ${task.status.padEnd(10)} ${task.priority.padEnd(8)} ${task.title}`);
    return true;
  }
  if (action === "show" && id) {
    const task = await getTask(scan.root, id);
    if (asJson) console.log(JSON.stringify(task, null, 2));
    else printTask(task);
    return true;
  }
  if (action === "board") {
    const tasks = await listTasks(scan.root);
    if (asJson) console.log(JSON.stringify({ progress: taskCompletion(tasks), tasks: tasks.map(compactTask) }, null, 2));
    else printBoard(tasks);
    return true;
  }
  if (action === "note" && id) {
    const note = rest.join(" ");
    const task = await addTaskNote(scan.root, id, note);
    await syncRepositoryToGlobalControl(scan.root);
    console.log(asJson ? JSON.stringify(task, null, 2) : `Note ajoutée à ${task.id}.`);
    return true;
  }
  if (action === "update" && id) {
    const statusRaw = flagValue(args, "--status") as TaskStatus | undefined;
    const priorityRaw = flagValue(args, "--priority") as TaskPriority | undefined;
    if (statusRaw && !statuses.includes(statusRaw)) throw new Error(`Statut invalide : ${statusRaw}`);
    if (priorityRaw && !priorities.includes(priorityRaw)) throw new Error(`Priorité invalide : ${priorityRaw}`);
    const task = await updateTask(scan.root, id, {
      status: statusRaw,
      priority: priorityRaw,
      provider: flagValue(args, "--provider"),
      owner: flagValue(args, "--owner"),
      dueDate: validateDate(flagValue(args, "--due")),
      tags: optionalFlagValues(args, "--tag"),
      dependencies: optionalFlagValues(args, "--depends"),
      acceptanceCriteria: optionalFlagValues(args, "--accept"),
      allowedPaths: optionalFlagValues(args, "--allow-path"),
    });
    await syncRepositoryToGlobalControl(scan.root);
    if (asJson) console.log(JSON.stringify(task, null, 2));
    else printTask(task);
    return true;
  }

  throw new Error("Usage : superia task create|list|show|board|update|note");
}
