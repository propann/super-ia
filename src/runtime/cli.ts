import { runRepositoryValidations } from "./validation.js";

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export async function handleRuntimeCommand(
  command: string,
  args: string[],
  asJson: boolean,
  cwd: string,
): Promise<boolean> {
  if (command !== "validate") return false;
  const timeoutMinutesRaw = flagValue(args, "--timeout-minutes");
  const timeoutMinutes = timeoutMinutesRaw ? Number(timeoutMinutesRaw) : 15;
  if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0 || timeoutMinutes > 120) {
    throw new Error("--timeout-minutes doit être compris entre 0 et 120.");
  }
  const report = await runRepositoryValidations(cwd, { timeoutMs: timeoutMinutes * 60_000 });
  if (asJson) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(report.passed ? "VALIDATION RÉUSSIE" : "VALIDATION ÉCHOUÉE");
    for (const check of report.checks) {
      console.log(`${check.result.status === "completed" ? "✓" : "✗"} ${check.command}`);
      console.log(`  run: ${check.result.runId}`);
      console.log(`  stdout: ${check.result.stdoutPath}`);
      console.log(`  stderr: ${check.result.stderrPath}`);
    }
  }
  if (!report.passed) process.exitCode = 1;
  return true;
}
