import test from "node:test";
import assert from "node:assert/strict";
import { renderMatrixDashboard, stripAnsi } from "../dist/ui/matrix.js";

const snapshot = {
  scan: {
    root: "/tmp/app",
    name: "app",
    isGitRepository: true,
    branch: "main",
    remote: "x",
    dirty: false,
    packageManager: "npm",
    manifests: ["package.json"],
    languages: ["JavaScript/TypeScript"],
    instructions: ["README.md"],
    scripts: { test: "x" },
    recommendedChecks: ["npm run test"],
  },
  providers: [
    {
      id: "codex",
      name: "Codex",
      command: "codex",
      transport: "cli",
      cost: "included",
      automation: "full",
      status: "ready",
      official: true,
      homepage: "",
      notes: "",
      capabilities: { readRepository: true, writeFiles: true, runCommands: true, structuredOutput: true, offline: false },
      installed: true,
    },
  ],
  tasks: [],
  config: {
    version: 1,
    policy: {
      defaultMode: "worktree",
      allowApi: false,
      monthlyApiBudgetEur: 0,
      requireHumanApprovalBeforeMerge: true,
      redactSecretsBeforeRemoteSend: true,
    },
    preferredProviders: [],
  },
  now: new Date("2026-08-14T20:00:00Z"),
};

test("matrix dashboard exposes real control data", () => {
  const output = stripAnsi(renderMatrixDashboard(snapshot, 100));
  assert.match(output, /MATRIX CONTROL/);
  assert.match(output, /app/);
  assert.match(output, /Codex/);
  assert.match(output, /VERROUILLÉES/);
});
