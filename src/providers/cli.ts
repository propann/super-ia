import { loadProjectConfig } from "../core/config.js";
import { inspectProviders } from "../core/doctor.js";
import { buildReadinessReport } from "../core/readiness.js";
import { routeProvider, type RoutingBudget, type RoutingMode } from "./router.js";

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function routingMode(value: string | undefined): RoutingMode {
  const mode = value ?? "plan";
  if (mode === "plan" || mode === "build" || mode === "review") return mode;
  throw new Error("Mode de routage invalide : plan, build ou review attendu.");
}

function routingBudget(value: string | undefined, monthlyBudget: number): RoutingBudget {
  const budget = value ?? (monthlyBudget > 0 ? "low" : "zero");
  if (budget === "zero" || budget === "low" || budget === "any") return budget;
  throw new Error("Budget de routage invalide : zero, low ou any attendu.");
}

export async function handleProviderRoutingCommand(
  command: string,
  args: string[],
  asJson: boolean,
  repositoryRoot: string,
): Promise<boolean> {
  if (command !== "route" && command !== "router") return false;

  const config = await loadProjectConfig(repositoryRoot);
  const mode = routingMode(valueAfter(args, "--mode"));
  const budget = routingBudget(valueAfter(args, "--budget"), config.policy.monthlyApiBudgetEur);
  const [providers, readiness] = await Promise.all([
    inspectProviders(),
    buildReadinessReport(repositoryRoot),
  ]);
  const decision = routeProvider(providers, {
    mode,
    budget,
    requireCommands: args.includes("--require-commands"),
    allowApi: config.policy.allowApi,
    preferredProviders: config.preferredProviders,
    readyForRealAgents: readiness.readyForRealAgents,
    readinessBlockers: readiness.checks
      .filter((check) => check.level === "fail")
      .map((check) => `${check.label}: ${check.summary}`),
  });

  if (asJson) {
    console.log(JSON.stringify({ decision, readiness: {
      overall: readiness.overall,
      readyForLocalControl: readiness.readyForLocalControl,
      readyForRealAgents: readiness.readyForRealAgents,
      networkChecked: readiness.networkChecked,
      secretsRead: readiness.secretsRead,
    } }, null, 2));
  } else {
    console.log(`Super IA — routeur hors ligne (${decision.mode}, budget ${decision.budget})\n`);
    console.log(`Recommandation : ${decision.recommendedProviderId ?? "aucun fournisseur éligible"}`);
    console.log(`Lancement réel : ${decision.launchAllowed ? "AUTORISÉ" : "BLOQUÉ"}`);
    for (const blocker of decision.launchBlockedBy) console.log(`  - ${blocker}`);
    console.log("\nClassement :");
    for (const item of decision.candidates) {
      const state = item.eligible ? "ÉLIGIBLE" : "EXCLU";
      console.log(`${state.padEnd(8)} ${item.id.padEnd(29)} score=${String(item.score).padStart(3)} coût=${item.cost}`);
      for (const reason of item.eligible ? item.reasons : item.rejectedBy) console.log(`           - ${reason}`);
    }
  }

  if (args.includes("--strict") && !decision.launchAllowed) process.exitCode = 1;
  return true;
}
