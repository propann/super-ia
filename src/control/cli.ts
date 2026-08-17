import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { basename, resolve } from "node:path";
import { scanRepository } from "../core/repository-scanner.js";
import { listTasks } from "../core/task-store.js";
import { assertExecutionAllowed } from "../safety/store.js";
import { openControlPlane } from "./control-plane.js";
import { registerRepositorySnapshot } from "./repository-registry.js";

const execFileAsync = promisify(execFile);

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function positional(args: string[]): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value.startsWith("--")) {
      index += 1;
      continue;
    }
    values.push(value);
  }
  return values;
}

function print(value: unknown, asJson: boolean): void {
  if (asJson) console.log(JSON.stringify(value, null, 2));
  else if (typeof value === "string") console.log(value);
  else console.log(JSON.stringify(value, null, 2));
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function registerDirectory(
  control: Awaited<ReturnType<typeof openControlPlane>>,
  directory: string,
) {
  const scan = await scanRepository(directory);
  const tasks = await listTasks(scan.root);
  return registerRepositorySnapshot(control, scan, tasks);
}

function cloneTarget(url: string, directory: string | undefined, cwd: string): string {
  if (!/^(https:\/\/|ssh:\/\/|git@)/.test(url) || /\s/.test(url)) throw new Error("URL Git refusée : utiliser HTTPS ou SSH sans identifiant secret dans l'URL.");
  if (/^https?:\/\/[^/]+:[^/]+@/i.test(url)) throw new Error("Ne jamais mettre un mot de passe dans l'URL Git.");
  const name = basename(url.replace(/[?#].*$/, "")).replace(/\.git$/, "") || "repository";
  return directory ? resolve(cwd, directory) : resolve(cwd, name);
}

async function cloneRepository(
  control: Awaited<ReturnType<typeof openControlPlane>>,
  url: string,
  directory: string | undefined,
  cwd: string,
) {
  const target = cloneTarget(url, directory, cwd);
  try { await access(target); throw new Error(`La destination existe déjà : ${target}`); } catch (error) {
    if (error instanceof Error && !/ENOENT/.test(error.message)) throw error;
  }
  await execFileAsync("git", ["clone", "--", url, target], { timeout: 10 * 60_000, maxBuffer: 4 * 1024 * 1024 });
  return registerDirectory(control, target);
}

export async function handleControlCommand(
  command: string,
  args: string[],
  asJson: boolean,
  cwd: string,
): Promise<boolean> {
  const handled = new Set(["control", "status", "project", "run", "events", "recover"]);
  if (!handled.has(command)) return false;

  const control = await openControlPlane();
  try {
    if (command === "control" || command === "status") {
      const action = command === "status" ? "status" : (positional(args)[0] ?? "status");
      if (action === "init" || action === "status") {
        print({
          home: control.paths.root,
          database: control.paths.database,
          eventJournal: control.paths.eventJournal,
          ...control.status(),
        }, asJson);
        return true;
      }
      throw new Error("Usage : superia control init|status");
    }

    if (command === "project") {
      const values = positional(args);
      const action = values[0] ?? "list";
      if (action === "add" || action === "sync") {
        print(await registerDirectory(control, values[1] ?? cwd), asJson);
        return true;
      }
      if (action === "clone") {
        const url = values[1];
        if (!url) throw new Error("Usage : superia project clone <URL-GIT> [--directory|--workspace <dossier>]");
        print(await cloneRepository(control, url, flagValue(args, "--directory") ?? flagValue(args, "--workspace"), cwd), asJson);
        return true;
      }
      if (action === "list") {
        const projects = control.listProjects();
        if (asJson) print(projects, true);
        else if (!projects.length) console.log("Aucun projet enregistré.");
        else for (const project of projects) {
          console.log(`${project.id}  ${project.status.padEnd(8)} ${project.name}  ${project.root}`);
        }
        return true;
      }
      if (action === "show") {
        const id = values[1];
        if (!id) throw new Error("Usage : superia project show <PROJECT-ID>");
        print({
          project: control.getProject(id),
          tasks: control.listProjectTasks(id),
          runs: control.listRuns(id),
        }, asJson);
        return true;
      }
      throw new Error("Usage : superia project add|sync|clone|list|show");
    }

    if (command === "run") {
      const values = positional(args);
      const action = values[0] ?? "list";
      if (action === "start") {
        await assertExecutionAllowed(control.paths.root);
        const provider = values[1];
        if (!provider) {
          throw new Error("Usage : superia run start <provider> [TASK-ID] [--project PROJECT-ID]");
        }
        let projectId = flagValue(args, "--project");
        if (!projectId) projectId = (await registerDirectory(control, cwd)).project.id;
        print(control.createRun({ projectId, taskId: values[2], provider }), asJson);
        return true;
      }
      if (action === "list") {
        const runs = control.listRuns(flagValue(args, "--project"));
        if (asJson) print(runs, true);
        else if (!runs.length) console.log("Aucun run enregistré.");
        else for (const run of runs) {
          console.log(`${run.id}  ${run.status.padEnd(11)} ${run.provider}  ${run.taskId ?? "-"}`);
        }
        return true;
      }
      if (action === "heartbeat") {
        const id = values[1];
        if (!id) throw new Error("Usage : superia run heartbeat <RUN-ID>");
        print(control.heartbeatRun(id), asJson);
        return true;
      }
      if (action === "finish") {
        const id = values[1];
        const status = values[2];
        if (!id || !["completed", "failed", "cancelled"].includes(status ?? "")) {
          throw new Error("Usage : superia run finish <RUN-ID> completed|failed|cancelled");
        }
        print(control.finishRun(id, status as "completed" | "failed" | "cancelled"), asJson);
        return true;
      }
      throw new Error("Usage : superia run start|list|heartbeat|finish");
    }

    if (command === "events") {
      const events = control.listEvents(
        positiveInteger(flagValue(args, "--limit"), 100),
        flagValue(args, "--aggregate"),
      );
      if (asJson) print(events, true);
      else if (!events.length) console.log("Aucun événement.");
      else for (const event of events) {
        console.log(`${event.id.toString().padStart(6)}  ${event.createdAt}  ${event.type}  ${event.aggregateId}`);
      }
      return true;
    }

    if (command === "recover") {
      const minutes = positiveInteger(flagValue(args, "--stale-minutes"), 5);
      const recovered = control.reconcileStaleRuns(minutes * 60_000);
      print({ recovered: recovered.length, runs: recovered }, asJson);
      return true;
    }

    return false;
  } finally {
    control.close();
  }
}
