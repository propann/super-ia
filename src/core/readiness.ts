import { access } from "node:fs/promises";
import { join } from "node:path";
import { evaluateEndpointPolicy } from "../connections/network-policy.js";
import { inspectSecretBackends, type SecretBackendCheck } from "../connections/secret-backends.js";
import { inspectConnections } from "../connections/store.js";
import type { ConnectionCheck } from "../connections/types.js";
import { loadSandboxCheckReport, type SandboxCheckReport } from "../security/sandbox-check.js";
import { localToolCatalog } from "../tools/catalog.js";
import { loadProjectConfig } from "./config.js";
import { inspectLocalTools, inspectProviders } from "./doctor.js";
import { scanRepository } from "./repository-scanner.js";
import { getTaskGraph } from "./task-store.js";
import { analyzeTaskGraph, type TaskGraphAnalysis } from "./task-graph.js";
import type { LocalToolCheck, ProviderCheck, RepositoryScan, SuperIaConfig } from "./types.js";

export type ReadinessLevel = "pass" | "warn" | "fail";

export interface ReadinessCheck {
  id: string;
  label: string;
  level: ReadinessLevel;
  summary: string;
  details: string[];
}

export interface ReadinessReport {
  schemaVersion: 1;
  generatedAt: string;
  repositoryRoot: string;
  overall: ReadinessLevel;
  readyForLocalControl: boolean;
  readyForRealAgents: boolean;
  checks: ReadinessCheck[];
  counts: Record<ReadinessLevel, number>;
  networkChecked: false;
  secretsRead: false;
}

export interface ReadinessInputs {
  repository: RepositoryScan;
  providers: ProviderCheck[];
  tools: LocalToolCheck[];
  connections: ConnectionCheck[];
  secretBackends: SecretBackendCheck[];
  config: SuperIaConfig;
  graph: TaskGraphAnalysis;
  sandboxReport?: SandboxCheckReport;
  platform: string;
  generatedAt?: string;
}

function check(id: string, label: string, level: ReadinessLevel, summary: string, details: string[] = []): ReadinessCheck {
  return { id, label, level, summary, details };
}

async function taskGraphFor(root: string): Promise<TaskGraphAnalysis> {
  try {
    await access(join(root, ".superia", "tasks"));
    return await getTaskGraph(root);
  } catch {
    return analyzeTaskGraph([]);
  }
}

function sandboxEvidence(inputs: ReadinessInputs): { check: ReadinessCheck; verified: boolean } {
  if (inputs.platform !== "linux") {
    return {
      check: check("security.sandbox-evidence", "Preuve Bubblewrap", "warn", `Plateforme ${inputs.platform} : validation Bubblewrap non applicable.`),
      verified: true,
    };
  }
  const bwrap = inputs.tools.find((tool) => tool.id === "bubblewrap");
  if (!bwrap?.installed) {
    return {
      check: check("security.sandbox-evidence", "Preuve Bubblewrap", "fail", "Bubblewrap est absent sous Linux."),
      verified: false,
    };
  }
  const report = inputs.sandboxReport;
  if (!report) {
    return {
      check: check("security.sandbox-evidence", "Preuve Bubblewrap", "fail", "Aucun rapport sandbox-status.json n'a été produit sur cette machine."),
      verified: false,
    };
  }
  if (report.platform && report.platform !== inputs.platform) {
    return {
      check: check("security.sandbox-evidence", "Preuve Bubblewrap", "fail", `Le rapport appartient à la plateforme ${report.platform}, pas ${inputs.platform}.`),
      verified: false,
    };
  }
  if (!report.passed) {
    return {
      check: check("security.sandbox-evidence", "Preuve Bubblewrap", "fail", report.reason ?? "L'autotest Bubblewrap a échoué.", report.checks.filter((item) => !item.passed).map((item) => `${item.id}: ${item.detail}`)),
      verified: false,
    };
  }
  const checkedAt = report.checkedAt ? Date.parse(report.checkedAt) : Number.NaN;
  const generatedAt = Date.parse(inputs.generatedAt ?? new Date().toISOString());
  const ageDays = Number.isFinite(checkedAt) ? Math.floor((generatedAt - checkedAt) / 86_400_000) : Number.POSITIVE_INFINITY;
  if (ageDays > 30) {
    return {
      check: check("security.sandbox-evidence", "Preuve Bubblewrap", "warn", `Autotest réussi mais ancien de ${ageDays} jour(s) ; le relancer avant un run sensible.`),
      verified: false,
    };
  }
  return {
    check: check("security.sandbox-evidence", "Preuve Bubblewrap", "pass", `Autotest réussi${report.checkedAt ? ` le ${report.checkedAt}` : ""}.`),
    verified: true,
  };
}

