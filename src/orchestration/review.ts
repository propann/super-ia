import { readFile, writeFile } from "node:fs/promises";
import type {
  IndependentReviewReport,
  PipelineProvider,
  ReviewFinding,
  ReviewSeverity,
  ReviewVerdict,
} from "./types.js";

const severities = new Set<ReviewSeverity>(["critical", "high", "medium", "low"]);
const verdicts = new Set<ReviewVerdict>(["approve", "changes-requested", "blocked"]);

function stringsFrom(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) for (const item of value) stringsFrom(item, output);
  else if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) stringsFrom(item, output);
  }
  return output;
}

function jsonCandidates(value: string): string[] {
  const candidates = [value.trim()];
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/gi) ?? [];
  for (const block of fenced) {
    candidates.push(block.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim());
  }
  const first = value.indexOf("{");
  const last = value.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(value.slice(first, last + 1));
  return [...new Set(candidates.filter(Boolean))];
}

function parseObject(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
  return undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finding(value: unknown): ReviewFinding | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  const severity = text(item.severity) as ReviewSeverity;
  const summary = text(item.summary);
  const evidence = text(item.evidence);
  const recommendation = text(item.recommendation);
  if (!severities.has(severity) || !summary || !evidence || !recommendation) return undefined;
  const line = typeof item.line === "number" && Number.isInteger(item.line) && item.line > 0 ? item.line : undefined;
  return {
    severity,
    category: text(item.category) || "general",
    summary,
    evidence,
    recommendation,
    file: text(item.file) || undefined,
    line,
  };
}

function safeVerdict(requested: ReviewVerdict, findings: ReviewFinding[]): ReviewVerdict {
  if (requested === "approve" && findings.some((item) => item.severity !== "low")) {
    return "changes-requested";
  }
  return requested;
}

export async function normalizeIndependentReview(input: {
  taskId: string;
  builderProvider: PipelineProvider;
  reviewerProvider: PipelineProvider;
  builderRunId: string;
  reviewerRunId: string;
  rawResponsePath: string;
  outputPath: string;
  now?: () => Date;
}): Promise<IndependentReviewReport> {
  const raw = await readFile(input.rawResponsePath, "utf8");
  let parsed: Record<string, unknown> | undefined;
  for (const candidate of jsonCandidates(raw)) {
    parsed = parseObject(candidate);
    if (parsed) break;
  }
  if (!parsed) {
    try {
      const outer = JSON.parse(raw) as unknown;
      for (const candidate of stringsFrom(outer)) {
        for (const json of jsonCandidates(candidate)) {
          parsed = parseObject(json);
          if (parsed) break;
        }
        if (parsed) break;
      }
    } catch {
      parsed = undefined;
    }
  }

  const requestedVerdict = text(parsed?.verdict) as ReviewVerdict;
  const parsedFindings = Array.isArray(parsed?.findings)
    ? parsed.findings.map(finding).filter((item): item is ReviewFinding => Boolean(item))
    : [];
  const residualRisks = Array.isArray(parsed?.residualRisks)
    ? parsed.residualRisks.map(text).filter(Boolean)
    : [];
  const structured = Boolean(parsed && verdicts.has(requestedVerdict));
  const findings = structured ? parsedFindings : [{
    severity: "high" as const,
    category: "review-format",
    summary: "Le reviewer n'a pas produit un rapport structuré exploitable.",
    evidence: `Réponse conservée dans ${input.rawResponsePath}`,
    recommendation: "Relancer la review avec le schéma JSON obligatoire.",
  }];
  const report: IndependentReviewReport = {
    schemaVersion: 1,
    taskId: input.taskId,
    builderProvider: input.builderProvider,
    reviewerProvider: input.reviewerProvider,
    builderRunId: input.builderRunId,
    reviewerRunId: input.reviewerRunId,
    verdict: structured ? safeVerdict(requestedVerdict, findings) : "blocked",
    findings,
    residualRisks,
    structured,
    rawResponsePath: input.rawResponsePath,
    createdAt: (input.now ?? (() => new Date()))().toISOString(),
  };
  await writeFile(input.outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

export function assertIndependentProviders(builder: PipelineProvider, reviewer: PipelineProvider): void {
  if (builder === reviewer) {
    throw new Error("Le reviewer doit utiliser un fournisseur différent du builder.");
  }
}
