import { runGitleaksScan } from "./gitleaks.js";
import { persistSandboxCheckReport, runBubblewrapSelfTest } from "./sandbox-check.js";

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export async function handleSecurityCommand(command: string, args: string[], asJson: boolean, cwd: string): Promise<boolean> {
  if (command !== "security") return false;
  const action = args.find((arg) => !arg.startsWith("--"));

  if (action === "sandbox-check") {
    const report = await runBubblewrapSelfTest();
    const reportPath = await persistSandboxCheckReport(report);
    if (asJson) console.log(JSON.stringify({ ...report, reportPath }, null, 2));
    else {
      console.log(report.passed ? "SANDBOX BUBBLEWRAP VALIDÉE" : "SANDBOX BUBBLEWRAP NON VALIDÉE");
      console.log(`Disponible ${report.available ? "oui" : "non"}`);
      if (report.executable) console.log(`Exécutable ${report.executable}`);
      for (const check of report.checks) {
        console.log(`${check.passed ? "✓" : "✗"} ${check.id} — ${check.detail}`);
      }
      if (report.reason) console.log(`Raison     ${report.reason}`);
      console.log(`Rapport    ${reportPath}`);
    }
    if (!report.passed) process.exitCode = 1;
    return true;
  }

  if (action !== "scan") {
    throw new Error("Usage : superia security scan [--required] [--mode dir|git] | sandbox-check");
  }
  const mode = (flagValue(args, "--mode") ?? "dir") as "dir" | "git";
  if (!(["dir", "git"] as string[]).includes(mode)) throw new Error("--mode doit être dir ou git.");
  const timeoutRaw = flagValue(args, "--timeout-minutes");
  const timeoutMinutes = timeoutRaw ? Number(timeoutRaw) : 5;
  if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0 || timeoutMinutes > 60) {
    throw new Error("--timeout-minutes doit être compris entre 0 et 60.");
  }
  const report = await runGitleaksScan(cwd, {
    required: args.includes("--required"),
    mode,
    timeoutMs: timeoutMinutes * 60_000,
  });
  if (asJson) console.log(JSON.stringify(report, null, 2));
  else if (!report.available) {
    console.log(`SCAN GITLEAKS IGNORÉ — ${report.reason}`);
  } else {
    console.log(report.passed ? "SCAN GITLEAKS RÉUSSI" : "SCAN GITLEAKS ÉCHOUÉ");
    console.log(`Rapport   ${report.reportPath}`);
    console.log(`Résultats ${report.findings.length}`);
    if (report.process) console.log(`Run       ${report.process.runId}`);
  }
  if (!report.passed) process.exitCode = 1;
  return true;
}