export function assembleReadinessReport(inputs: ReadinessInputs): ReadinessReport {
  const generatedAt = inputs.generatedAt ?? new Date().toISOString();
  const normalizedInputs = { ...inputs, generatedAt };
  const checks: ReadinessCheck[] = [];

  checks.push(inputs.repository.isGitRepository
    ? check("repository.git", "Dépôt Git", "pass", `Dépôt détecté sur ${inputs.repository.branch ?? "branche inconnue"}.`)
    : check("repository.git", "Dépôt Git", "fail", "Le dossier courant n'est pas un dépôt Git."));
  checks.push(inputs.repository.dirty
    ? check("repository.clean", "État Git", "warn", "Le dépôt contient des modifications locales.")
    : check("repository.clean", "État Git", "pass", "Le dépôt est propre."));

  const requiredIds = new Set(localToolCatalog.filter((tool) => tool.status === "required").map((tool) => tool.id));
  const missingRequired = inputs.tools.filter((tool) => requiredIds.has(tool.id) && !tool.installed);
  checks.push(missingRequired.length
    ? check("tools.required", "Outils obligatoires", "fail", `${missingRequired.length} outil(s) obligatoire(s) absent(s).`, missingRequired.map((tool) => tool.name))
    : check("tools.required", "Outils obligatoires", "pass", "Tous les outils obligatoires sont présents."));

  const gitleaks = inputs.tools.find((tool) => tool.id === "gitleaks");
  checks.push(gitleaks?.installed
    ? check("security.gitleaks", "Gitleaks", "pass", "Gitleaks est disponible.")
    : check("security.gitleaks", "Gitleaks", "fail", "Gitleaks manque : aucun agent distant réel ne doit être lancé."));
  const sandbox = sandboxEvidence(normalizedInputs);
  checks.push(sandbox.check);

  checks.push(inputs.graph.valid
    ? check("tasks.dag", "DAG des missions", "pass", `${inputs.graph.order.length} mission(s), aucun cycle ni dépendance manquante.`)
    : check("tasks.dag", "DAG des missions", "fail", "Le graphe des missions est invalide.", [
        ...inputs.graph.cycles.map((cycle) => `cycle: ${cycle.join(" -> ")}`),
        ...inputs.graph.missingDependencies.map((item) => `${item.taskId} attend ${item.dependencyId}`),
      ]));

  const invalidConnections = inputs.connections.filter((connection) => connection.state === "invalid");
  const enabledConnections = inputs.connections.filter((connection) => connection.enabled);
  const usableConnections = enabledConnections.filter((connection) => connection.ready);
  checks.push(invalidConnections.length
    ? check("connections.valid", "Registre des connexions", "fail", `${invalidConnections.length} connexion(s) invalide(s).`, invalidConnections.map((connection) => `${connection.id}: ${connection.reasons.join(" ; ")}`))
    : check("connections.valid", "Registre des connexions", "pass", `${inputs.connections.length} connexion(s) valides dans le registre.`));
  checks.push(enabledConnections.length === 0
    ? check("connections.enabled", "Connexions activées", "warn", "Aucune connexion n'est activée.")
    : usableConnections.length === 0
      ? check("connections.enabled", "Connexions activées", "warn", `${enabledConnections.length} connexion(s) activée(s), aucune prête sans action supplémentaire.`)
      : check("connections.enabled", "Connexions activées", "pass", `${usableConnections.length}/${enabledConnections.length} connexion(s) activée(s) prête(s) ou manuelle(s).`));

  const endpointDecisions = inputs.connections.filter((connection) => Boolean(connection.baseUrl)).map((connection) => ({ connection, decision: evaluateEndpointPolicy(connection) }));
  const unsafeEndpoints = endpointDecisions.filter((item) => !item.decision.allowed);
  checks.push(unsafeEndpoints.length
    ? check("network.policy", "Politique réseau", "fail", `${unsafeEndpoints.length} endpoint(s) refusé(s).`, unsafeEndpoints.map((item) => `${item.connection.id}: ${item.decision.reasons.join(" ; ")}`))
    : check("network.policy", "Politique réseau", "pass", `${endpointDecisions.length} endpoint(s) conforme(s) à la politique statique.`));

  const persistentSecretBackends = inputs.secretBackends.filter((backend) => backend.available && backend.id !== "session-env");
  checks.push(persistentSecretBackends.length
    ? check("secrets.backend", "Coffre de secrets", "pass", `Backend(s) disponible(s) : ${persistentSecretBackends.map((backend) => backend.id).join(", ")}.`)
    : check("secrets.backend", "Coffre de secrets", "warn", "Seules les variables temporaires de session sont disponibles."));

  checks.push(inputs.config.policy.requireHumanApprovalBeforeMerge
    ? check("policy.human-merge", "Approbation humaine", "pass", "La fusion exige une approbation humaine.")
    : check("policy.human-merge", "Approbation humaine", "fail", "La fusion humaine obligatoire est désactivée."));
  checks.push(inputs.config.policy.redactSecretsBeforeRemoteSend
    ? check("policy.redaction", "Expurgation des secrets", "pass", "L'expurgation avant envoi distant est activée.")
    : check("policy.redaction", "Expurgation des secrets", "fail", "L'expurgation avant envoi distant est désactivée."));
  checks.push(inputs.config.policy.allowApi && inputs.config.policy.monthlyApiBudgetEur <= 0
    ? check("policy.api-budget", "Budget API", "fail", "Les APIs sont autorisées sans budget mensuel positif.")
    : inputs.config.policy.allowApi
      ? check("policy.api-budget", "Budget API", "pass", `Budget API mensuel : ${inputs.config.policy.monthlyApiBudgetEur} €.`)
      : check("policy.api-budget", "Budget API", "pass", "Les APIs génériques sont désactivées par défaut."));

  const installedProviders = inputs.providers.filter((provider) => provider.installed === true);
  checks.push(installedProviders.length
    ? check("providers.installed", "Agents installés", "pass", `${installedProviders.length} agent(s) CLI détecté(s).`, installedProviders.map((provider) => provider.name))
    : check("providers.installed", "Agents installés", "warn", "Aucun agent CLI n'est détecté dans le PATH actuel."));

  const counts: Record<ReadinessLevel, number> = {
    pass: checks.filter((item) => item.level === "pass").length,
    warn: checks.filter((item) => item.level === "warn").length,
    fail: checks.filter((item) => item.level === "fail").length,
  };
  const overall: ReadinessLevel = counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "pass";
  const securityFailures = checks.filter((item) => item.level === "fail" && ["security.gitleaks", "network.policy", "policy.human-merge", "policy.redaction", "policy.api-budget"].includes(item.id));

  return {
    schemaVersion: 1,
    generatedAt,
    repositoryRoot: inputs.repository.root,
    overall,
    readyForLocalControl: inputs.repository.isGitRepository && inputs.graph.valid && invalidConnections.length === 0,
    readyForRealAgents: inputs.repository.isGitRepository && inputs.graph.valid && securityFailures.length === 0 && sandbox.verified && installedProviders.length > 0,
    checks,
    counts,
    networkChecked: false,
    secretsRead: false,
  };
}

