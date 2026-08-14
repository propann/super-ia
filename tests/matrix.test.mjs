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
  localTools: [
    {
      id: "repomix",
      name: "Repomix",
      commandCandidates: ["repomix"],
      category: "context",
      status: "recommended",
      lightweight: true,
      notes: "",
      installed: true,
      detectedCommand: "repomix",
    },
  ],
  tasks: [],
  control: {
    schemaVersion: 1,
    journalMode: "wal",
    projects: 2,
    tasks: 4,
    runs: 3,
    activeRuns: 1,
    events: 12,
    pendingJournalEvents: 0,
  },
  projects: [
    {
      id: "project-1",
      root: "/srv/git/app",
      name: "app-global",
      defaultBranch: "main",
      status: "active",
      createdAt: "2026-08-14T20:00:00Z",
      updatedAt: "2026-08-14T20:00:00Z",
      lastScan: {},
    },
  ],
  runs: [
    {
      id: "run-123456789",
      projectId: "project-1",
      taskId: "TASK-0001",
      provider: "codex-cli",
      status: "running",
      startedAt: "2026-08-14T20:00:00Z",
      updatedAt: "2026-08-14T20:00:00Z",
      heartbeatAt: "2026-08-14T20:00:00Z",
      metadata: {},
    },
  ],
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

test("matrix dashboard exposes local and global control data", () => {
  const output = stripAnsi(renderMatrixDashboard(snapshot, 100));
  assert.match(output, /MATRIX CONTROL/);
  assert.match(output, /app/);
  assert.match(output, /Codex/);
  assert.match(output, /Repomix/);
  assert.match(output, /VERROUILLÉES/);
  assert.match(output, /WAL \/ schéma 1/);
  assert.match(output, /app-global/);
  assert.match(output, /codex-cli/);
  assert.match(output, /TASK-0001/);
});
