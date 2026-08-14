import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SuperIaConfig } from "./types.js";

export const defaultConfig: SuperIaConfig = {
  version: 1,
  policy: {
    defaultMode: "worktree",
    allowApi: false,
    monthlyApiBudgetEur: 0,
    requireHumanApprovalBeforeMerge: true,
    redactSecretsBeforeRemoteSend: true,
  },
  preferredProviders: ["codex-cli", "mistral-vibe", "claude-code", "qwen-code"],
};

export async function initializeProject(directory: string): Promise<{ path: string; created: boolean }> {
  const folder = join(directory, ".superia");
  const path = join(folder, "config.json");
  await mkdir(folder, { recursive: true });
  try {
    await readFile(path, "utf8");
    return { path, created: false };
  } catch {
    await writeFile(path, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
    return { path, created: true };
  }
}

export async function loadProjectConfig(directory: string): Promise<SuperIaConfig> {
  const path = join(directory, ".superia", "config.json");
  try {
    return JSON.parse(await readFile(path, "utf8")) as SuperIaConfig;
  } catch {
    return defaultConfig;
  }
}
