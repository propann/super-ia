import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { ControlPaths } from "./types.js";

export function resolveSuperIaHome(env: Record<string, string | undefined> = process.env): string {
  const configured = env.SUPERIA_HOME?.trim();
  return configured ? resolve(configured) : join(homedir(), ".superia");
}

export async function ensureControlHome(root = resolveSuperIaHome()): Promise<ControlPaths> {
  const resolved = resolve(root);
  const paths: ControlPaths = {
    root: resolved,
    database: join(resolved, "control.sqlite"),
    events: join(resolved, "events"),
    eventJournal: join(resolved, "events", "events.jsonl"),
    runs: join(resolved, "runs"),
    backups: join(resolved, "backups"),
  };
  await Promise.all([
    mkdir(paths.root, { recursive: true }),
    mkdir(paths.events, { recursive: true }),
    mkdir(paths.runs, { recursive: true }),
    mkdir(paths.backups, { recursive: true }),
  ]);
  return paths;
}
