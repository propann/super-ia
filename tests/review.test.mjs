import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertIndependentProviders, normalizeIndependentReview } from "../dist/orchestration/review.js";

test("independent review rejects identical providers", () => {
  assert.throws(() => assertIndependentProviders("codex", "codex"), /différent/);
  assert.doesNotThrow(() => assertIndependentProviders("codex", "vibe"));
});

test("review normalization blocks invalid output and persists evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-review-"));
  const raw = join(root, "raw.txt");
  const output = join(root, "REVIEW.json");
  try {
    await writeFile(raw, "Tout semble bon.", "utf8");
    const report = await normalizeIndependentReview({
      taskId: "TASK-0001",
      builderProvider: "codex",
      reviewerProvider: "vibe",
      builderRunId: "RUN-BUILD",
      reviewerRunId: "RUN-REVIEW",
      rawResponsePath: raw,
      outputPath: output,
      now: () => new Date("2026-08-15T00:00:00Z"),
    });
    assert.equal(report.structured, false);
    assert.equal(report.verdict, "blocked");
    assert.equal(report.findings[0].category, "review-format");
    assert.equal(JSON.parse(await readFile(output, "utf8")).verdict, "blocked");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("material findings override an inconsistent approval", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-review-"));
  const raw = join(root, "raw.json");
  const output = join(root, "REVIEW.json");
  try {
    await writeFile(raw, JSON.stringify({
      verdict: "approve",
      findings: [{
        severity: "high",
        category: "security",
        summary: "Contrôle absent",
        evidence: "src/auth.ts ne vérifie pas le jeton",
        recommendation: "Ajouter la validation du jeton",
        file: "src/auth.ts",
        line: 42,
      }],
      residualRisks: [],
    }), "utf8");
    const report = await normalizeIndependentReview({
      taskId: "TASK-0002",
      builderProvider: "vibe",
      reviewerProvider: "codex",
      builderRunId: "RUN-BUILD",
      reviewerRunId: "RUN-REVIEW",
      rawResponsePath: raw,
      outputPath: output,
    });
    assert.equal(report.structured, true);
    assert.equal(report.verdict, "changes-requested");
    assert.equal(report.findings[0].file, "src/auth.ts");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
