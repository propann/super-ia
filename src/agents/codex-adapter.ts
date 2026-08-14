import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SuperIaTask } from "../core/types.js";
import type { ContextBuildResult } from "../context/types.js";
import type { AgentInvocation, AgentMode } from "./types.js";

function reviewSchemaInstructions(): string[] {
  return [
    "Réponds UNIQUEMENT avec un objet JSON valide, sans bloc Markdown ni commentaire.",
    "Schéma obligatoire :",
    '{"verdict":"approve|changes-requested|blocked","findings":[{"severity":"critical|high|medium|low","category":"string","summary":"string","evidence":"string","recommendation":"string","file":"string optionnel","line":1}],"residualRisks":["string"]}',
    "Chaque finding doit être étayé par une preuve précise. N'invente ni fichier ni ligne.",
    "Utilise approve seulement si aucun finding critical, high ou medium ne subsiste.",
  ];
}

function modeInstructions(mode: AgentMode): string {
  if (mode === "build") {
    return [
      "MODE SUPER IA : BUILD",
      "Tu peux modifier uniquement le worktree courant.",
      "Ne désactive aucune protection et ne fusionne aucune branche.",
      "Exécute les validations pertinentes et signale exactement celles qui ont été lancées.",
    ].join("\n");
  }
  if (mode === "review") {
    return [
      "MODE SUPER IA : REVIEW INDÉPENDANTE",
      "Travaille en lecture seule.",
      "Analyse le diff Git courant, les régressions, les tests manquants, les problèmes de sécurité et le respect de la mission.",
      "Ne modifie aucun fichier et n'approuve jamais sur la seule déclaration du builder.",
      ...reviewSchemaInstructions(),
    ].join("\n");
  }
  return [
    "MODE SUPER IA : PLAN",
    "Travaille en lecture seule.",
    "Produis un plan ordonné, les fichiers concernés, les risques et les validations à prévoir.",
    "Ne modifie aucun fichier.",
  ].join("\n");
}

export async function buildCodexInvocation(input: {
  command: string;
  task: SuperIaTask;
  context: ContextBuildResult;
  cwd: string;
  mode: AgentMode;
  model?: string;
  feedbackPath?: string;
}): Promise<AgentInvocation> {
  const [mission, contextText, feedback] = await Promise.all([
    readFile(input.context.missionPath, "utf8"),
    readFile(input.context.contextPath, "utf8"),
    input.feedbackPath ? readFile(input.feedbackPath, "utf8") : Promise.resolve(""),
  ]);
  const lastMessagePath = join(input.context.directory, "CODEX_LAST_MESSAGE.md");
  const sandbox = input.mode === "build" ? "workspace-write" : "read-only";
  const args = [
    "exec",
    "--json",
    "--color",
    "never",
    "--ephemeral",
    "--sandbox",
    sandbox,
    "-C",
    input.cwd,
    "--output-last-message",
    lastMessagePath,
  ];
  if (input.model) args.push("--model", input.model);
  args.push("-");

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
      : "Réponds avec un compte rendu factuel. Ne prétends jamais avoir exécuté une commande absente des événements.",
  ].join("\n");

  return {
    provider: "codex-cli",
    command: input.command,
    args,
    stdin,
    cwd: input.cwd,
    lastMessagePath,
    metadata: {
      mode: input.mode,
      model: input.model ?? null,
      feedbackPath: input.feedbackPath ?? null,
      contextId: input.context.manifest.id,
      contextHash: input.context.manifest.contextHash,
      baseCommit: input.context.manifest.baseCommit,
      sandbox,
    },
  };
}

export function assertSafeCodexInvocation(invocation: AgentInvocation): void {
  const forbidden = new Set([
    "--dangerously-bypass-approvals-and-sandbox",
    "--yolo",
    "--dangerously-bypass-hook-trust",
  ]);
  for (const argument of invocation.args) {
    if (forbidden.has(argument)) throw new Error(`Option Codex interdite : ${argument}`);
  }
  const sandboxIndex = invocation.args.indexOf("--sandbox");
  const sandbox = sandboxIndex >= 0 ? invocation.args[sandboxIndex + 1] : undefined;
  if (!sandbox || !["read-only", "workspace-write"].includes(sandbox)) {
    throw new Error("Sandbox Codex absente ou invalide.");
  }
  if (invocation.args.at(-1) !== "-") {
    throw new Error("Le prompt Codex doit être transmis par stdin.");
  }
}
