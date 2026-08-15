import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createControlBackup,
  listControlBackups,
  restoreControlBackup,
  verifyControlBackup,
} from "../dist/control/backup-manager.js";
import { openControlPlane } from "../dist/control/control-plane.js";
import { runControlRecoveryDrill } from "../dist/control/recovery-drill.js";
import {
  loadNotificationConfig,
  loadNotificationState,
  saveNotificationConfig,
  saveNotificationState,
} from "../dist/notifications/store.js";
import { loadBenchmarkStore, recordBenchmark } from "../dist/providers/benchmark-store.js";
import { engageEmergencyStop, loadEmergencyStop } from "../dist/safety/store.js";

function scan(root) {
  return {
    root,
    name: "backup-demo",
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

async function addBenchmark(home) {
  return recordBenchmark({
    providerId: "codex-cli",
    mode: "plan",
    success: true,
    durationMs: 1_500,
    costEur: 0,
    qualityScore: 88,
  }, home, () => new Date("2026-08-14T21:59:00.000Z"));
}

test("control backup is consistent, private, listed and verifiable", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-backup-"));
  try {
    const control = await openControlPlane(home);
    control.registerProject(scan("/srv/git/backup-demo"));
    control.close();
    await engageEmergencyStop("maintenance", home);
    await saveNotificationConfig({
      schemaVersion: 1,
      enabled: true,
      stdout: false,
      notifyRuns: true,
      notifyBlockedTasks: false,
    }, home);
    await saveNotificationState({ schemaVersion: 1, lastEventId: 42 }, home);
    const benchmark = await addBenchmark(home);

    const backup = await createControlBackup(home, () => new Date("2026-08-14T22:00:00.000Z"));
    const names = backup.manifest.files.map((file) => file.name).sort();
    assert.deepEqual(names, [
      "control.sqlite",
      "emergency-stop.json",
      "events.jsonl",
      "notifications-config.json",
      "notifications-state.json",
      "provider-benchmarks.json",
    ]);
    for (const name of [...names, "MANIFEST.json"]) {
      assert.equal((await stat(join(backup.directory, name))).mode & 0o777, 0o600);
    }
    assert.equal(JSON.parse(await readFile(join(backup.directory, "emergency-stop.json"), "utf8")).engaged, true);
    assert.equal(JSON.parse(await readFile(join(backup.directory, "notifications-state.json"), "utf8")).lastEventId, 42);
    assert.equal(JSON.parse(await readFile(join(backup.directory, "provider-benchmarks.json"), "utf8")).records[0].id, benchmark.id);

    const verification = await verifyControlBackup(backup.directory);
    assert.equal(verification.valid, true);
    assert.deepEqual(await listControlBackups(home), [backup.manifest.id]);

    await writeFile(join(backup.directory, "emergency-stop.json"), "corruption\n", "utf8");
    const corrupted = await verifyControlBackup(backup.directory);
    assert.equal(corrupted.valid, false);
    assert.ok(corrupted.errors.some((error) => error.includes("emergency-stop.json")));
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("verified restore recreates a private control home and refuses collisions", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-restore-"));
  const sourceHome = join(root, "source");
  const targetHome = join(root, "restored");
  try {
    const control = await openControlPlane(sourceHome);
    control.registerProject(scan("/srv/git/restored-demo"));
    control.close();
    await engageEmergencyStop("security", sourceHome);
    await saveNotificationConfig({
      schemaVersion: 1,
      enabled: false,
      stdout: false,
      notifyRuns: true,
      notifyBlockedTasks: true,
    }, sourceHome);
    await saveNotificationState({ schemaVersion: 1, lastEventId: 7 }, sourceHome);
    const benchmark = await addBenchmark(sourceHome);

    const backup = await createControlBackup(sourceHome, () => new Date("2026-08-15T00:00:00.000Z"));
    const restored = await restoreControlBackup(
      backup.directory,
      targetHome,
      () => new Date("2026-08-15T00:01:00.000Z"),
    );

    assert.equal(restored.targetHome, targetHome);
    assert.equal(restored.receipt.backupId, backup.manifest.id);
    assert.equal((await stat(restored.receiptPath)).mode & 0o777, 0o600);
    assert.equal((await stat(join(targetHome, "control.sqlite"))).mode & 0o777, 0o600);
    assert.equal((await stat(join(targetHome, "events", "events.jsonl"))).mode & 0o777, 0o600);
    assert.equal((await stat(join(targetHome, "providers", "benchmarks.json"))).mode & 0o777, 0o600);

    const restoredControl = await openControlPlane(targetHome);
    assert.equal(restoredControl.listProjects().length, 1);
    assert.equal(restoredControl.listProjects()[0].name, "backup-demo");
    restoredControl.close();

    assert.equal((await loadEmergencyStop(targetHome)).engaged, true);
    assert.equal((await loadEmergencyStop(targetHome)).category, "security");
    assert.equal((await loadNotificationConfig(targetHome)).enabled, false);
    assert.equal((await loadNotificationState(0, targetHome)).lastEventId, 7);
    assert.equal((await loadBenchmarkStore(targetHome)).records[0].id, benchmark.id);

    await assert.rejects(
      restoreControlBackup(backup.directory, targetHome),
      /cible existe déjà/,
    );

    await writeFile(join(backup.directory, "events.jsonl"), "not-json\n", "utf8");
    await assert.rejects(
      restoreControlBackup(backup.directory, join(root, "invalid")),
      /Sauvegarde invalide/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("restore rejects a benchmark store whose hash is valid but schema is corrupt", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-restore-bench-"));
  const sourceHome = join(root, "source");
  try {
    const control = await openControlPlane(sourceHome);
    control.registerProject(scan("/srv/git/benchmark-corruption"));
    control.close();
    await addBenchmark(sourceHome);
    const backup = await createControlBackup(sourceHome, () => new Date("2026-08-15T00:03:00.000Z"));

    const manifestPath = join(backup.directory, "MANIFEST.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const corrupt = "{\"schemaVersion\":1,\"records\":[{\"bad\":true}]}\n";
    await writeFile(join(backup.directory, "provider-benchmarks.json"), corrupt, "utf8");
    const crypto = await import("node:crypto");
    const entry = manifest.files.find((file) => file.name === "provider-benchmarks.json");
    entry.bytes = Buffer.byteLength(corrupt);
    entry.sha256 = crypto.createHash("sha256").update(corrupt).digest("hex");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    await assert.rejects(
      restoreControlBackup(backup.directory, join(root, "invalid-benchmark")),
      /benchmark 1 invalide/,
    );
    await assert.rejects(stat(join(root, "invalid-benchmark")), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("offline recovery drill compares durable data and removes its temporary copy", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-drill-"));
  try {
    const control = await openControlPlane(home);
    const project = control.registerProject(scan("/srv/git/drill-demo"));
    control.createRun({ projectId: project.id, provider: "codex-cli", taskId: "TASK-0001" });
    control.close();
    await addBenchmark(home);

    const result = await runControlRecoveryDrill(
      home,
      false,
      () => new Date("2026-08-15T00:02:00.000Z"),
    );
    assert.equal(result.report.passed, true);
    assert.deepEqual(result.report.source, result.report.restored);
    assert.equal(result.report.source.projects, 1);
    assert.equal(result.report.source.runs, 1);
    assert.equal(result.report.kept, false);
    assert.equal((await stat(result.reportPath)).mode & 0o777, 0o600);
    await assert.rejects(stat(result.report.restoredHome), /ENOENT/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
