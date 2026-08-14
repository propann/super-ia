import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureControlHome } from "../control/home.js";
import { findExecutable, runCommand } from "../utils/command.js";
import { prepareSandboxInvocation } from "./sandbox.js";

export interface SandboxCheck {
  id: string;
  passed: boolean;
  detail: string;
}

export interface SandboxCheckReport {
  engine: "bubblewrap";
  available: boolean;
  passed: boolean;
  executable?: string;
  checks: SandboxCheck[];
  reason?: string;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export async function runBubblewrapSelfTest(): Promise<SandboxCheckReport> {
  const executable = process.platform === "linux" ? await findExecutable("bwrap") : undefined;
  if (!executable) {
    return {
      engine: "bubblewrap",
      available: false,
      passed: false,
      checks: [],
      reason: process.platform === "linux"
        ? "Bubblewrap est absent du PATH."
        : `Bubblewrap exige Linux, plateforme détectée : ${process.platform}.`,
    };
  }

  const control = await ensureControlHome();
  const root = join(control.root, "sandbox-checks", randomUUID());
  const workspace = join(root, "workspace");
  const state = join(root, "state");
  const outside = join(root, "outside-secret.txt");
  const allowed = join(workspace, "allowed.txt");
  const stateProof = join(state, "state.txt");
  await Promise.all([
    mkdir(workspace, { recursive: true }),
    mkdir(state, { recursive: true }),
    writeFile(outside, "must-not-be-visible\n", "utf8"),
  ]);

  const checks: SandboxCheck[] = [];
  try {
    const rwScript = [
      `test "$HOME" = /home/superia`,
      `test ! -e ${shellQuote(outside)}`,
      `printf sandbox-ok > ${shellQuote(allowed)}`,
      `printf state-ok > ${shellQuote(stateProof)}`,
    ].join(" && ");
    const rw = await prepareSandboxInvocation({
      projectId: "sandbox-self-test",
      provider: "sandbox-self-test",
      command: "/bin/sh",
      args: ["-c", rwScript],
      cwd: workspace,
      sandbox: {
        engine: "bubblewrap",
        executable,
        network: "isolated",
        workspaceAccess: "read-write",
        statePaths: [state],
      },
    }, { PATH: process.env.PATH ?? "/usr/bin:/bin", SUPERIA_RUN: "1" }, control.root);

    try {
      await runCommand(rw.command, rw.args, { cwd: workspace, timeoutMs: 15_000 });
      checks.push({ id: "launch", passed: true, detail: "Bubblewrap démarre avec les namespaces demandés." });
      checks.push({
        id: "network-namespace",
        passed: rw.args.includes("--unshare-net"),
        detail: "Le test utilise un namespace réseau isolé.",
      });
      checks.push({
        id: "workspace-write",
        passed: await exists(allowed) && (await readFile(allowed, "utf8")).trim() === "sandbox-ok",
        detail: "Le workspace en lecture-écriture accepte uniquement le test prévu.",
      });
      checks.push({
        id: "state-write",
        passed: await exists(stateProof) && (await readFile(stateProof, "utf8")).trim() === "state-ok",
        detail: "Le répertoire d'état explicitement autorisé est inscriptible.",
      });
      checks.push({
        id: "outside-hidden",
        passed: await exists(outside),
        detail: "Le processus a confirmé que le fichier extérieur n'était pas visible, tandis qu'il existe toujours sur l'hôte.",
      });
      checks.push({
        id: "ephemeral-home",
        passed: rw.env.HOME === "/home/superia",
        detail: "HOME est remplacé par un espace jetable.",
      });
    } finally {
      await rw.cleanup();
    }

    const roScript = [
      `test "$HOME" = /home/superia`,
      `if touch ${shellQuote(join(workspace, "forbidden.txt"))} 2>/dev/null; then exit 93; fi`,
    ].join(" && ");
    const ro = await prepareSandboxInvocation({
      projectId: "sandbox-self-test",
      provider: "sandbox-self-test",
      command: "/bin/sh",
      args: ["-c", roScript],
      cwd: workspace,
      sandbox: {
        engine: "bubblewrap",
        executable,
        network: "isolated",
        workspaceAccess: "read-only",
      },
    }, { PATH: process.env.PATH ?? "/usr/bin:/bin", SUPERIA_RUN: "1" }, control.root);
    try {
      await runCommand(ro.command, ro.args, { cwd: workspace, timeoutMs: 15_000 });
      checks.push({
        id: "workspace-read-only",
        passed: !await exists(join(workspace, "forbidden.txt")),
        detail: "Une écriture dans un workspace en lecture seule est refusée.",
      });
    } finally {
      await ro.cleanup();
    }

    const passed = checks.length >= 7 && checks.every((check) => check.passed);
    return {
      engine: "bubblewrap",
      available: true,
      passed,
      executable,
      checks,
      reason: passed ? undefined : "Au moins un contrôle Bubblewrap a échoué.",
    };
  } catch (error) {
    return {
      engine: "bubblewrap",
      available: true,
      passed: false,
      executable,
      checks,
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
