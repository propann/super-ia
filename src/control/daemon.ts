import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listTasks } from "../core/task-store.js";
import { scanRepository } from "../core/repository-scanner.js";
import { openControlPlane } from "./control-plane.js";
import { registerRepositorySnapshot } from "./repository-registry.js";

export interface DaemonTickResult {
  startedAt: string;
  finishedAt: string;
  projectsSeen: number;
  projectsSynced: number;
  projectsFailed: number;
  recoveredRuns: number;
  errors: Array<{ projectId: string; root: string; message: string }>;
}

export async function runDaemonTick(staleAfterMs = 5 * 60_000): Promise<DaemonTickResult> {
  const startedAt = new Date().toISOString();
  const control = await openControlPlane();
  try {
    const recovered = control.reconcileStaleRuns(staleAfterMs);
    const projects = control.listProjects().filter((project) => project.status === "active");
    let projectsSynced = 0;
    const errors: DaemonTickResult["errors"] = [];
    for (const project of projects) {
      try {
        const scan = await scanRepository(project.root);
        const tasks = await listTasks(scan.root);
        registerRepositorySnapshot(control, scan, tasks);
        projectsSynced += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ projectId: project.id, root: project.root, message });
        control.appendEvent("project", project.id, "project.sync_failed", { root: project.root, message });
      }
    }
    const result: DaemonTickResult = {
      startedAt,
      finishedAt: new Date().toISOString(),
      projectsSeen: projects.length,
      projectsSynced,
      projectsFailed: errors.length,
      recoveredRuns: recovered.length,
      errors,
    };
    await writeFile(join(control.paths.root, "daemon-status.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
    control.appendEvent("daemon", "superia", "daemon.tick", {
      projectsSeen: result.projectsSeen,
      projectsSynced: result.projectsSynced,
      projectsFailed: result.projectsFailed,
      recoveredRuns: result.recoveredRuns,
    });
    return result;
  } finally {
    control.close();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runDaemon(intervalMs = 30_000, staleAfterMs = 5 * 60_000): Promise<void> {
  let stopping = false;
  const stop = (): void => {
    stopping = true;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    while (!stopping) {
      try {
        await runDaemonTick(staleAfterMs);
      } catch (error) {
        console.error(`Erreur daemon Super IA : ${error instanceof Error ? error.message : String(error)}`);
      }
      if (!stopping) await delay(Math.max(5_000, intervalMs));
    }
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}
