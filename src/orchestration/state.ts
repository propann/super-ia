import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PipelineCheckpoint } from "./types.js";

export function pipelineStatePath(repositoryRoot: string, taskId: string): string {
  return join(repositoryRoot, ".superia", "pipelines", `${taskId}.json`);
}

export async function loadPipelineCheckpoint(
  repositoryRoot: string,
  taskId: string,
): Promise<PipelineCheckpoint | undefined> {
  try {
    const parsed = JSON.parse(await readFile(pipelineStatePath(repositoryRoot, taskId), "utf8")) as PipelineCheckpoint;
    if (parsed.schemaVersion !== 1 || parsed.taskId !== taskId) {
      throw new Error(`Checkpoint de pipeline invalide pour ${taskId}.`);
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function savePipelineCheckpoint(checkpoint: PipelineCheckpoint): Promise<string> {
  const path = pipelineStatePath(checkpoint.repositoryRoot, checkpoint.taskId);
  await mkdir(join(checkpoint.repositoryRoot, ".superia", "pipelines"), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
  await rename(temporary, path);
  return path;
}