export async function buildReadinessReport(root: string): Promise<ReadinessReport> {
  const [repository, providers, tools, connections, secretBackends, config, graph, sandboxReport] = await Promise.all([
    scanRepository(root),
    inspectProviders(),
    inspectLocalTools(),
    inspectConnections(),
    inspectSecretBackends(),
    loadProjectConfig(root),
    taskGraphFor(root),
    loadSandboxCheckReport(),
  ]);
  return assembleReadinessReport({
    repository,
    providers,
    tools,
    connections,
    secretBackends,
    config,
    graph,
    sandboxReport,
    platform: process.platform,
  });
}

export function renderReadinessReport(report: ReadinessReport): string {
  const lines = [
    `SUPER IA — READINESS ${report.overall.toUpperCase()}`,
    `Contrôle local : ${report.readyForLocalControl ? "PRÊT" : "NON PRÊT"}  Agents réels : ${report.readyForRealAgents ? "PRÊT" : "NON PRÊT"}`,
    `PASS ${report.counts.pass}  WARN ${report.counts.warn}  FAIL ${report.counts.fail}`,
    "",
  ];
  for (const item of report.checks) {
    lines.push(`${item.level.toUpperCase().padEnd(5)} ${item.label.padEnd(24)} ${item.summary}`);
    for (const detail of item.details) lines.push(`      - ${detail}`);
  }
  lines.push("", "Aucun accès réseau effectué. Aucune valeur de secret lue.");
  return lines.join("\n");
}
