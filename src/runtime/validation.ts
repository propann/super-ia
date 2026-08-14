import { scanRepository } from "../core/repository-scanner.js";
import { listTasks } from "../core/task-store.js";
import { openControlPlane } from "../control/control-plane.js";
import { registerRepositorySnapshot } from "../control/repository-registry.js";
import { runManagedProcess } from "./process-runner.js";
import type { ValidationReport } from "./types.js";

function parseCommand(command: string): { executable: string; args: string[] } {
  const tokens = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  const normalized = tokens.map((token) => {
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return token.slice(1, -1);
    }
    return token;
  });
  const [executable, ...args] = normalized;
  if (!executable) throw new Error(`Commande de validation invalide : ${command}`);
  return { executable, args };
}

export async function runRepositoryValidations(
  directory: string,
  options: { timeoutMs?: number } = {},
): Promise<ValidationReport> {
  const scan = await scanRepository(directory);
  if (!scan.recommendedChecks.length) {
    throw new Error("Aucune commande de validation détectée dans ce dépôt.");
  }
  const tasks = await listTasks(scan.root);
  const control = await openControlPlane();
  try {
    const project = registerRepositorySnapshot(control, scan, tasks).project;
    const checks = [];
    for (const command of scan.recommendedChecks) {
      const parsed = parseCommand(command);
      const result = await runManagedProcess({
        projectId: project.id,
        provider: "local-validator",
        command: parsed.executable,
        args: parsed.args,
        cwd: scan.root,
        timeoutMs: options.timeoutMs,
        metadata: { validationCommand: command },
      }, control);
      checks.push({ command, result });
      if (result.status !== "completed") break;
    }
    return {
      projectId: project.id,
      repositoryRoot: scan.root,
      passed: checks.length === scan.recommendedChecks.length && checks.every((check) => check.result.status === "completed"),
      checks,
    };
  } finally {
    control.close();
  }
}
