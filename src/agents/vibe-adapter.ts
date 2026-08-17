import { readFile } from "node:fs/promises";
import type { SuperIaTask } from "../core/types.js";
import type { ContextBuildResult } from "../context/types.js";
import type { AgentInvocation, AgentMode } from "./types.js";

export interface VibeBudget {
  maxTurns: number;
  maxTokens: number;
  maxPriceUsd: number;
}

function reviewSchemaInstructions(): string[] {
  return [
    "Réponds UNIQUEMENT avec un objet JSON valide, sans bloc Markdown ni commentaire.",
    "Schéma obligatoire :",
    '{"verdict":"approve|changes-requested|blocked","findings":[{"severity":"critical|high|medium|low","category":"string","summary":"string","evidence":"string","recommendation":"string","file":"string optionnel","line":1}],"residualRisks":["string"]}',
    "Chaque finding doit contenir une preuve précise. N'invente ni fichier ni ligne.",
    "Utilise approve seulement si aucun finding critical, high ou medium ne subsiste.",
  ];
}

function modeInstructions(mode: AgentMode): string {
  if (mode === "build") {
    return [
      "MODE SUPER IA : BUILD SANS SHELL",
      "Modifie uniquement les fichiers du worktree courant.",
      "N'exécute aucune commande système : Super IA lancera les validations séparément.",
      "Ne fusionne aucune branche et signale les tests recommandés.",
    ].join("\n");
  }
  if (mode === "review") {
    return [
      "MODE SUPER IA : REVIEW INDÉPENDANTE",
      "Travaille strictement en lecture seule.",
      "Analyse le diff Git courant, les régressions, les risques de sécurité, les tests manquants et le respect de la mission.",
      "N'approuve jamais sur la seule déclaration du builder.",
      ...reviewSchemaInstructions(),
    ].join("\n");
  }
  return [
    "MODE SUPER IA : PLAN",
    "Travaille strictement en lecture seule.",
    "Produis un plan ordonné, les fichiers concernés, les risques et les validations.",
  ].join("\n");
}

function toolArguments(mode: AgentMode): string[] {
  const allowed = mode === "build"
    ? ["read", "grep", "write_file", "edit"]
    : ["read", "grep"];
  return allowed.flatMap((tool) => ["--enabled-tools", tool]);
}

export async function buildVibeInvocation(input: {
  command: string;
  task: SuperIaTask;
  context: ContextBuildResult;
  cwd: string;
  mode: AgentMode;
  model?: string;
  budget: VibeBudget;
  feedbackPath?: string;
}): Promise<AgentInvocation> {
  const [mission, contextText, feedback] = await Promise.all([
    readFile(input.context.missionPath, "utf8"),
    readFile(input.context.contextPath, "utf8"),
    input.feedbackPath ? readFile(input.feedbackPath, "utf8") : Promise.resolve(""),
  ]);
  const agent = input.mode === "build" ? "accept-edits" : "plan";
  const args = [
    "--prompt",
    "",
    "--trust",
    "--agent",
    agent,
    "--workdir",
    input.cwd,
    "--output",
    "streaming",
    "--max-turns",
    String(input.budget.maxTurns),
    "--max-tokens",
    String(input.budget.maxTokens),
    "--max-price",
    String(input.budget.maxPriceUsd),
    ...toolArguments(input.mode),
    "--disabled-tools",
    "bash*",
  ];

  const feedbackSection = feedback
    ? [
      "",
      "REVIEW INDÉPENDANTE À CORRIGER",
      "Traite chaque finding prouvé. Ne modifie rien hors du périmètre autorisé.",
      feedback,
    ]
    : [];
  const stdin = [
    modeInstructions(input.mode),
    "",
    mission,
    "",
    contextText,
    ...feedbackSection,
    "",
    input.mode === "review"
      ? "Base ton verdict uniquement sur les éléments visibles dans le dépôt et le diff courant."
      : "Retourne un compte rendu factuel et indique les limites du contexte fourni.",
  ].join("\n");

  return {
    provider: "mistral-vibe",
    command: input.command,
    args,
    stdin,
    cwd: input.cwd,
    lastMessagePath: `${input.context.directory}/VIBE_OUTPUT.json`,
    metadata: {
      mode: input.mode,
      model: input.model ?? null,
      feedbackPath: input.feedbackPath ?? null,
      agent,
      contextId: input.context.manifest.id,
      contextHash: input.context.manifest.contextHash,
      baseCommit: input.context.manifest.baseCommit,
      budget: input.budget,
      shellEnabled: false,
      programmaticPromptTransport: "stdin",
    },
  };
}

export function assertSafeVibeInvocation(invocation: AgentInvocation): void {
  const forbidden = new Set(["--auto-approve", "--yolo"]);
  for (const argument of invocation.args) {
    if (forbidden.has(argument)) throw new Error(`Option Vibe interdite : ${argument}`);
  }
  const promptIndex = invocation.args.indexOf("--prompt");
  if (promptIndex < 0 || invocation.args[promptIndex + 1] !== "") {
    throw new Error("Vibe doit être forcé en mode programmatique sans exposer le prompt dans argv.");
  }
  if (!invocation.args.includes("--trust")) {
    throw new Error("La confiance Vibe doit être limitée à cette invocation headless.");
  }
  const agentIndex = invocation.args.indexOf("--agent");
  const agent = agentIndex >= 0 ? invocation.args[agentIndex + 1] : undefined;
  if (!agent || !["plan", "accept-edits"].includes(agent)) {
    throw new Error("Profil Vibe non autorisé.");
  }
  const disabledIndex = invocation.args.indexOf("--disabled-tools");
  if (disabledIndex < 0 || invocation.args[disabledIndex + 1] !== "bash*") {
    throw new Error("Le shell Vibe doit être explicitement désactivé.");
  }
  const priceIndex = invocation.args.indexOf("--max-price");
  const maxPrice = priceIndex >= 0 ? Number(invocation.args[priceIndex + 1]) : Number.NaN;
  if (!Number.isFinite(maxPrice) || maxPrice <= 0 || maxPrice > 5) {
    throw new Error("Budget Vibe absent ou excessif.");
  }
}
