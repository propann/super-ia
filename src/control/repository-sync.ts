import { scanRepository } from "../core/repository-scanner.js";
import { listTasks } from "../core/task-store.js";
import { openControlPlane } from "./control-plane.js";
import { registerRepositorySnapshot } from "./repository-registry.js";

export async function syncRepositoryToGlobalControl(directory: string) {
  const scan = await scanRepository(directory);
  const tasks = await listTasks(scan.root);
  const control = await openControlPlane();
  try {
    return registerRepositorySnapshot(control, scan, tasks);
  } finally {
    control.close();
  }
}
