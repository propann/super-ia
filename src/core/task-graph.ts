import type { SuperIaTask } from "./types.js";

export interface MissingTaskDependency {
  taskId: string;
  dependencyId: string;
}

export interface TaskGraphAnalysis {
  valid: boolean;
  order: string[];
  cycles: string[][];
  missingDependencies: MissingTaskDependency[];
  ready: string[];
  blocked: Array<{ taskId: string; waitingFor: string[] }>;
}

export interface TaskGraphReconciliation {
  tasks: SuperIaTask[];
  changedIds: string[];
  analysis: TaskGraphAnalysis;
}

function cloneTask(task: SuperIaTask): SuperIaTask {
  return {
    ...task,
    tags: [...task.tags],
    dependencies: [...task.dependencies],
    acceptanceCriteria: [...task.acceptanceCriteria],
    allowedPaths: [...task.allowedPaths],
    checks: [...task.checks],
    notes: [...task.notes],
  };
}

function uniqueCycle(cycle: string[]): string {
  const closed = cycle[0] === cycle.at(-1) ? cycle.slice(0, -1) : cycle;
  if (!closed.length) return "";
  const rotations = closed.map((_, index) => [...closed.slice(index), ...closed.slice(0, index)]);
  const normalized = rotations.map((item) => item.join("→")).sort()[0];
  return normalized;
}

export function analyzeTaskGraph(tasks: SuperIaTask[]): TaskGraphAnalysis {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  if (byId.size !== tasks.length) throw new Error("Le graphe contient des identifiants de mission dupliqués.");

  const missingDependencies: MissingTaskDependency[] = [];
  for (const task of tasks) {
    for (const dependencyId of task.dependencies) {
      if (!byId.has(dependencyId)) missingDependencies.push({ taskId: task.id, dependencyId });
    }
  }

  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const seenCycles = new Set<string>();

  const visit = (taskId: string): void => {
    const current = state.get(taskId) ?? 0;
    if (current === 2) return;
    if (current === 1) {
      const start = stack.indexOf(taskId);
      const cycle = [...stack.slice(Math.max(0, start)), taskId];
      const key = uniqueCycle(cycle);
      if (key && !seenCycles.has(key)) {
        seenCycles.add(key);
        cycles.push(cycle);
      }
      return;
    }
    state.set(taskId, 1);
    stack.push(taskId);
    for (const dependencyId of byId.get(taskId)?.dependencies ?? []) {
      if (byId.has(dependencyId)) visit(dependencyId);
    }
    stack.pop();
    state.set(taskId, 2);
  };

  for (const task of tasks) visit(task.id);

  const indegree = new Map(tasks.map((task) => [task.id, 0]));
  const dependents = new Map(tasks.map((task) => [task.id, [] as string[]]));
  for (const task of tasks) {
    for (const dependencyId of task.dependencies) {
      if (!byId.has(dependencyId)) continue;
      indegree.set(task.id, (indegree.get(task.id) ?? 0) + 1);
      dependents.get(dependencyId)?.push(task.id);
    }
  }
  const queue = [...indegree.entries()].filter(([, value]) => value === 0).map(([id]) => id).sort();
  const order: string[] = [];
  while (queue.length) {
    const taskId = queue.shift() as string;
    order.push(taskId);
    for (const dependentId of dependents.get(taskId) ?? []) {
      const next = (indegree.get(dependentId) ?? 0) - 1;
      indegree.set(dependentId, next);
      if (next === 0) {
        queue.push(dependentId);
        queue.sort();
      }
    }
  }

  const blocked: Array<{ taskId: string; waitingFor: string[] }> = [];
  const ready: string[] = [];
  for (const task of tasks) {
    if (["done", "cancelled"].includes(task.status)) continue;
    const waitingFor = task.dependencies.filter((dependencyId) => byId.get(dependencyId)?.status !== "done");
    if (waitingFor.length) blocked.push({ taskId: task.id, waitingFor });
    else ready.push(task.id);
  }

  return {
    valid: missingDependencies.length === 0 && cycles.length === 0,
    order,
    cycles,
    missingDependencies,
    ready: ready.sort(),
    blocked: blocked.sort((a, b) => a.taskId.localeCompare(b.taskId)),
  };
}

export function assertValidTaskGraph(tasks: SuperIaTask[]): TaskGraphAnalysis {
  const analysis = analyzeTaskGraph(tasks);
  if (analysis.missingDependencies.length) {
    const first = analysis.missingDependencies[0];
    throw new Error(`Dépendance introuvable : ${first.dependencyId} (mission ${first.taskId}).`);
  }
  if (analysis.cycles.length) throw new Error(`Cycle de missions refusé : ${analysis.cycles[0].join(" -> ")}.`);
  return analysis;
}

export function reconcileDependencyStatuses(tasks: SuperIaTask[]): TaskGraphReconciliation {
  const next = tasks.map(cloneTask);
  const analysis = assertValidTaskGraph(next);
  const byId = new Map(next.map((task) => [task.id, task]));
  const changedIds: string[] = [];

  for (const task of next) {
    const waitingFor = task.dependencies.filter((dependencyId) => byId.get(dependencyId)?.status !== "done");
    const before = `${task.status}:${Boolean(task.blockedByDependencies)}`;

    if (waitingFor.length > 0) {
      if (["planned", "ready"].includes(task.status) || (task.status === "blocked" && task.blockedByDependencies)) {
        task.status = "blocked";
        task.blockedByDependencies = true;
      }
    } else if (task.status === "blocked" && task.blockedByDependencies) {
      task.status = "ready";
      task.blockedByDependencies = false;
    }

    const after = `${task.status}:${Boolean(task.blockedByDependencies)}`;
    if (before !== after) changedIds.push(task.id);
  }

  return { tasks: next, changedIds, analysis };
}
