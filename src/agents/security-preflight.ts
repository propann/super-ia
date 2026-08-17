import { openControlPlane } from "../control/control-plane.js";
import { runGitleaksScan } from "../security/gitleaks.js";
import type { SecurityPreflightResult } from "./types.js";

export async function runAgentSecurityPreflight(input: {
  cwd: string;
  projectId: string;
  taskId: string;
  provider: string;
  dryRun?: boolean;
  allowWithoutGitleaks?: boolean;
}): Promise<SecurityPreflightResult> {
  if (input.dryRun) {
    return {
      status: "not-run-dry-run",
      scanner: "gitleaks",
      findings: 0,
      reason: "Prévisualisation uniquement : aucun fournisseur distant n'est lancé.",
    };
  }

  if (input.allowWithoutGitleaks) {
    const control = await openControlPlane();
    try {
      control.appendEvent("task", `${input.projectId}:${input.taskId}`, "security.preflight.waived", {
        provider: input.provider,
        scanner: "gitleaks",
        reason: "Dérogation locale explicite --allow-without-gitleaks",
      });
    } finally {
      control.close();
    }
    return {
      status: "waived",
      scanner: "gitleaks",
      findings: 0,
      reason: "Dérogation locale explicite --allow-without-gitleaks, enregistrée dans le journal.",
    };
  }

  const report = await runGitleaksScan(input.cwd, { required: true, mode: "dir" });
  if (!report.passed) {
    const detail = report.findings.length
      ? `${report.findings.length} secret(s) potentiel(s) détecté(s)`
      : report.reason ?? "scan Gitleaks en échec";
    throw new Error(`Préflight de sécurité refusé : ${detail}. L'agent ${input.provider} n'a pas été lancé.`);
  }

  return {
    status: "passed",
    scanner: "gitleaks",
    reportPath: report.reportPath,
    runId: report.process?.runId,
    findings: report.findings.length,
  };
}
