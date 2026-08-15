import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
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
      assert.ok(types.includes("safety.emergency_stop_engaged"));
      assert.ok(types.includes("safety.emergency_stop_released"));
      const safetyEvents = control.listEvents(20).filter((event) => event.aggregateId === "emergency-stop");
      assert.equal(JSON.stringify(safetyEvents).includes("maintenance"), true);
    } finally {
      control.close();
    }
  });
});
