import { access } from "node:fs/promises";
import { join } from "node:path";
import { inspectConnections } from "../connections/store.js";
import { evaluateEndpointPolicy } from "../connections/network-policy.js";
import { inspectSecretBackends } from "../connections/secret-backends.js";
import { localToolCatalog } from "../tools/catalog.js";
import { loadProjectConfig } from "./config.js";
import { inspectLocalTools, inspectProviders } from "./doctor.js";
import { scanRepository } from "./repository-scanner.js";
import { getTaskGraph } from "./task-store.js";
import { analyzeTaskGraph } from "./task-graph.js";

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

function check(id: string, label: string, level: ReadinessLevel, summary: string, details: string[] = []): ReadinessCheck {
  return { id, label, level, summary, details };
}

async function taskGraphFor(root: string) {
  try {
    await access(join(root, ".superia", "tasks"));
    return await getTaskGraph(root);
  } catch {
    return analyzeTaskGraph([]);
  }
}

export async function buildReadinessReport(root: string): Promise<ReadinessReport> {
  const [repository, providers, tools, connections, secretBackends, config, graph] = await Promise.all([
    scanRepository(root),
    inspectProviders(),
    inspectLocalTools(),
    inspectConnections(),
    inspectSecretBackends(),
    loadProjectConfig(root),
    taskGraphFor(root),
  ]);

  const checks: ReadinessCheck[] = [];
  checks.push(repository.isGitRepository
    ? check("repository.git", "Dépôt Git", "pass", `Dépôt détecté sur ${repository.branch ?? "branche inconnue"}.`)
    : check("repository.git", "Dépôt Git", "fail", "Le dossier courant n'est pas un dépôt Git."));
  checks.push(repository.dirty
    ? check("repository.clean", "État Git", "warn", "Le dépôt contient des modifications locales.")
    : check("repository.clean", "État Git", "pass", "Le dépôt est propre."));

  const requiredIds = new Set(localToolCatalog.filter((tool) => tool.status === "required").map((tool) => tool.id));
  const missingRequired = tools.filter((tool) => requiredIds.has(tool.id) && !tool.installed);
  checks.push(missingRequired.length
    ? check("tools.required", "Outils obligatoires", "fail", `${missingRequired.length} outil(s) obligatoire(s) absent(s).`, missingRequired.map((tool) => tool.name))
    : check("tools.required", "Outils obligatoires", "pass", "Tous les outils obligatoires sont présents."));

  const gitleaks = tools.find((tool) => tool.id === "gitleaks");
  const bubblewrap = tools.find((tool) => tool.id === "bubblewrap");
  checks.push(gitleaks?.installed
    ? check("security.gitleaks", "Gitleaks", "pass", "Gitleaks est disponible.")
    : check("security.gitleaks", "Gitleaks", "fail", "Gitleaks manque : aucun agent distant réel ne doit être lancé."));
  checks.push(process.platform !== "linux"
    ? check("security.bubblewrap", "Bubblewrap", "warn", "Bubblewrap n'est exigé que sous Linux.")
    : bubblewrap?.installed
      ? check("security.bubblewrap", "Bubblewrap", "pass", "Bubblewrap est installé ; l'autotest noyau reste distinct.")
      : check("security.bubblewrap", "Bubblewrap", "fail", "Bubblewrap est absent sous Linux."));

  checks.push(graph.valid
    ? check("tasks.dag", "DAG des missions", "pass", `${graph.order.length} mission(s), aucun cycle ni dépendance manquante.`)
    : check("tasks.dag", "DAG des missions", "fail", "Le graphe des missions est invalide.", [
        ...graph.cycles.map((cycle) => `cycle: ${cycle.join(" -> ")}`),
        ...graph.missingDependencies.map((item) => `${item.taskId} attend ${item.dependencyId}`),
      ]));

  const invalidConnections = connections.filter((connection) => connection.state === "invalid");
  const enabledConnections = connections.filter((connection) => connection.enabled);
  const usableConnections = enabledConnections.filter((connection) => connection.ready);
  checks.push(invalidConnections.length
    ? check("connections.valid", "Registre des connexions", "fail", `${invalidConnections.length} connexion(s) invalide(s).`, invalidConnections.map((connection) => `${connection.id}: ${connection.reasons.join(" ; ")}`))
    : check("connections.valid", "Registre des connexions", "pass", `${connections.length} connexion(s) valides dans le registre.`));
  checks.push(enabledConnections.length === 0
    ? check("connections.enabled", "Connexions activées", "warn", "Aucune connexion n'est activée.")
    : usableConnections.length === 0
      ? check("connections.enabled", "Connexions activées", "warn", `${enabledConnections.length} connexion(s) activée(s), aucune prête sans action supplémentaire.`)
      : check("connections.enabled", "Connexions activées", "pass", `${usableConnections.length}/${enabledConnections.length} connexion(s) activée(s) prête(s) ou manuelle(s).`));

  const endpointDecisions = connections.filter((connection) => Boolean(connection.baseUrl)).map((connection) => ({ connection, decision: evaluateEndpointPolicy(connection) }));
  const unsafeEndpoints = endpointDecisions.filter((item) => !item.decision.allowed);
  checks.push(unsafeEndpoints.length
    ? check("network.policy", "Politique réseau", "fail", `${unsafeEndpoints.length} endpoint(s) refusé(s).`, unsafeEndpoints.map((item) => `${item.connection.id}: ${item.decision.reasons.join(" ; ")}`))
    : check("network.policy", "Politique réseau", "pass", `${endpointDecisions.length} endpoint(s) conforme(s) à la politique statique.`));

  const persistentSecretBackends = secretBackends.filter((backend) => backend.available && backend.id !== "session-env");
  checks.push(persistentSecretBackends.length
    ? check("secrets.backend", "Coffre de secrets", "pass", `Backend(s) disponible(s) : ${persistentSecretBackends.map((backend) => backend.id).join(", ")}.`)
    : check("secrets.backend", "Coffre de secrets", "warn", "Seules les variables temporaires de session sont disponibles."));

  checks.push(config.policy.requireHumanApprovalBeforeMerge
    ? check("policy.human-merge", "Approbation humaine", "pass", "La fusion exige une approbation humaine.")
    : check("policy.human-merge", "Approbation humaine", "fail", "La fusion humaine obligatoire est désactivée."));
  checks.push(config.policy.redactSecretsBeforeRemoteSend
    ? check("policy.redaction", "Expurgation des secrets", "pass", "L'expurgation avant envoi distant est activée.")
    : check("policy.redaction", "Expurgation des secrets", "fail", "L'expurgation avant envoi distant est désactivée."));
  checks.push(config.policy.allowApi && config.policy.monthlyApiBudgetEur <= 0
    ? check("policy.api-budget", "Budget API", "fail", "Les APIs sont autorisées sans budget mensuel positif.")
    : config.policy.allowApi
      ? check("policy.api-budget", "Budget API", "pass", `Budget API mensuel : ${config.policy.monthlyApiBudgetEur} €.`)
      : check("policy.api-budget", "Budget API", "pass", "Les APIs génériques sont désactivées par défaut."));

  const installedProviders = providers.filter((provider) => provider.installed === true);
  checks.push(installedProviders.length
    ? check("providers.installed", "Agents installés", "pass", `${installedProviders.length} agent(s) CLI détecté(s).`, installedProviders.map((provider) => provider.name))
    : check("providers.installed", "Agents installés", "warn", "Aucun agent CLI n'est détecté dans le PATH actuel."));

  const counts: Record<ReadinessLevel, number> = {
    pass: checks.filter((item) => item.level === "pass").length,
    warn: checks.filter((item) => item.level === "warn").length,
    fail: checks.filter((item) => item.level === "fail").length,
  };
  const overall: ReadinessLevel = counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "pass";
  const securityFailures = checks.filter((item) => item.level === "fail" && ["security.gitleaks", "security.bubblewrap", "network.policy", "policy.human-merge", "policy.redaction", "policy.api-budget"].includes(item.id));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repositoryRoot: repository.root,
    overall,
    readyForLocalControl: repository.isGitRepository && graph.valid && invalidConnections.length === 0,
    readyForRealAgents: repository.isGitRepository && graph.valid && securityFailures.length === 0 && installedProviders.length > 0,
    checks,
    counts,
    networkChecked: false,
    secretsRead: false,
  };
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
