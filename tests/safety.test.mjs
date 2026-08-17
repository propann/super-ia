import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeCodexTask } from "../dist/agents/executor.js";
import { executeVibeTask } from "../dist/agents/vibe-executor.js";
import { handleControlCommand } from "../dist/control/cli.js";
import { openControlPlane } from "../dist/control/control-plane.js";
import { handlePipelineCommand } from "../dist/orchestration/cli.js";
import { handleSafetyCommand } from "../dist/safety/cli.js";
import {
  assertExecutionAllowed,
  engageEmergencyStop,
  loadEmergencyStop,
  releaseEmergencyStop,
} from "../dist/safety/store.js";

async function withHome(run) {
  const home = await mkdtemp(join(tmpdir(), "superia-safety-"));
  const previous = process.env.SUPERIA_HOME;
  process.env.SUPERIA_HOME = home;
  try {
    return await run(home);
  } finally {
    if (previous === undefined) delete process.env.SUPERIA_HOME;
    else process.env.SUPERIA_HOME = previous;
    await rm(home, { recursive: true, force: true });
  }
}

async function captureFailure(action) {
  try {
    await action();
    assert.fail("expected failure");
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function scan(root) {
  return {
    root,
    name: "safety-demo",
    isGitRepository: true,
    branch: "main",
    dirty: false,
    manifests: [],
    languages: ["TypeScript"],
    instructions: [],
    scripts: {},
    recommendedChecks: [],
  };
}

function processGroupExists(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

async function waitForExit(pid, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processGroupExists(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !processGroupExists(pid);
}

async function waitForFile(path, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await access(path);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  return false;
}

test("emergency stop state is private, atomic and idempotent", async () => {
  await withHome(async (home) => {
    const initial = await loadEmergencyStop();
    assert.equal(initial.engaged, false);
    assert.equal(initial.generation, 0);
    const path = join(home, "safety", "emergency-stop.json");
    assert.equal((await stat(path)).mode & 0o777, 0o600);

    const engaged = await engageEmergencyStop("security");
    assert.equal(engaged.engaged, true);
    assert.equal(engaged.category, "security");
    assert.equal(engaged.generation, 1);
    await assert.rejects(() => assertExecutionAllowed(), /Arrêt d'urgence engagé/);

    const repeated = await engageEmergencyStop("security");
    assert.equal(repeated.generation, 1);

    const released = await releaseEmergencyStop();
    assert.equal(released.engaged, false);
    assert.equal(released.category, null);
    assert.equal(released.generation, 2);
    await assertExecutionAllowed();

    const repeatedRelease = await releaseEmergencyStop();
    assert.equal(repeatedRelease.generation, 2);
  });
});

test("invalid emergency stop state fails closed and is preserved", async () => {
  await withHome(async (home) => {
    await loadEmergencyStop();
    const path = join(home, "safety", "emergency-stop.json");
    await writeFile(path, "{invalid-json\n", "utf8");
    await assert.rejects(() => assertExecutionAllowed());
    assert.equal(await readFile(path, "utf8"), "{invalid-json\n");
  });
});

test("emergency stop blocks real agents, pipelines and manual runs before project access", async () => {
  await withHome(async () => {
    await engageEmergencyStop("budget");

    await assert.rejects(
      () => executeCodexTask("/definitely/missing", "TASK-STOP", {}),
      /Arrêt d'urgence engagé \(budget\)/,
    );
    await assert.rejects(
      () => executeVibeTask("/definitely/missing", "TASK-STOP", { maxPriceUsd: 0.25 }),
      /Arrêt d'urgence engagé \(budget\)/,
    );
    await assert.rejects(
      () => handlePipelineCommand("pipeline", [
        "run", "TASK-STOP", "--builder", "codex", "--reviewer", "vibe",
        "--max-price", "0.25", "--max-total-price", "0.75",
      ], false, "/definitely/missing"),
      /Arrêt d'urgence engagé \(budget\)/,
    );
    await assert.rejects(
      () => handleControlCommand("run", ["start", "manual-provider"], false, "/definitely/missing"),
      /Arrêt d'urgence engagé \(budget\)/,
    );

    const dryRunFailure = await captureFailure(() => handlePipelineCommand("pipeline", [
      "run", "TASK-STOP", "--builder", "codex", "--reviewer", "vibe", "--dry-run",
    ], false, "/definitely/missing"));
    assert.doesNotMatch(dryRunFailure, /Arrêt d'urgence engagé/);
  });
});

test("safety CLI audits controlled engage and release events", async () => {
  await withHome(async (home) => {
    const originalLog = console.log;
    console.log = () => {};
    try {
      assert.equal(await handleSafetyCommand("safety", ["engage", "--category", "maintenance"], false), true);
      assert.equal(await handleSafetyCommand("safety", ["release"], false), true);
    } finally {
      console.log = originalLog;
    }

    const control = await openControlPlane(home);
    try {
      const types = control.listEvents(20).map((event) => event.type);
      assert.ok(types.includes("safety.active_runs_termination_requested"));
      assert.ok(types.includes("safety.emergency_stop_engaged"));
      assert.ok(types.includes("safety.emergency_stop_released"));
      const safetyEvents = control.listEvents(20).filter((event) => event.aggregateId === "emergency-stop");
      assert.equal(JSON.stringify(safetyEvents).includes("maintenance"), true);
    } finally {
      control.close();
    }
  });
});

test("engaging the emergency stop terminates a recent managed process group", { skip: process.platform === "win32" }, async () => {
  await withHome(async (home) => {
    const projectRoot = await mkdtemp(join(tmpdir(), "superia-safety-project-"));
    const readyPath = join(projectRoot, "child-ready");
    const child = spawn(process.execPath, [
      "-e",
      "const fs=require('node:fs'); const ready=process.argv[1]; process.on('SIGTERM',()=>{}); fs.writeFileSync(ready,'ready'); setInterval(()=>{},1000)",
      readyPath,
    ], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    assert.ok(child.pid);
    try {
      assert.equal(await waitForFile(readyPath), true);
      const control = await openControlPlane(home);
      const project = control.registerProject(scan(projectRoot));
      const run = control.createRun({ projectId: project.id, provider: "test-child", pid: child.pid });
      control.heartbeatRun(run.id, child.pid);
      control.close();

      const originalLog = console.log;
      console.log = () => {};
      try {
        await handleSafetyCommand("safety", ["engage", "--category", "security"], false);
      } finally {
        console.log = originalLog;
      }

      assert.equal(await waitForExit(child.pid), true);
      const checked = await openControlPlane(home);
      try {
        const terminationEvent = checked.listEvents(20).find((event) => event.type === "safety.active_runs_termination_requested");
        assert.ok(terminationEvent);
        assert.deepEqual(terminationEvent.payload.signalledRunIds, [run.id]);
        assert.deepEqual(terminationEvent.payload.escalatedRunIds, [run.id]);
      } finally {
        checked.close();
      }
    } finally {
      try { process.kill(-child.pid, "SIGKILL"); } catch {}
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
