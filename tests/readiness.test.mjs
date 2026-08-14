import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultConnections } from "../dist/connections/catalog.js";
import { inspectConnection } from "../dist/connections/store.js";
import { defaultConfig } from "../dist/core/config.js";
import { assembleReadinessReport, renderReadinessReport } from "../dist/core/readiness.js";
import { analyzeTaskGraph } from "../dist/core/task-graph.js";
import { providerCatalog } from "../dist/providers/catalog.js";
import { loadSandboxCheckReport, persistSandboxCheckReport } from "../dist/security/sandbox-check.js";
import { localToolCatalog } from "../dist/tools/catalog.js";

const generatedAt = "2026-08-15T00:00:00.000Z";

async function validInputs() {
  const connections = await Promise.all(defaultConnections(generatedAt).map((connection) => inspectConnection(connection, {}, async () => undefined)));
  return {
    repository: {
      root: "/tmp/project",
      name: "project",
      isGitRepository: true,
      branch: "main",
      dirty: false,
      manifests: ["package.json"],
      languages: ["TypeScript"],
      instructions: ["AGENTS.md"],
      scripts: { test: "npm test" },
      recommendedChecks: ["npm test"],
    },
    providers: providerCatalog.map((provider, index) => ({ ...provider, installed: index === 0, executablePath: index === 0 ? "/usr/bin/agent" : undefined })),
    tools: localToolCatalog.map((tool) => ({ ...tool, installed: true, detectedCommand: tool.commandCandidates[0], executablePath: `/usr/bin/${tool.commandCandidates[0]}` })),
    connections,
    secretBackends: [
      { id: "session-env", label: "Session", persistence: "session", recommendedFor: [], notes: "", available: true },
      { id: "age-file", label: "Age", command: "age", persistence: "encrypted-file", recommendedFor: [], notes: "", available: true, executablePath: "/usr/bin/age" },
    ],
    config: structuredClone(defaultConfig),
    graph: analyzeTaskGraph([]),
    sandboxReport: {
      engine: "bubblewrap",
      available: true,
      passed: true,
      checks: [{ id: "launch", passed: true, detail: "ok" }],
      checkedAt: "2026-08-14T00:00:00.000Z",
      platform: "linux",
    },
    platform: "linux",
    generatedAt,
  };
}

test("readiness distinguishes local control from real-agent evidence without network or secret access", async () => {
  const report = assembleReadinessReport(await validInputs());
  assert.equal(report.readyForLocalControl, true);
  assert.equal(report.readyForRealAgents, true);
  assert.equal(report.networkChecked, false);
  assert.equal(report.secretsRead, false);
  assert.equal(report.counts.fail, 0);
  assert.equal(report.overall, "warn");
  assert.match(renderReadinessReport(report), /Aucun accès réseau effectué/);
});

test("readiness fails closed for unsafe budget, invalid endpoint and missing sandbox evidence", async () => {
  const inputs = await validInputs();
  inputs.config.policy.allowApi = true;
  inputs.config.policy.monthlyApiBudgetEur = 0;
  inputs.sandboxReport = undefined;
  inputs.connections.push({
    ...inputs.connections[0],
    id: "unsafe-endpoint",
    label: "Unsafe",
    kind: "openai-compatible",
    enabled: true,
    ready: false,
    state: "invalid",
    baseUrl: "https://127.0.0.1/v1",
    reasons: ["private"],
    requiredEnv: [],
    environmentPresent: [],
    environmentMissing: [],
  });
  const report = assembleReadinessReport(inputs);
  assert.equal(report.overall, "fail");
  assert.equal(report.readyForRealAgents, false);
  assert.ok(report.checks.some((item) => item.id === "policy.api-budget" && item.level === "fail"));
  assert.ok(report.checks.some((item) => item.id === "security.sandbox-evidence" && item.level === "fail"));
  assert.ok(report.checks.some((item) => item.id === "network.policy" && item.level === "fail"));
});

test("stale sandbox evidence never authorizes real agents", async () => {
  const inputs = await validInputs();
  inputs.sandboxReport.checkedAt = "2026-01-01T00:00:00.000Z";
  const report = assembleReadinessReport(inputs);
  assert.equal(report.readyForLocalControl, true);
  assert.equal(report.readyForRealAgents, false);
  assert.ok(report.checks.some((item) => item.id === "security.sandbox-evidence" && item.level === "warn"));
});

test("sandbox self-test evidence is persisted privately and can be reloaded", async () => {
  const previous = process.env.SUPERIA_HOME;
  const root = await mkdtemp(join(tmpdir(), "superia-sandbox-evidence-"));
  process.env.SUPERIA_HOME = root;
  try {
    const path = await persistSandboxCheckReport({
      engine: "bubblewrap",
      available: true,
      passed: true,
      checks: [{ id: "launch", passed: true, detail: "ok" }],
      checkedAt: generatedAt,
      platform: "linux",
    });
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    const loaded = await loadSandboxCheckReport();
    assert.equal(loaded?.passed, true);
    assert.equal(loaded?.platform, "linux");
  } finally {
    process.env.SUPERIA_HOME = previous;
    await rm(root, { recursive: true, force: true });
  }
});
