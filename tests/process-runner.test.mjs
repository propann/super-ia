import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openControlPlane } from "../dist/control/control-plane.js";
import { runManagedProcess } from "../dist/runtime/process-runner.js";

function scan(root) {
  return {
    root,
    name: "runtime-demo",
    isGitRepository: true,
    branch: "main",
    dirty: false,
    manifests: [],
    languages: ["JavaScript"],
    instructions: [],
    scripts: {},
    recommendedChecks: [],
  };
}

async function linuxProcessState(pid) {
  try {
    const stat = await readFile(`/proc/${pid}/stat`, "utf8");
    return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[0];
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return undefined;
    throw error;
  }
}

test("managed runner stores output and completes the durable run", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-runtime-"));
  const root = await mkdtemp(join(tmpdir(), "superia-project-"));
  try {
    const control = await openControlPlane(home);
    const project = control.registerProject(scan(root));
    const result = await runManagedProcess({
      projectId: project.id,
      provider: "test-runner",
      command: process.execPath,
      args: ["-e", "console.log('managed-ok')"],
      cwd: root,
      timeoutMs: 5_000,
      heartbeatMs: 1_000,
    }, control);

    assert.equal(result.status, "completed");
    assert.equal(result.exitCode, 0);
    assert.equal(control.getRun(result.runId).status, "completed");
    assert.match(await readFile(result.stdoutPath, "utf8"), /managed-ok/);
    control.close();
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

test("managed runner times out and kills the process group", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-timeout-"));
  const root = await mkdtemp(join(tmpdir(), "superia-project-"));
  try {
    const control = await openControlPlane(home);
    const project = control.registerProject(scan(root));
    const result = await runManagedProcess({
      projectId: project.id,
      provider: "test-runner",
      command: process.execPath,
      args: ["-e", "setInterval(() => {}, 1000)"],
      cwd: root,
      timeoutMs: 1_000,
      terminateGraceMs: 500,
    }, control);

    assert.equal(result.status, "failed");
    assert.equal(result.timedOut, true);
    assert.ok(result.durationMs >= 1_400);
    assert.equal(control.getRun(result.runId).status, "failed");
    control.close();
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

test("timed-out runner waits for SIGKILL and leaves no running descendant", async () => {
  if (process.platform === "win32") return;
  const home = await mkdtemp(join(tmpdir(), "superia-descendant-timeout-"));
  const root = await mkdtemp(join(tmpdir(), "superia-project-"));
  const pidPath = join(root, "descendant.pid");
  try {
    const control = await openControlPlane(home);
    const project = control.registerProject(scan(root));
    const descendantScript = "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)";
    const leaderScript = [
      "const { spawn } = require('node:child_process')",
      "const fs = require('node:fs')",
      `const child = spawn(process.execPath, ['-e', ${JSON.stringify(descendantScript)}], { stdio: 'ignore' })`,
      `fs.writeFileSync(${JSON.stringify(pidPath)}, String(child.pid))`,
      "process.on('SIGTERM', () => process.exit(0))",
      "setInterval(() => {}, 1000)",
    ].join(";");

    const result = await runManagedProcess({
      projectId: project.id,
      provider: "test-runner",
      command: process.execPath,
      args: ["-e", leaderScript],
      cwd: root,
      timeoutMs: 1_000,
      terminateGraceMs: 500,
    }, control);

    const descendantPid = Number((await readFile(pidPath, "utf8")).trim());
    assert.equal(result.timedOut, true);
    const state = await linuxProcessState(descendantPid);
    assert.ok(state === undefined || state === "Z", `descendant still running with state ${state}`);
    control.close();
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});
