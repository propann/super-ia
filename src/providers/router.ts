import type { CostProfile, ProviderCheck } from "../core/types.js";

export type RoutingMode = "plan" | "build" | "review";
export type RoutingBudget = "zero" | "low" | "any";

export interface RoutingRequest {
  mode: RoutingMode;
  budget: RoutingBudget;
  requireCommands: boolean;
  allowApi: boolean;
  preferredProviders: string[];
  readyForRealAgents: boolean;
  readinessBlockers?: string[];
}

export interface ProviderRouteCandidate {
  id: string;
  name: string;
  eligible: boolean;
  score: number;
  cost: CostProfile;
  installed: boolean | null;
  reasons: string[];
  rejectedBy: string[];
}

export interface ProviderRouteDecision {
  schemaVersion: 1;
  mode: RoutingMode;
  budget: RoutingBudget;
  recommendedProviderId?: string;
  launchAllowed: boolean;
  launchBlockedBy: string[];
  candidates: ProviderRouteCandidate[];
}

const COST_ORDER: Record<CostProfile, number> = {
  included: 0,
  "free-tier": 1,
  local: 1,
  "low-cost": 2,
  paid: 3,
  unknown: 4,
};

function allowedCosts(budget: RoutingBudget): Set<CostProfile> {
  if (budget === "zero") return new Set(["included", "free-tier", "local"]);
  if (budget === "low") return new Set(["included", "free-tier", "local", "low-cost"]);
  return new Set(["included", "free-tier", "local", "low-cost", "paid", "unknown"]);
}

function modeRejections(provider: ProviderCheck, mode: RoutingMode): string[] {
  const rejected: string[] = [];
  if (!provider.capabilities.readRepository) rejected.push("lecture du dépôt indisponible");
  if (!provider.capabilities.structuredOutput) rejected.push("sortie structurée indisponible");
  if (mode === "build" && !provider.capabilities.writeFiles) rejected.push("écriture de fichiers indisponible");
  if (provider.automation !== "full") rejected.push("automatisation complète indisponible");
  return rejected;
}

function preferenceScore(id: string, preferred: string[]): number {
  const index = preferred.indexOf(id);
  return index < 0 ? 0 : Math.max(1, 100 - index * 10);
}

function candidate(provider: ProviderCheck, request: RoutingRequest): ProviderRouteCandidate {
  const rejectedBy: string[] = [];
  const reasons: string[] = [];
  const allowed = allowedCosts(request.budget);

  if (provider.status !== "ready") rejectedBy.push(`adaptateur ${provider.status}`);
  if (provider.installed !== true) rejectedBy.push(provider.installed === null ? "fournisseur assisté non exécutable" : "commande absente du PATH");
  if (!allowed.has(provider.cost)) rejectedBy.push(`coût ${provider.cost} hors budget ${request.budget}`);
  if (provider.transport === "api" && !request.allowApi) rejectedBy.push("API désactivée par la politique du projet");
  rejectedBy.push(...modeRejections(provider, request.mode));
  if (request.requireCommands && !provider.capabilities.runCommands) rejectedBy.push("exécution de commandes requise mais indisponible");

  let score = 0;
  if (!rejectedBy.length) {
    score += 500;
    score += preferenceScore(provider.id, request.preferredProviders);
    score += Math.max(0, 50 - COST_ORDER[provider.cost] * 10);
    if (provider.official) score += 20;
    if (provider.capabilities.structuredOutput) score += 20;
    if (provider.capabilities.runCommands) score += request.requireCommands ? 20 : 5;
    reasons.push("adaptateur prêt et commande présente");
    reasons.push(`capacités compatibles avec le mode ${request.mode}`);
    reasons.push(`coût ${provider.cost} autorisé par le budget ${request.budget}`);
    if (provider.official) reasons.push("intégration officielle");
    if (request.preferredProviders.includes(provider.id)) reasons.push("préférence du projet");
  }

  return {
    id: provider.id,
    name: provider.name,
    eligible: rejectedBy.length === 0,
    score,
    cost: provider.cost,
    installed: provider.installed,
    reasons,
    rejectedBy,
  };
}

export function routeProvider(providers: ProviderCheck[], request: RoutingRequest): ProviderRouteDecision {
  const candidates = providers
    .map((provider) => candidate(provider, request))
    .sort((left, right) => {
      if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
      if (left.score !== right.score) return right.score - left.score;
      return left.id.localeCompare(right.id);
    });
  const recommended = candidates.find((item) => item.eligible);
  const launchBlockedBy = request.readyForRealAgents
    ? []
    : request.readinessBlockers?.length
      ? request.readinessBlockers
      : ["readiness agents réels non validé"];
  return {
    schemaVersion: 1,
    mode: request.mode,
    budget: request.budget,
    recommendedProviderId: recommended?.id,
    launchAllowed: Boolean(recommended) && launchBlockedBy.length === 0,
    launchBlockedBy,
    candidates,
  };
}
