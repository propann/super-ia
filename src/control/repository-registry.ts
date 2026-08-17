import type { RepositoryScan, SuperIaTask } from "../core/types.js";
import type { ControlPlane } from "./control-plane.js";
import type { ProjectRecord } from "./types.js";

export function registerRepositorySnapshot(
  control: ControlPlane,
  scan: RepositoryScan,
  tasks: SuperIaTask[] = [],
): { project: ProjectRecord; tasksSynced: number } {
  const project = control.registerProject(scan);
  const tasksSynced = control.syncTasks(project.id, tasks);
  return { project, tasksSynced };
}
